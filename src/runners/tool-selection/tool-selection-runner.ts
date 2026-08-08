/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { OpenSearchProviderResponse } from '../../providers/types';
import { TestResult, TestRunner, TestSpec } from '../test_runner';

interface ToolSelectionSpec extends TestSpec {
  tool: string;
}

export class ToolSelectionRunner extends TestRunner<ToolSelectionSpec, ApiProvider> {
  public async evaluate(received: OpenSearchProviderResponse, spec: ToolSelectionSpec): Promise<TestResult> {
    const infoMessage = `Question: ${spec.question}\nReceived selected tool: ${received.output}\nExpected selected tool: ${spec.tool}`;
    console.info(infoMessage);
    const match = received.output === spec.tool;
    return {
      pass: match,
      message: () => infoMessage,
      score: match ? 1 : 0,
      extras: {
        exception: null,
      },
    };
  }
}
