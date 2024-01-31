/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { distance as levenshtein } from 'fastest-levenshtein';
import { Matcher } from './matchers';

export class LevenshteinMatcher implements Matcher<string> {
  public calculateScore(received: string, expected: string) {
    return Promise.resolve({
      score: this.normalize(received, expected, levenshtein(received, expected)),
    });
  }

  private normalize(received: string, expected: string, distance: number): number {
    const longest = Math.max(received.length, expected.length);
    return (longest - distance) / longest;
  }
}
