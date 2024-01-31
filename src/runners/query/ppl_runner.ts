/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from '@opensearch-project/opensearch';
import { ResponseError } from '@opensearch-project/opensearch/lib/errors';
import { ApiProvider } from 'promptfoo';
import { LevenshteinMatcher } from '../../matchers/levenshtein';
import { PythonMatcher } from '../../matchers/python';
import { openSearchClient } from '../../providers/clients/opensearch';
import { OpenSearchProviderResponse } from '../../providers/types';
import { OpenSearchTestIndices } from '../../utils/indices';
import { TestResult, TestRunner, TestSpec } from '../test_runner';

interface PPLSpec extends TestSpec {
  gold_query: string;
  index: string;
}

interface PPLResponse {
  schema: Array<{ name: string; type: string }>;
  datarows: unknown[][];
  total: number;
  size: number;
}

interface SQLResponse extends PPLResponse {
  status: number;
}

class GoldQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoldQueryError';
  }
}

export class PPLRunner extends TestRunner<PPLSpec, ApiProvider> {
  levenshtein = new LevenshteinMatcher();
  query_eval = new PythonMatcher('os_query_eval/eval.py');

  protected async beforeAll(clusterStateId: string): Promise<void> {
    await OpenSearchTestIndices.init();
    await OpenSearchTestIndices.create(clusterStateId, { ignoreExisting: true });
  }

  protected buildInput(spec: PPLSpec): {
    prompt: string;
    context: { vars: Record<string, string | object> } | undefined;
  } {
    return {
      prompt: spec.question,
      context: { vars: { index: spec.index } },
    };
  }

  private getPPLFromResponse(received: OpenSearchProviderResponse): string {
    if (!received.output) throw new Error('Received empty response');
    // https://github.com/opensearch-project/skills/blob/c037b2afeebc746e8bd0fe38c7e8b0f8622030f3/src/main/java/org/opensearch/agent/tools/PPLTool.java#L129
    if (received.output.startsWith('{')) {
      try {
        const parsed = JSON.parse(received.output) as { ppl: string; executionResult: object };
        return parsed.ppl;
      } catch (error) {
        throw new Error(`Cannot find PPL from received response ${received.output}`);
      }
    }
    return received.output;
  }

  private async runPPL(query: string): Promise<ApiResponse<PPLResponse>> {
    return (await openSearchClient.transport.request({
      method: 'POST',
      path: '/_plugins/_ppl',
      body: JSON.stringify({ query }),
    })) as ApiResponse<PPLResponse>;
  }

  private async runGoldQuery(query: string): Promise<ApiResponse<PPLResponse>> {
    const response = (await openSearchClient.transport
      .request({
        method: 'POST',
        path: query.toLowerCase().startsWith('select ') ? '/_plugins/_sql' : '/_plugins/_ppl',
        body: JSON.stringify({ query }),
      })
      .catch((error) => {
        throw new GoldQueryError(String(error));
      })) as ApiResponse<PPLResponse | SQLResponse>;
    // sql returns 200 for query failures, the error status is inside body
    if ('status' in response.body && response.body.status !== 200)
      throw new GoldQueryError(JSON.stringify(response.body));
    return response;
  }

  public async evaluate(received: OpenSearchProviderResponse, spec: PPLSpec): Promise<TestResult> {
    try {
      const ppl = this.getPPLFromResponse(received);
      const actual = await this.runPPL(ppl);
      const expected = await this.runGoldQuery(spec.gold_query);

      const evalResult = await this.query_eval.calculateScore(received.output!, spec.gold_query, {
        receivedResponse: actual.body,
        expectedResponse: expected.body,
      });
      const editDistance = (
        await this.levenshtein.calculateScore(
          JSON.stringify(actual.body.datarows),
          JSON.stringify(expected.body.datarows),
        )
      ).score;
      console.info(
        `Received PPL: ${ppl}\nExpected query: ${spec.gold_query}\nScore: ${evalResult.score}`,
      );
      return {
        pass: evalResult.score >= 0.8,
        message: () => `Score ${evalResult.score} is above 0.8`,
        score: evalResult.score,
        extras: {
          editDistance,
          exception: null,
        },
      };
    } catch (error) {
      const result: TestResult & Required<Pick<TestResult, 'extras'>> = {
        pass: false,
        message: () => `failed to execute query: ${String(error)}`,
        score: 0,
        extras: {},
      };
      if (error instanceof GoldQueryError) {
        console.error(`[${spec.id}] Invalid gold query: ${spec.gold_query}`);
        result.extras.exception = 'Gold query error';
      } else if (error instanceof ResponseError) {
        const respError = (error as ResponseError<string>).body;
        const pplError = JSON.parse(respError) as {
          error: { reason: string; details: string; type: string };
          status: number;
        };
        result.extras.exception = pplError.error.type;
      } else {
        throw error;
      }
      return result;
    }
  }
}
