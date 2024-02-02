/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { QARunner } from '../qa/qa_runner';
import { OpenSearchTestIndices } from '../../utils/indices';

export class AnomalyDetectionRunner extends QARunner {
  protected async beforeAll(clusterStateId: string): Promise<void> {
    if (clusterStateId !== 'anomaly-detection') {
      throw new Error('unexpected cluster state id');
    }
    await OpenSearchTestIndices.delete('anomaly-detection');
    await OpenSearchTestIndices.create('anomaly-detection');
  }
}
