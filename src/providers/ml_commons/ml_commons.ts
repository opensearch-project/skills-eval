/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiResponse } from '@opensearch-project/opensearch';
import { GetResponse } from '@opensearch-project/opensearch/api/types';
import { ApiProvider, ProviderEmbeddingResponse } from 'promptfoo';
import { openSearchClient } from '../clients/opensearch';
import { ASSISTANT_CONFIG_DOCUMENT, ASSISTANT_CONFIG_INDEX, PROVIDERS } from '../constants';
import { OpenSearchProviderResponse } from '../types';
import { getValue } from './utils';

interface MLCommonsPredictionResponse {
  inference_results: Array<{
    output: Array<{
      name: string;
      data_type: string;
      shape: number[];
      data: number[];
      dataAsMap: {
        completion: string;
        message: string;
      };
    }>;
  }>;
}

interface AssistantConfigDoc {
  model_id: string;
  embeddings_model_id: string;
}

/**
 * Api Provider to request model/_predict in ml-commons directly.
 */
export class MlCommonsApiProvider implements ApiProvider {
  constructor(private readonly providerId = PROVIDERS.ML_COMMONS) {}

  id() {
    return this.providerId;
  }

  private getLlmId() {
    if (process.env.ML_COMMONS_LLM_ID) return process.env.ML_COMMONS_LLM_ID;
    return this.getModelIdFromConfigDoc()
      .then((doc) => doc.model_id)
      .catch(() => Promise.reject('ML_COMMONS_LLM_ID is missing.'));
  }

  private getEmbeddingsModelId() {
    if (process.env.ML_COMMONS_EMBEDDINGS_MODEL_ID)
      return process.env.ML_COMMONS_EMBEDDINGS_MODEL_ID;
    return this.getModelIdFromConfigDoc()
      .then((doc) => doc.embeddings_model_id)
      .catch(() => Promise.reject('ML_COMMONS_EMBEDDINGS_MODEL_ID is missing.'));
  }

  private async getModelIdFromConfigDoc() {
    const getResponse = await openSearchClient.get<GetResponse<AssistantConfigDoc>>({
      id: ASSISTANT_CONFIG_DOCUMENT,
      index: ASSISTANT_CONFIG_INDEX,
    });
    if (!getResponse.body._source) throw new Error('Assistant config source not found.');
    return getResponse.body._source;
  }

  async callApi(
    prompt: string,
    _context?: { vars: Record<string, string | object> },
  ): Promise<OpenSearchProviderResponse> {
    try {
      const modelId = await this.getLlmId();
      const response = (await openSearchClient.transport.request({
        method: 'POST',
        path: `/_plugins/_ml/models/${modelId}/_predict`,
        body: JSON.stringify({
          parameters: {
            temperature: 0.0000001,
            max_tokens_to_sample: 2048,
            prompt,
          },
        }),
      })) as ApiResponse<MLCommonsPredictionResponse, unknown>;
      const output = getValue(response.body, [
        'inference_results[0].output[0].dataAsMap.response',
        'inference_results[0].output[0].dataAsMap.completion',
        'inference_results[0].output[0].result',
      ]);
      if (!output)
        throw new Error(
          getValue(response.body, ['inference_results[0].output[0].dataAsMap.message']) ||
            'Failed to find model output',
        );
      return { output, extras: { rawResponse: response.body } };
    } catch (error) {
      console.error('Failed to request ml-commons model:', error);
      return { error: `API call error: ${String(error)}` };
    }
  }

  async callEmbeddingApi(prompt: string): Promise<ProviderEmbeddingResponse> {
    try {
      const modelId = await this.getEmbeddingsModelId();
      const response = (await openSearchClient.transport.request({
        method: 'POST',
        path: `/_plugins/_ml/_predict/text_embedding/${modelId}`,
        body: JSON.stringify({
          text_docs: [prompt],
          target_response: ['sentence_embedding'],
        }),
      })) as ApiResponse<MLCommonsPredictionResponse, unknown>;
      return {
        embedding: response.body.inference_results.map((inference) => inference.output[0].data)[0],
      };
    } catch (error) {
      console.error('Failed to request ml-commons embeddings model:', error);
      return {
        error: `API call error: ${String(error)}`,
      };
    }
  }
}
