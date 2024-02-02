/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

export const PROVIDERS = {
  OLLY: 'olly_chat',
  PPL_GENERATOR: 'ppl_generator',
  ML_COMMONS: 'ml_commons',
  AGENT_FRAMEWORK: 'agent_framework',
  SEARCH_INDEX_TOOL: 'search_index_tool',
} as const;

export const OPENSEARCH_CONFIG = {
  URL: process.env.OPENSEARCH_URL || 'https://localhost:9200',
  OSD_URL: process.env.DASHBOARDS_URL || 'http://localhost:5601',
  OPENSEARCH_USERNAME: process.env.OPENSEARCH_USERNAME || 'admin',
  OPENSEARCH_PASSWORD: process.env.OPENSEARCH_PASSWORD || 'admin',
};

export const ASSISTANT_CONFIG_INDEX = '.chat-assistant-config';
export const ASSISTANT_CONFIG_DOCUMENT = 'model-config';
