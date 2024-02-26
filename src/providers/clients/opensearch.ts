/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CONFIG } from '../constants';
import { certPublicKeyContent, certPrivateKeyContent } from '../constants/security_cert';

const [protocol, url] = OPENSEARCH_CONFIG.URL.split('://');
export const openSearchClient = new Client({
  node: `${protocol}://${OPENSEARCH_CONFIG.OPENSEARCH_USERNAME}:${OPENSEARCH_CONFIG.OPENSEARCH_PASSWORD}@${url}`,
  ssl: {
    rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0',
    cert: certPublicKeyContent,
    key: certPrivateKeyContent,
  },
});
