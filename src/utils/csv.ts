/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';

export const readCsv = async <T extends object = object>(path: string) => {
  const records: T[] = [];
  const parser = fs.createReadStream(path).pipe(parse({ columns: true, skip_empty_lines: true }));
  for await (const record of parser) {
    records.push(record as T);
  }
  return records;
};

export const readCsvSync = <T extends object = object>(path: string) => {
  return parseSync(fs.readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
  }) as T[];
};
