/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

type PromiseFunc<T = unknown> = () => Promise<T>;

export const createPromisePool = (limit: number) => {
  const queue: PromiseFunc[] = [];
  const jobs: Set<PromiseFunc> = new Set();

  const next = () => {
    if (jobs.size >= limit) return;
    queue.splice(0, limit - jobs.size).forEach((job) => {
      jobs.add(job);
      void job().finally(() => {
        jobs.delete(job);
        next();
      });
    });
  };

  return {
    run: <T>(func: () => Promise<T>): Promise<T> =>
      new Promise((resolve, reject) => {
        queue.push(() => func().then(resolve).catch(reject));
        next();
      }),
  };
};
