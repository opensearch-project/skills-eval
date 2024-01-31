/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from 'jest';

const config: Config = {
  rootDir: '../',
  setupFiles: ['<rootDir>/configs/setupEnv.ts'],
  setupFilesAfterEnv: ['<rootDir>/configs/setupAfterEnv.ts'],
  roots: ['<rootDir>'],
  clearMocks: true,
  testPathIgnorePatterns: [
    '<rootDir>/build/',
    '<rootDir>/node_modules/',
    '<rootDir>/configs/',
    '/__utils__/',
  ],
  coveragePathIgnorePatterns: [
    '<rootDir>/build/',
    '<rootDir>/node_modules/',
    '<rootDir>/configs/',
    '/__utils__/',
  ],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/**/*.test.ts'],
  testTimeout: 600000,
  maxConcurrency: 1,
  reporters: ['default', ['jest-html-reporters', { inlineSource: true }]],
};

export default config;
