/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { IMessage } from '../../types';
import { ollyClient } from '../clients/olly';
import { PROVIDERS } from '../constants';
import { OpenSearchProviderResponse } from '../types';

type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface OllyProviderSuccessResponse
  extends RequiredFields<Exclude<OpenSearchProviderResponse, 'error'>, 'output'> {
  traceId: string;
  sessionId: string;
  messages: IMessage[];
}

export type OllyProviderResponse = OpenSearchProviderResponse | OllyProviderSuccessResponse;

export class OllyApiProvider implements ApiProvider {
  constructor(private readonly providerId = PROVIDERS.OLLY) {}

  id() {
    return this.providerId;
  }

  async callApi(
    prompt: string,
    _context?: { vars: Record<string, string | object> },
  ): Promise<OllyProviderResponse> {
    try {
      return ollyClient.sendMessage(prompt);
    } catch (error) {
      console.error('Failed to request Olly:', error);
      return { error: `API call error: ${String(error)}` };
    }
  }
}
