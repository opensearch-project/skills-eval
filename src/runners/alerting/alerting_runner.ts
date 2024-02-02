/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { QARunner } from '../qa/qa_runner';
import { OpenSearchTestIndices } from '../../utils/indices';

export class AlertingRunner extends QARunner {
  protected async beforeAll(clusterStateId: string): Promise<void> {
    if (clusterStateId !== 'alerting') {
      throw new Error('unexpected cluster state id');
    }
    await OpenSearchTestIndices.delete('alerting');
    await OpenSearchTestIndices.create('alerting');
  }
}
