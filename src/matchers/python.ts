/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import { exec } from 'child_process';
import fsSync from 'fs';
import path from 'path';
import { Matcher } from './matchers';

const shell = (command: string): Promise<string> => {
  return new Promise((resolve, reject) =>
    exec(command, (error, stdout, stderr) => {
      if (stderr) {
        console.warn(`command: ${command}\nstderr: ${stderr.trim()}`);
      }
      if (error) {
        reject(error.message);
        return;
      }
      resolve(stdout);
    }),
  );
};

/**
 * PythonMatcher runs a given python file to calculate scores. The python file
 * will be called using '<executable> <filePath> <received> <context>', where
 * <context> is a JSON string that contains 'expected' and additional context
 * keys. It should return either a score number or a JSON string that contains
 * 'score' with optional arbitrary keys.
 *
 * @see [Example Python File](file:../../packages/example/random_score.py)
 */
export class PythonMatcher implements Matcher<string> {
  private static readonly venvNames = ['.venv', '.env', 'venv'];
  private readonly packageDir: string;
  private executable: string;
  public readonly filePath: string;

  /**
   * Constructor.
   *
   * @param filePath relative path to .py file from 'packages' directory, e.g.
   * 'example/random_score.py'
   * @param executable optional binary name or relative path to the python
   * executable from 'packages' directory, defaults to closest venv bin or
   * 'python'
   */
  constructor(filePath: string, executable?: string) {
    this.packageDir = path.join(__dirname, '..', '..', 'packages');
    this.filePath = path.join(this.packageDir, filePath);
    try {
      if (!fsSync.statSync(this.filePath).isFile())
        throw new Error(`File ${this.filePath} is not a file`);
    } catch (error) {
      throw new Error(`File ${this.filePath} does not exist`);
    }

    if (executable) {
      this.executable = executable.includes(path.sep)
        ? path.join(this.packageDir, executable)
        : executable;
    } else {
      this.executable = this.findPythonBin(path.dirname(this.filePath)) ?? 'python';
    }
  }

  private findPythonBin(dir: string): string | undefined {
    if (dir === this.packageDir) return;
    const pythonPath = PythonMatcher.venvNames
      .map((venv) => {
        const pythonPath = path.join(dir, venv, 'bin', 'python');
        try {
          if (fsSync.statSync(pythonPath).isFile()) return pythonPath;
        } catch (error) {
          return undefined;
        }
      })
      .find((python) => python);
    if (pythonPath) return pythonPath;
    return this.findPythonBin(path.dirname(dir));
  }

  public async calculateScore(
    received: string,
    expected: string,
    context?: Record<string, unknown>,
  ) {
    const escapedOutput = received.replace(/'/g, `'"'"'`);
    const escapedContext = JSON.stringify({ expected, ...context }).replace(/'/g, `'"'"'`);
    const result = (
      await shell(`"${this.executable}" "${this.filePath}" '${escapedOutput}' '${escapedContext}'`)
    ).trim();

    if (result.startsWith('{')) {
      try {
        const parsed = JSON.parse(result) as object;
        if (!parsed.hasOwnProperty('score')) {
          throw new Error(
            'Python matcher must return a number or JSON string with {score: number}',
          );
        }
        return parsed as ReturnType<Matcher['calculateScore']>;
      } catch (error) {
        throw new Error('Python matcher returned invalid json');
      }
    }

    let score = 0;
    if (result.toLowerCase() === 'false') score = 0;
    else if (result.toLowerCase() === 'true') score = 1;
    else score = parseFloat(result);
    if (isNaN(score))
      throw new Error('Python matcher must return a number or JSON string with {score: number}');
    return { score };
  }
}
