/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { OpenSearchTestIndices } from './utils/indices';

void (async () => {
  await OpenSearchTestIndices.init();
  await OpenSearchTestIndices.delete();
  await OpenSearchTestIndices.create();
})();
