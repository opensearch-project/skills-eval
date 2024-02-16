/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chrono from 'chrono-node';

export const replaceMustacheTemplates = (line: string, epoch = true) => {
  return line.replace(/\{\{(.*?)\}\}/g, (match: string, p1: string) => {
    try {
      const parsedDate = chrono.parseDate(p1);
      if (epoch) {
        return parsedDate?.getTime().toString() as string;
      }
      return parsedDate?.toDateString() as string;
    } catch (e) {
      console.error('Invalid date in line, line:', line);
      return match;
    }
  });
};
