/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { PROVIDERS } from '../../providers/constants';
import { ApiProviderFactory } from '../../providers/factory';
import { PPLRunner } from '../../runners/query/ppl_runner';

const provider = ApiProviderFactory.create(PROVIDERS.PPL_GENERATOR, { agentIdKey: 'PPL_AGENT_ID' });
const runner = new PPLRunner(provider);
const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'olly_ppl_eval.jsonl')];

runner.run(specFiles);
