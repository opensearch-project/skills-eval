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

interface DSLSpec extends TestSpec {
  question: string;
  gold_query: string;
  index: string;
}

interface DSLResponseItem {
  _id: string;
  _score: string;
  _index: string;
  _source: string;
}
interface DSLResponse {
  hits: {
    hits: Array<DSLResponseItem>;
  };
}

class GoldQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoldQueryError';
  }
}

export class SearchIndexRunner extends TestRunner<DSLSpec, ApiProvider> {
  levenshtein = new LevenshteinMatcher();
  query_eval = new PythonMatcher('os_query_eval/eval.py');

  protected async beforeAll(clusterStateId: string): Promise<void> {
    await OpenSearchTestIndices.init();
    await OpenSearchTestIndices.create(clusterStateId, { ignoreExisting: true });
  }

  private async runDSL(query: string, index: string): Promise<ApiResponse<DSLResponse>> {
    return (await openSearchClient.transport.request({
      method: 'GET',
      path: index + '/_search',
      body: query,
    })) as ApiResponse<DSLResponse>;
  }

  private parseDSLResponse(expected: ApiResponse<DSLResponse>): string {
    let expected_string = '';
    try {
      for (let i = 0; i < expected.body.hits.hits.length; i++) {
        const responseItem: DSLResponseItem = expected.body.hits.hits[i];
        expected_string +=
          JSON.stringify({
            _index: responseItem._index,
            _source: responseItem._source,
            _id: responseItem._id,
            _score: responseItem._score,
          }) + '\n';
      }
    } catch (error) {
      console.log('error parsing expected DSL response:', error);
    }
    return expected_string;
  }

  protected buildInput(spec: DSLSpec): {
    prompt: Parameters<ApiProvider['callApi']>[0];
    context: Parameters<ApiProvider['callApi']>[1];
  } {
    return {
      prompt: '',
      context: { vars: { input: spec.question } },
    };
  }

  public async evaluate(received: OpenSearchProviderResponse, spec: DSLSpec): Promise<TestResult> {
    try {
      const actual = received.output ?? '';
      const expected = await this.runDSL(spec.gold_query, spec.index);
      const expected_string: string = this.parseDSLResponse(expected);

      const editDistance = (await this.levenshtein.calculateScore(actual, expected_string)).score;
      console.info(
        ` : ${actual}\nExpected query: ${spec.gold_query}\nEdit distance: ${editDistance}`,
      );
      return {
        pass: editDistance >= 0.9,
        message: () => `Score ${editDistance} is above 0.9`,
        score: editDistance,
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
        const dslError = JSON.parse(respError) as {
          error: { reason: string; details: string; type: string };
          status: number;
        };
        result.extras.exception = dslError.error.type;
      } else {
        throw error;
      }
      return result;
    }
  }
}
