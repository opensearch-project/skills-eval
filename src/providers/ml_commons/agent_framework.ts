/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from '@opensearch-project/opensearch';
import { ApiProvider } from 'promptfoo';
import { openSearchClient } from '../clients/opensearch';
import { PROVIDERS } from '../constants';
import { OpenSearchProviderResponse } from '../types';
import { getValue } from './utils';

interface AgentResponse {
  inference_results: Array<{
    output: Array<{
      name: string;
      dataAsMap?: {
        response: string;
        additional_info: object;
      };
      result?: string;
    }>;
  }>;
}

/**
 * Api Provider to request a agent.
 */
export class AgentFrameworkApiProvider implements ApiProvider {
  constructor(
    private readonly providerId = PROVIDERS.AGENT_FRAMEWORK,
    private readonly agentIdKey = 'ROOT_AGENT_ID',
  ) {}

  id() {
    return this.providerId;
  }

  private getAgentId() {
    const id = process.env[this.agentIdKey];
    if (!id) throw new Error(`${this.agentIdKey} environment variable not set`);
    return id;
  }

  async callApi(
    prompt: string,
    context?: { vars: Record<string, string | object> },
  ): Promise<OpenSearchProviderResponse> {
    try {
      const agentId = this.getAgentId();
      const response = (await openSearchClient.transport.request({
        method: 'POST',
        path: `/_plugins/_ml/agents/${agentId}/_execute`,
        body: JSON.stringify({ parameters: { question: prompt, ...context?.vars } }),
      })) as ApiResponse<AgentResponse, unknown>;

      const output = getValue(response.body, [
        'inference_results[0].output[0].dataAsMap.response',
        'inference_results[0].output[0].result',
      ]);
      if (!output) throw new Error('Cannot find output from agent response');
      return { output, extras: { rawResponse: response.body } };
    } catch (error) {
      console.error('Failed to request agent:', error);
      return { error: `API call error: ${String(error)}` };
    }
  }
}
