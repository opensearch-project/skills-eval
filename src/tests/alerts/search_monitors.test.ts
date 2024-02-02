/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO fix types
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { AlertingRunner } from '../../runners/alerting';

const provider = ApiProviderFactory.create();
const runner = new AlertingRunner(provider);

const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'search_monitors_tests.jsonl')];

runner.run(specFiles);
