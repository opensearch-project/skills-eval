/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { PROVIDERS } from '../constants';
import { AgentFrameworkApiProvider, MlCommonsApiProvider } from '../ml_commons';
import { OllyApiProvider, OllyPPLGeneratorApiProvider } from '../olly';

type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

interface CreateOptions {
  agentIdKey?: string;
}

export class ApiProviderFactory {
  static create(
    provider: Provider = process.env.API_PROVIDER as Provider,
    options: CreateOptions = {},
  ): ApiProvider {
    switch (provider) {
      case PROVIDERS.PPL_GENERATOR:
        if (process.env.API_PROVIDER === PROVIDERS.AGENT_FRAMEWORK)
          return new AgentFrameworkApiProvider(undefined, options.agentIdKey);
        return new OllyPPLGeneratorApiProvider();

      case PROVIDERS.SEARCH_INDEX_TOOL:
        if (process.env.API_PROVIDER === PROVIDERS.AGENT_FRAMEWORK)
          return new AgentFrameworkApiProvider(undefined, options.agentIdKey);
        return new OllyPPLGeneratorApiProvider();

      case PROVIDERS.ML_COMMONS:
        return new MlCommonsApiProvider();

      case PROVIDERS.AGENT_FRAMEWORK:
        return new AgentFrameworkApiProvider();

      default:
        console.info(`$API_PROVIDER unset or invalid, defaulting to ${PROVIDERS.OLLY} provider`);
      case PROVIDERS.OLLY:
        return new OllyApiProvider();
    }
  }
}
