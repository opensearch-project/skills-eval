/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { QARunner } from '../../runners/qa/qa_runner';

const provider = ApiProviderFactory.create();
const runner = new (class CatIndicesRunner extends QARunner {})(provider);
const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'olly_cat_eval.jsonl')];

runner.run(specFiles);
