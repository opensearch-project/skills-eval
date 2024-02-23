/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ApiProvider, GradingConfig } from 'promptfoo';
import { assertions } from 'promptfoo';
import { PROVIDERS } from '../providers/constants';
import { ApiProviderFactory } from '../providers/factory';
import { TestResult, TestRunner, TestSpec } from '../runners/test_runner';

const DEFAULT_THRESHOLD = 0.8;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toMatchSemanticSimilarity(expected: string, threshold?: number): Promise<R>;
      toPassLLMRubric(expected: string, gradingConfig: GradingConfig): Promise<R>;
      toMatchRunnerExpectations<T extends TestSpec, U extends ApiProvider>(
        spec: T,
        executionMs: number,
        runner: TestRunner<T, U>,
      ): Promise<R>;
    }
  }
}

export interface Matcher<T = unknown> {
  calculateScore(
    received: T,
    expected: T,
    context?: Record<string, unknown>,
  ): Promise<{ score: number } & Record<string, unknown>>;
}

export const matchesSimilarity = (
  received: string,
  expected: string,
  options: { threshold?: number; inverse?: boolean; gradingConfig?: GradingConfig } = {},
) => {
  return assertions.matchesSimilarity(
    received,
    expected,
    options.threshold ?? DEFAULT_THRESHOLD,
    options.inverse,
    {
      provider: ApiProviderFactory.create(PROVIDERS.ML_COMMONS),
      ...options.gradingConfig,
    },
  );
};

export const matchesFactuality = (
  question: string,
  received: string,
  expected: string,
  gradingConfig?: GradingConfig,
) => {
  return assertions.matchesFactuality(question, expected, received, {
    provider: ApiProviderFactory.create(PROVIDERS.ML_COMMONS),
    factuality: {
      subset: 0,
      superset: 1,
      agree: 1,
      disagree: 0,
      differButFactual: 0,
    },
    // modified https://github.com/promptfoo/promptfoo/blob/f1220f125c627137ed05cd593f41cc13d467d12c/src/prompts.ts#L270 to use with claude
    rubricPrompt: `\n\nHuman: You are comparing a submitted answer to an expert answer on a given question. Here is the data:
[BEGIN DATA]
************
[Question]: {{input}}
************
[Expert]: {{ideal}}
************
[Submission]: {{completion}}
************
[END DATA]

Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
(A) The submitted answer is a subset of the expert answer and is fully consistent with it.
(B) The submitted answer is a superset of the expert answer and is fully consistent with it.
(C) The submitted answer contains all the same details as the expert answer.
(D) There is a disagreement between the submitted answer and the expert answer.
(E) The answers differ, but these differences don't matter from the perspective of factuality.

Please output one of \`(A)\`, \`(B)\`, \`(C)\`, \`(D)\`, or \`(E)\` with the parenthese.

Assistant:`,
    ...gradingConfig,
  });
};

export const matchesLlmRubric = (
  received: string,
  expected: string,
  gradingConfig: GradingConfig,
) => {
  return assertions.matchesLlmRubric(expected, received, {
    provider: ApiProviderFactory.create(PROVIDERS.ML_COMMONS),
    ...gradingConfig,
  });
};

export function installJestMatchers() {
  expect.extend({
    async toMatchRunnerExpectations<T extends TestSpec, U extends ApiProvider>(
      received: Awaited<ReturnType<U['callApi']>>,
      spec: T,
      executionMs: number,
      runner: TestRunner<T, U>,
    ): Promise<TestResult> {
      let result: TestResult;
      if (received.error) {
        console.error(String(received.error));
        result = {
          pass: false,
          score: 0,
          message: () => String(received.error),
          extras: { api_error: true },
        };
      } else if (!received.output) {
        console.error('result is empty');
        result = {
          pass: false,
          score: 0,
          message: () => 'result is empty',
          extras: { empty_result: true },
        };
      } else {
        result = await runner.evaluate(received, spec).catch((error) => ({
          pass: false,
          message: () =>
            `Evaluation failed to run: ${
              String(error).length < 1000
                ? String(error)
                : String(error).slice(0, 500) + '...truncated...' + String(error).slice(-500)
            }`,
          extras: { evaluation_error: true },
          score: 0,
        }));
      }
      await runner.persistMetadata(spec, received, result, executionMs).catch((error) => {
        console.error(`Failed to persist metadata: ${String(error)}`);
      });
      return result;
    },

    async toMatchSemanticSimilarity(
      received: string,
      expected: string,
      threshold?: number,
    ): Promise<jest.CustomMatcherResult> {
      const result = await matchesSimilarity(received, expected, { threshold });
      const pass = received === expected || result.pass;
      if (pass) {
        return {
          message: () => `expected ${received} not to match semantic similarity with ${expected}`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${received} to match semantic similarity with ${expected}, but it did not. Reason: ${result.reason}`,
          pass: false,
        };
      }
    },

    async toPassLLMRubric(
      received: string,
      expected: string,
      gradingConfig: GradingConfig,
    ): Promise<jest.CustomMatcherResult> {
      const gradingResult = await matchesLlmRubric(expected, received, gradingConfig);
      if (gradingResult.pass) {
        return {
          message: () => `expected ${received} not to pass LLM Rubric with ${expected}`,
          pass: true,
        };
      } else {
        return {
          message: () =>
            `expected ${received} to pass LLM Rubric with ${expected}, but it did not. Reason: ${gradingResult.reason}`,
          pass: false,
        };
      }
    },
  });
}
