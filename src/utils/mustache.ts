/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as chrono from 'chrono-node';

export const replaceMustacheTemplates = (line: string, epoch = true) => {
  return line.replace(/\$\{\{(.*?)\}\}/g, (match: string, p1: string) => {
    const parsedDate = chrono.parseDate(p1);
    if (!parsedDate) return match;
    if (epoch) {
      return parsedDate.getTime().toString();
    }
    return parsedDate.toDateString();
  });
};
