/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { PROVIDERS } from '../../providers/constants';
import { ApiProviderFactory } from '../../providers/factory';
import { ToolSelectionRunner } from '../../runners/tool-selection/tool-selection-runner';

const provider = ApiProviderFactory.create(PROVIDERS.TOOL_SELECTION);
const runner = new ToolSelectionRunner(provider);
const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'tool-selection.jsonl')];

runner.run(specFiles);
