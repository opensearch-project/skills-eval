/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { AnomalyDetectionRunner } from '../../runners/anomaly_detection';

const provider = ApiProviderFactory.create();
const runner = new AnomalyDetectionRunner(provider);

const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'search_anomaly_detectors_tests.jsonl')];

runner.run(specFiles);
