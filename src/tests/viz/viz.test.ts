/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { PROVIDERS } from '../../providers/constants';
import { ApiProviderFactory } from '../../providers/factory';
import { VisualizationRunner } from '../../runners/viz/viz_runner';

const provider = ApiProviderFactory.create(PROVIDERS.OLLY);
const runner = new VisualizationRunner(provider);
const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'get_viz_tests.jsonl')];

runner.run(specFiles);
