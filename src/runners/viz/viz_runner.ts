/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiProvider } from 'promptfoo';
import { OllyProviderResponse } from '../../providers/olly/olly';
import { TestResult, TestRunner, TestSpec } from '../test_runner';

interface VizSpec extends TestSpec {
  expectedAnswer: string[];
}

export class VisualizationRunner extends TestRunner<VizSpec, ApiProvider> {
  public async evaluate(received: OllyProviderResponse, spec: VizSpec): Promise<TestResult> {
    const visualizationIds = (received.extras?.visualizations || []) as string[];
    const expectdVisualizationIds = spec.expectedAnswer.map((vis) => {
      return vis.split(',')[1];
    });

    // found out missing visulalizations
    const missing = expectdVisualizationIds.filter((item) => !visualizationIds.includes(item));

    const score = 1 - missing.length / expectdVisualizationIds.length;

    console.info(
      `Question: ${spec.question}\nReceived: ${visualizationIds.join(
        '|',
      )}\nExpected: ${spec.expectedAnswer.join('|')}\nScore: ${score}\n`,
    );
    try {
      return Promise.resolve({
        pass: score === 1,
        message: () => `expected visualizations not found ${missing.join(',')}`,
        score: score,
      });
    } catch (error) {
      return Promise.resolve({
        pass: false,
        message: () => `failed to execture ${String(error)}`,
        score: 0,
      });
    }
  }
}
