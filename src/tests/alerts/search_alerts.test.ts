/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { AlertingRunner } from '../../runners/alerting';

const provider = ApiProviderFactory.create();
const runner = new AlertingRunner(provider);

const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'search_alerts_tests.jsonl')];

runner.run(specFiles);
