/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMessage } from '../../types';
import { OPENSEARCH_CONFIG } from '../constants';
import { OllyProviderResponse } from '../olly/olly';

const getAuthHeader = (): { Authorization: string } | undefined => {
  if (!OPENSEARCH_CONFIG.OPENSEARCH_USERNAME || !OPENSEARCH_CONFIG.OPENSEARCH_PASSWORD) {
    return undefined;
  }
  return {
    Authorization:
      'Basic ' +
      btoa(`${OPENSEARCH_CONFIG.OPENSEARCH_USERNAME}:${OPENSEARCH_CONFIG.OPENSEARCH_PASSWORD}`),
  };
};

class OllyClient {
  async sendMessage(prompt: string, sessionId?: string): Promise<OllyProviderResponse> {
    const response = (await fetch(`${OPENSEARCH_CONFIG.OSD_URL}/api/assistant/send_message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        'osd-xsrf': '1',
      },
      body: JSON.stringify({
        sessionId,
        input: {
          type: 'input',
          content: prompt,
          contentType: 'text',
        },
      }),
    }).then((resp) => resp.json())) as { sessionId: string; messages: IMessage[] };
    const outputMessage = response.messages
      .reverse()
      .find((message) => message.type === 'output' && message.contentType === 'markdown') as
      | Extract<IMessage, { type: 'output' }>
      | undefined;
    const errorMessage = response.messages
      .reverse()
      .find((message) => message.type === 'output' && message.contentType === 'error') as
      | Extract<IMessage, { type: 'output' }>
      | undefined;
    const visualizations = response.messages
      .reverse()
      .filter(
        (message) => message.type === 'output' && message.contentType === 'visualization',
      ) as Extract<IMessage, { type: 'output' }>[];

    return {
      ...response,
      output: outputMessage?.content,
      traceId: outputMessage?.traceId,
      error: errorMessage?.content,
      extras: {
        visualizations: visualizations?.map((vis) => {
          return vis.content;
        }),
      },
    };
  }

  async generatePPL(question: string, index: string) {
    return fetch(`${OPENSEARCH_CONFIG.OSD_URL}/api/assistant/generate_ppl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        'osd-xsrf': '1',
      },
      body: JSON.stringify({ question, index }),
    }).then((response) => {
      if (response.ok) {
        return response.text();
      }
      return response.text().then((text) => Promise.reject(text));
    });
  }
}

export const ollyClient = new OllyClient();
