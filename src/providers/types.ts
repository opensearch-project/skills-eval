/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProviderResponse } from 'promptfoo';

export interface OpenSearchProviderResponse<T extends ProviderResponse['output'] = string>
  extends ProviderResponse {
  /**
   * output is an optional string unless specified by generics.
   */
  output?: T;
  extras?: Record<string, unknown>;
}
