/*
 * Copyright OpenSearch Contributors
 * SPDX-License-Identifier: Apache-2.0
 */

// TODO fix types
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import fs from 'fs';
import path from 'path';
import { ApiProviderFactory } from '../../providers/factory';
import { AlertingRunner } from '../../runners/alerting';

const provider = ApiProviderFactory.create();
const runner = new AlertingRunner(provider);

const specDirectory = path.join(__dirname, 'specs');
const specFiles = [path.join(specDirectory, 'search_alerts_tests.jsonl')];

// was run once to generate the alerts tests in a test framework-compatible format
// const jsonLines = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'self-instruct', 'raw_alerting_tests.jsonl'), 'utf8');
// const s = jsonLines
//     .split('\n')
//     .filter((line) => line)
//     .map((line) => JSON.parse(line));
// s is a list, each element is a JSON object representing each line of the original raw_alerting_tests.jsonl

// fs.writeFile(
//   '/Users/toepkerd/Documents/Olly-Project/observability-langchain/src/tests/specs/search_alerts_tests.jsonl',
//   s
//     .map((line) => JSON.stringify({ id: nanoid(), clusterStateId: 'alerting', question: line.Input, expectedAnswer: line.Output, }))
//     .join('\n'),
//   function(err) {
//     if (err) {
//       return console.error(err);
//     }
//   }
// );

// REMEMBER: if npm run test doesnt output "deleted all test indices" followed by "created index .opendistro...", that means
// it got stuck trying to interpret a .DS_Store as an index dir. Delete all DS_Stores in the repo, and npm run test
// will go back to deleting and creating indices as before
// command to run in observability-langchain root to delete DS Stores: find . -name '.DS_Store' -type f -delete

// TODO:
// - add "when did alert xyz complete" question where xyz is an alert thats still active, answer should be "alert is not yet complete"

const alertTimeToTimestamp = new Map<string, number>();

populateAlertTimeToTimestampMap();
populateAlertDocTimestamps();
populateTestCaseTimes();

runner.run(specFiles);

/* UTILS AND HELPERS */

