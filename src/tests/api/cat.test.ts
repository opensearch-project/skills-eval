/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { QARunner } from '../../runners/qa/qa_runner';
import { OpenSearchTestIndices } from '../../utils/indices';

const provider = ApiProviderFactory.create();

const runner = new (class CatIndexRunner extends QARunner {
    protected async beforeAll(clusterStateId: string): Promise<void> {
      if (clusterStateId !== 'spider') {
        throw new Error('unexpected cluster state id');
      }
      // If there is a need to refresh this dataset, uncomment this line
      // await OpenSearchTestIndices.delete('spider');
      await OpenSearchTestIndices.create('spider', {'ignoreExisting': true});
    }
  })(provider); 

const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'olly_cat_eval.jsonl')];

runner.run(specFiles);
