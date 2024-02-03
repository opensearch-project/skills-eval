/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { matchesFactuality } from '../../matchers/matchers';
import { OpenSearchProviderResponse } from '../../providers/types';
import { TestResult, TestRunner, TestSpec } from '../test_runner';

export interface QASpec extends TestSpec {
  expectedAnswer: string;
}

export class QARunner extends TestRunner<QASpec, ApiProvider> {
  public async evaluate(received: OpenSearchProviderResponse, spec: QASpec): Promise<TestResult> {
    const result = await matchesFactuality(spec.question, received.output!, spec.expectedAnswer);
    console.info(
      `Received: ${received.output}\nExpected: ${spec.expectedAnswer}\nScore: ${result.score}\n`,
    );
    return Promise.resolve({
      pass: result.pass,
      message: () => result.reason,
      score: result.score,
    });
  }
}
