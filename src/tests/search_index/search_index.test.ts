/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { PROVIDERS } from '../../providers/constants';
import { ApiProviderFactory } from '../../providers/factory';
import { SearchIndexRunner } from '../../runners/search_index/search_index_runner';

const provider = ApiProviderFactory.create(PROVIDERS.AGENT_FRAMEWORK, {
  agentIdKey: 'SEARCH_INDEX_AGENT_ID',
});
const runner = new SearchIndexRunner(provider);
const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'olly_search_index_eval.jsonl')];

runner.run(specFiles);