// caveat to check for: this populates the test cases with dates and times with respect to the time of test framework execution
// because of time range shifts depending on when this test framework is executed, questions that concern a specific date might become skewed
// because the dynamically populated time offsets of the alerts might lead into the day before the day intended for testing.
// current remedy will be to rely on the fact that answers from olly are evaluated manually, so it is left to the evaluator's judgment to
// determine if the answer from Olly is valid or not given the context at the time of execution
// That being said, the alerts were generated assuming the current time was 5pm (see HEAD_EXAMPLE), so if the tests are executed at or
// around 5pm, these frameshifts are unlikely to cause issues, which makes this time a useful reference point/anchor
function populateAlertTimeToTimestampMap() {
  const now = Date.now();
  const one_hour = 1 * 60 * 60 * 1000; // 1 hr -> milliseconds
  const three_hours = 3 * 60 * 60 * 1000; // 3 hrs -> milliseconds

  // below is a manually curated set of alert times that best diversifies
  // the cluster's alert context for testing, each alert needs to happen
  // at a very specifically chosen time for the cluster alerts context to be most diverse

  // Alert ID 0OgfsOs5t6yqi81f3yj18
  let start_time = now - 795021000;
  alertTimeToTimestamp.set('0OgfsOs5t6yqi81f3yj18.start_time', start_time);
  alertTimeToTimestamp.set('0OgfsOs5t6yqi81f3yj18.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('0OgfsOs5t6yqi81f3yj18.end_time', start_time + three_hours);

  // Alert ID k9gf4os5tkqi81f3y988
  start_time = now - 708621000;
  alertTimeToTimestamp.set('k9gf4os5tkqi81f3y988.start_time', start_time);
  alertTimeToTimestamp.set('k9gf4os5tkqi81f3y988.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('k9gf4os5tkqi81f3y988.end_time', start_time + three_hours);

  // Alert ID Xugf4osB7kqi81T0y9pw
  start_time = now - 622221000;
  alertTimeToTimestamp.set('Xugf4osB7kqi81T0y9pw.start_time', start_time);
  alertTimeToTimestamp.set('Xugf4osB7kqi81T0y9pw.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('Xugf4osB7kqi81T0y9pw.end_time', start_time + three_hours);

  // Alert ID uzg0gosB6jqYe1T0y9Aa
  start_time = now - 535821000;
  alertTimeToTimestamp.set('uzg0gosB6jqYe1T0y9Aa.start_time', start_time);
  alertTimeToTimestamp.set('uzg0gosB6jqYe1T0y9Aa.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('uzg0gosB6jqYe1T0y9Aa.end_time', start_time + three_hours);

  // Alert ID QziGl4sB6jqYe1T0_fnD
  start_time = now - 436706000;
  alertTimeToTimestamp.set('QziGl4sB6jqYe1T0_fnD.start_time', start_time);
  alertTimeToTimestamp.set('QziGl4sB6jqYe1T0_fnD.last_notification_time', start_time + one_hour);
  // this alert is not COMPLETED in the cluster context, so it doesn't get an end time

  // Alert ID GThUkYsB6jqYe1T0UOF3
  start_time = now - 282097000;
  alertTimeToTimestamp.set('GThUkYsB6jqYe1T0UOF3.start_time', start_time);
  alertTimeToTimestamp.set('GThUkYsB6jqYe1T0UOF3.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('GThUkYsB6jqYe1T0UOF3.acknowledged_time', start_time + three_hours);
  // this alert is not COMPLETED in the cluster context, so it doesn't get an end time

  // Alert ID ODjvlosB6jqYe1T0MPKU
  start_time = now - 188061000;
  alertTimeToTimestamp.set('ODjvlosB6jqYe1T0MPKU.start_time', start_time);
  alertTimeToTimestamp.set('ODjvlosB6jqYe1T0MPKU.last_notification_time', start_time + one_hour);
  // this alert is not COMPLETED in the cluster context, so it doesn't get an end time

  // Alert ID c1dc6e4b-1f71-4662-b444-a2b257546e3b
  start_time = now - 95375000;
  alertTimeToTimestamp.set('c1dc6e4b-1f71-4662-b444-a2b257546e3b.start_time', start_time);
  alertTimeToTimestamp.set(
    'c1dc6e4b-1f71-4662-b444-a2b257546e3b.last_notification_time',
    start_time + one_hour,
  );
  // this alert is not COMPLETED in the cluster context, so it doesn't get an end time

  // Alert ID dzhPl4sB6jqYe1T0ffaX
  start_time = now - 95349000;
  alertTimeToTimestamp.set('dzhPl4sB6jqYe1T0ffaX.start_time', start_time);
  alertTimeToTimestamp.set('dzhPl4sB6jqYe1T0ffaX.last_notification_time', start_time + one_hour);
  alertTimeToTimestamp.set('dzhPl4sB6jqYe1T0ffaX.end_time', start_time + three_hours);

  // Alert ID hDjvlhfB6jqY61T0PLK5
  start_time = now - 3446000;
  alertTimeToTimestamp.set('hDjvlhfB6jqY61T0PLK5.start_time', start_time);
  alertTimeToTimestamp.set('hDjvlhfB6jqY61T0PLK5.last_notification_time', start_time + one_hour);
  // this alert is not COMPLETED in the cluster context, so it doesn't get an end time
}

function populateAlertDocTimestamps() {
  const alertLines = fs.readFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'data',
      'indices',
      'alerting',
      '.opendistro-alerting-alerts',
      'documents.ndjson',
    ),
    'utf8',
  );
  const alertObjectsList = alertLines.split('\n').map((line) => JSON.parse(line));

  alertObjectsList.forEach(function (alertObj) {
    switch (alertObj.id) {
      case '0OgfsOs5t6yqi81f3yj18':
        alertObj.start_time = alertTimeToTimestamp.get('0OgfsOs5t6yqi81f3yj18.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          '0OgfsOs5t6yqi81f3yj18.last_notification_time',
        );
        alertObj.end_time = alertTimeToTimestamp.get('0OgfsOs5t6yqi81f3yj18.end_time');
        break;
      case 'k9gf4os5tkqi81f3y988':
        alertObj.start_time = alertTimeToTimestamp.get('k9gf4os5tkqi81f3y988.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'k9gf4os5tkqi81f3y988.last_notification_time',
        );
        alertObj.end_time = alertTimeToTimestamp.get('k9gf4os5tkqi81f3y988.end_time');
        break;
      case 'Xugf4osB7kqi81T0y9pw':
        alertObj.start_time = alertTimeToTimestamp.get('Xugf4osB7kqi81T0y9pw.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'Xugf4osB7kqi81T0y9pw.last_notification_time',
        );
        alertObj.end_time = alertTimeToTimestamp.get('Xugf4osB7kqi81T0y9pw.end_time');
        break;
      case 'uzg0gosB6jqYe1T0y9Aa':
        alertObj.start_time = alertTimeToTimestamp.get('uzg0gosB6jqYe1T0y9Aa.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'uzg0gosB6jqYe1T0y9Aa.last_notification_time',
        );
        alertObj.end_time = alertTimeToTimestamp.get('uzg0gosB6jqYe1T0y9Aa.end_time');
        break;
      case 'QziGl4sB6jqYe1T0_fnD':
        alertObj.start_time = alertTimeToTimestamp.get('QziGl4sB6jqYe1T0_fnD.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'QziGl4sB6jqYe1T0_fnD.last_notification_time',
        );
        break;
      case 'GThUkYsB6jqYe1T0UOF3':
        alertObj.start_time = alertTimeToTimestamp.get('GThUkYsB6jqYe1T0UOF3.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'GThUkYsB6jqYe1T0UOF3.last_notification_time',
        );
        alertObj.acknowledged_time = alertTimeToTimestamp.get(
          'GThUkYsB6jqYe1T0UOF3.acknowledged_time',
        );
        break;
      case 'ODjvlosB6jqYe1T0MPKU':
        alertObj.start_time = alertTimeToTimestamp.get('ODjvlosB6jqYe1T0MPKU.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'ODjvlosB6jqYe1T0MPKU.last_notification_time',
        );
        break;
      case 'c1dc6e4b-1f71-4662-b444-a2b257546e3b':
        alertObj.start_time = alertTimeToTimestamp.get(
          'c1dc6e4b-1f71-4662-b444-a2b257546e3b.start_time',
        );
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'c1dc6e4b-1f71-4662-b444-a2b257546e3b.last_notification_time',
        );
        break;
      case 'dzhPl4sB6jqYe1T0ffaX':
        alertObj.start_time = alertTimeToTimestamp.get('dzhPl4sB6jqYe1T0ffaX.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'dzhPl4sB6jqYe1T0ffaX.last_notification_time',
        );
        alertObj.end_time = alertTimeToTimestamp.get('dzhPl4sB6jqYe1T0ffaX.end_time');
        break;
      case 'hDjvlhfB6jqY61T0PLK5':
        alertObj.start_time = alertTimeToTimestamp.get('hDjvlhfB6jqY61T0PLK5.start_time');
        alertObj.last_notification_time = alertTimeToTimestamp.get(
          'hDjvlhfB6jqY61T0PLK5.last_notification_time',
        );
        break;
      default:
        break;
    }
  });

  fs.writeFileSync(
    path.join(
      __dirname,
      '..',
      '..',
      '..',
      'data',
      'indices',
      'alerting',
      '.opendistro-alerting-alerts',
      'documents.ndjson',
    ),
    alertObjectsList.map((line) => JSON.stringify(line)).join('\n'),
  );
}

function populateTestCaseTimes() {
  const templateLines = fs.readFileSync(
    path.join(__dirname, 'templates', 'search_alerts_test_templates.jsonl'),
    'utf8',
  );
  const templateLinesList = templateLines.split('\n');

  for (let i = 0; i < templateLinesList.length; i++) {
    templateLinesList[i] = formatString(templateLinesList[i]);
  }

  fs.writeFileSync(
    path.join(__dirname, 'specs', 'search_alerts_tests.jsonl'),
    templateLinesList.join('\n'),
  );
}

// only for trimming Date.toString()
// Date.toString() comes in format "DayOfWeek Month Day Year Time Timezone",
// if trimStyle "date" is passed in, this trims DayOfWeek, Time, and Timezone
// if trimStyle "dateAndTime" is passed in, this trims DayOfWeek, Timezone, and the seconds portion of the Time
function trimDate(fullDate: string, trimStyle: string) {
  if (trimStyle === 'date') {
    return fullDate.split(' ').slice(1, 4).join(' '); // trim day of week and timezone info
  } else if (trimStyle === 'dateAndTime') {
    const dateAndFullTime = fullDate.split(' ').slice(1, 5).join(' '); // trim day of week and timezone info
    return dateAndFullTime.substring(0, dateAndFullTime.length - 3); // trim seconds off of time
  }
  throw new Error(
    `passed in trimStyle was neither 'date' nor 'dateAndTime', was ${trimStyle} instead`,
  );
}

// expected syntax of a string format: <{alert-id}.{start_time|end_time|acknowledged_time|last_notification_time},{date|dateAndTime}>
// example: <0OgfsOs5t6yqi81f3yj18.start_time,dateAndTime>
function formatString(template: string) {
  return template.replace(/<(.*?)>/g, function (match, contents) {
    const contentsStr = contents as string;
    if (contentsStr == null) return match;
    const arr = contentsStr.split(',');
    const key = arr[0];
    const trimStyle = arr[1];
    if (alertTimeToTimestamp.has(key)) {
      const val = alertTimeToTimestamp.get(key);
      if (typeof val == 'undefined') return match;
      const result = trimDate(new Date(val).toString(), trimStyle);
      if (typeof result == 'undefined') return match;
      return result;
    }
    return match;
  });
}
