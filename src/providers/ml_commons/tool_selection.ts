/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from '@opensearch-project/opensearch';
import { ApiProvider } from 'promptfoo';
import { openSearchClient } from '../clients/opensearch';
import { PROVIDERS } from '../constants';
import { OpenSearchProviderResponse } from '../types';

interface AgentResponse {
  inference_results: Array<{
    output: Array<{
      name: string;
      result?: string;
    }>;
  }>;
}

/**
 * Api Provider to request a agent.
 */
export class ToolSelectionApiProvider implements ApiProvider {
  constructor(
    private readonly agentIdKey = 'ROOT_AGENT_ID',
  ) {}

  id() {
    return PROVIDERS.TOOL_SELECTION;
  }

  private getAgentId() {
    const id = process.env[this.agentIdKey];
    if (!id) throw new Error(`${this.agentIdKey} environment variable not set`);
    return id;
  }

  async callApi(
    prompt?: string,
    context?: { vars: Record<string, string | object> },
  ): Promise<OpenSearchProviderResponse> {
    try {
      const agentId = this.getAgentId();
      const response = (await openSearchClient.transport.request({
        method: 'POST',
        path: `/_plugins/_ml/agents/${agentId}/_execute`,
        body: JSON.stringify({ parameters: { question: prompt, ...context?.vars } }),
      })) as ApiResponse<AgentResponse, unknown>;

      const outputResponse =
        response.body.inference_results[0].output.find((output) => output.name === 'parent_interaction_id') ??
        response.body.inference_results[0].output[0];
      const interactionId = outputResponse.result;
      if (!interactionId) throw new Error('Cannot find interaction id from agent response');

      const tracesResp = (await openSearchClient.transport.request({
        method: 'GET',
        path: `/_plugins/_ml/memory/message/${interactionId}/traces`,
      })) as ApiResponse<{
        traces: Array<{
          message_id: string;
          create_time: string;
          input: string;
          response: string;
          origin: string;
          trace_number: number;
        }>;
      }>;

      const firstTrace = tracesResp.body.traces?.find(item => item.origin && item.trace_number && item.origin !== 'LLM');

      return { output: firstTrace?.origin || 'No tool selected', extras: { rawResponse: response.body, tracesResp } };
    } catch (error) {
      console.error('Failed to request agent:', error);
      return { error: `API call error: ${String(error)}` };
    }
  }
}
