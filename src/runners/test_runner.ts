/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable jest/no-export */

import console from 'console';
import fs from 'fs';
import fsPromises from 'node:fs/promises';
import path from 'path';
import { addMsg } from 'jest-html-reporters/helper';
import { ApiProvider } from 'promptfoo';

export interface TestSpec {
  id: string;
  clusterStateId?: string;
  question: string;
}

export interface TestResult extends jest.CustomMatcherResult {
  /**
   * a number between 0 and 1.
   */
  score: number;
  /**
   * any other information that should be persisted.
   */
  extras?: Record<string, unknown> & {
    /**
     * true if API call to run tool/agent failed.
     */
    api_error?: boolean;
    /**
     * true if API call returned an empty result.
     */
    empty_output?: boolean;
    /**
     * true if call for evaluation failed.
     */
    evaluation_error?: boolean;
  };
}

interface TestRunMetadata extends Record<string, unknown> {
  id: string;
  score: number;
  pass: boolean;
  executed_at: number;
  execution_ms: number;
}

export abstract class TestRunner<
  T extends TestSpec = TestSpec,
  U extends ApiProvider = ApiProvider,
> {
  private resultsFilePath?: string;
  private persistedMetadata: TestRunMetadata[] = [];

  constructor(private readonly apiProvider: ApiProvider) {
    this.apiProvider = apiProvider as U;
  }

  /**
   * @param _clusterStateId - clusterStateId of the test spec, will be 'undefined' if unspecified.
   */
  protected async beforeAll(_clusterStateId: string): Promise<void> {}
  /**
   * @param _clusterStateId - clusterStateId of the test spec, will be 'undefined' if unspecified.
   */
  protected async afterAll(_clusterStateId: string): Promise<void> {}

  /**
   * Build prompt and context to call api provider from each test case.
   *
   * @param spec test case
   * @returns prompt and context
   */
  protected buildInput(spec: T):
    | {
        prompt: Parameters<ApiProvider['callApi']>[0];
        context: Parameters<ApiProvider['callApi']>[1];
      }
    | {
        prompt?: Parameters<ApiProvider['callApi']>[0];
        context: NonNullable<Parameters<ApiProvider['callApi']>[1]>;
      } {
    return {
      prompt: spec.question,
      context: undefined,
    };
  }

  /**
   * Compares actual and expected response.
   *
   * @param received the returned response from api provider
   * @param spec test case used
   * @returns comparison result
   */
  public abstract evaluate(
    received: Awaited<ReturnType<U['callApi']>>,
    spec: T,
  ): Promise<TestResult>;

  /**
   * Runs the test case using api provider.
   *
   * @param spec the test case
   * @returns api provider response
   */
  private async runSpec(spec: T): Promise<ReturnType<U['callApi']>> {
    const input = this.buildInput(spec);
    // @ts-expect-error promptfoo requires a prompt string to be passed to
    // callApi, but agent framework only expects a parameters object. `prompt`
    // will be passed as the `question` key in the parameters object and can be
    // undefined.
    const received = (await this.apiProvider.callApi(input.prompt, input.context)) as Awaited<
      ReturnType<U['callApi']>
    >;
    return received;
  }

  /**
   * Sets up jest tests to run an array of test cases.
   *
   * @param specs the test cases
   */
  private runSpecs(specs: T[]) {
    const clusterStateIdToSpec: Record<string, T[]> = {};
    specs.forEach((spec) => {
      if (clusterStateIdToSpec[String(spec.clusterStateId)] === undefined)
        clusterStateIdToSpec[String(spec.clusterStateId)] = [];
      clusterStateIdToSpec[String(spec.clusterStateId)].push(spec);
    });
    // workaround for using beforeAll with it.concurrent: https://github.com/jestjs/jest/issues/7997#issuecomment-796965078
    let beforeAllResolve: (value?: unknown) => void;
    const beforeAllPromise = new Promise((resolve) => {
      beforeAllResolve = resolve;
    });
    describe.each(Object.keys(clusterStateIdToSpec))('Cluster state %s', (clusterStateId) => {
      const jestConsoleInfo = console['info'];
      beforeAll(async () => {
        global.console.info = (...args) => {
          console['info'](...args);
          void addMsg({ message: args.join(' ').trim() });
        };
        this.resetMetadata();
        await this.beforeAll(clusterStateId);
        beforeAllResolve();
      });
      afterAll(() => {
        global.console.info = jestConsoleInfo;
        this.summarize();
        this.resetMetadata();
        return this.afterAll(clusterStateId);
      });
      it.concurrent.each(clusterStateIdToSpec[clusterStateId])('Test-id $id', async (spec) => {
        await beforeAllPromise;
        console.info(`Running test: ${spec.id}`);
        const start = Date.now();
        const received = await this.runSpec(spec);
        const executionMs = Date.now() - start;
        await expect(received).toMatchRunnerExpectations(spec, executionMs, this);
      });
    });
  }

  /**
   * Parses test cases from a file. Assumes each line is a JSON object and parses into {@link T}.
   *
   * @param filePath path that contains test specs
   * @returns an array of test specs
   */
  protected parseTestSpecs(filePath: string): T[] {
    const jsonLines = fs.readFileSync(filePath, 'utf8');
    return jsonLines
      .split('\n')
      .filter((line) => line)
      .map((line) => JSON.parse(line) as T);
  }

  /**
   * Sets up jest to run tests based on an array of test spec files.
   *
   * @param specFiles an array of test spec files
   */
  public run(specFiles: string[]) {
    const specs = specFiles.flatMap((filePath) => this.parseTestSpecs(filePath));
    void this.runSpecs(specs);
  }

  /**
   * Cleanups metadata stored in memory for next spec file.
   */
  private resetMetadata() {
    this.resultsFilePath = undefined;
    this.persistedMetadata.length = 0;
  }

  /**
   * Creates a metadata object that stores the test id and results.
   *
   * @param spec the test case
   * @param received the returned response from api provider
   * @param result comparison result
   * @returns the metadata object
   */
  private buildMetadata(
    spec: T,
    received: Awaited<ReturnType<U['callApi']>>,
    result: TestResult,
    executionMs: number,
  ): TestRunMetadata {
    return {
      id: spec.id,
      score: result.score,
      pass: result.pass,
      output: received.output,
      error: received.error,
      reason: result.message(),
      extras: result.extras,
      executed_at: Date.now(),
      execution_ms: executionMs,
    };
  }

  /**
   * Builds and writes metadata object to memory and to disk.
   */
  public async persistMetadata(...args: Parameters<typeof this.buildMetadata>) {
    const metadata = this.buildMetadata(...args);
    if (!this.resultsFilePath) {
      const resultDirPath = path.join(
        __dirname,
        '..',
        '..',
        'results',
        // runner class name or parent runner class name
        this.constructor.name || (Object.getPrototypeOf(this.constructor) as { name: string }).name,
      );
      await fsPromises.mkdir(resultDirPath, { recursive: true });
      const nextIndex =
        (await fsPromises.readdir(resultDirPath)).filter((file) => /results_\d+.jsonl/.test(file))
          .length + 1 || 0;
      this.resultsFilePath = path.join(resultDirPath, `results_${nextIndex}.jsonl`);
    }
    this.persistedMetadata.push(metadata);
    return fsPromises.appendFile(this.resultsFilePath, JSON.stringify(metadata) + '\n');
  }

  /**
   * Creates a summary based on test result metadata stored in memory.
   */
  protected summarize() {
    const total = this.persistedMetadata.length;
    const average =
      this.persistedMetadata.reduce((sum, metadata) => sum + metadata.score, 0) / total;
    const min = Math.min(...this.persistedMetadata.map((metadata) => metadata.score));
    const max = Math.max(...this.persistedMetadata.map((metadata) => metadata.score));
    const passRate = this.persistedMetadata.filter((metadata) => metadata.pass).length / total;
    const averageExecutionMs =
      this.persistedMetadata.reduce((sum, metadata) => sum + metadata.execution_ms, 0) / total;
    const summary = `Summary: ${total} tests, average score: ${average.toFixed(
      2,
    )}, range: ${min.toFixed(2)} - ${max.toFixed(2)}. Pass rate: ${
      Number(passRate.toFixed(4)) * 100
    }%, average execution time: ${averageExecutionMs.toFixed(2)} ms`;
    console.info(summary);
    return summary;
  }
}
