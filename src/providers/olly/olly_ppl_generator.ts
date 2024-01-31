/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { ollyClient } from '../clients/olly';
import { PROVIDERS } from '../constants';
import { OpenSearchProviderResponse } from '../types';

export class OllyPPLGeneratorApiProvider implements ApiProvider {
  constructor(private readonly providerId = PROVIDERS.PPL_GENERATOR) {}

  id() {
    return this.providerId;
  }

  async callApi(
    prompt: string,
    context?: { vars: Record<string, string | object> },
  ): Promise<OpenSearchProviderResponse> {
    if (!context?.vars.index || typeof context.vars.index !== 'string')
      throw new Error('a string value is required for context.vars.index');

    try {
      return {
        output: await ollyClient.generatePPL(prompt, context.vars.index),
      };
    } catch (error) {
      console.error('Failed to request PPL generator:', error);
      return { error: `API call error: ${String(error)}` };
    }
  }
}
