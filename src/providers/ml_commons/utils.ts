/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import _ from 'lodash';

export const getValue = (obj: object, possibleKeys: string[]) => {
  for (const key of possibleKeys) {
    const value = _.get(obj, key) as string;
    if (value) return value;
  }
  return '';
};
