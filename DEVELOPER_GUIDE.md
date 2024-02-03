## Developer Guide

So you want to contribute code to this project? Excellent! We're glad you're here. Here's what you need to do.

## Run test framework

### 1. Set up repo

1. Install node and python. Tested with node v18.15.0 and python v3.9.13.
2. Clone repo and install dependencies

   ```bash
   git clone https://github.com/joshuali925/observability-langchain -b assistant-tests
   cd assistant-tests
   npm i
   ```

### 2. Set up environment variables

The test framework expects an OpenSearch endpoint with models and agents created. See [.env.sample](./.env.sample) for a list of available configurations and their default values.

You can set environment variables using a `.env` file or other standard ways.

### 3. Run tests

```bash
# run all tests
npm run test

# run a specific test suite
npm run test -- src/tests/api/cat.test.ts

# run tests with parallel execution (default max concurrency is 1)
npm run test -- src/tests/api/cat.test.ts --maxConcurrency=5
```

### 4. See results

Results are stored in the `./results/` directory.

## Onboarding a new skill

### 1. Create test cases

Each test case should contain these fields:

- `id`: string id or [name](https://jestjs.io/docs/api#testname-fn-timeout) of the test case. used for reproducing results for each test case
- `clusterStateId`: optional string id to identify a cluster state. test runner can use this id to setup the data/indices needed before test starts
- `question`: user's question

Additionally for automatic score evaluation, there should be an expected output defined. For example, for QA related tools (e.g. cat index), each test case should also contain an `expectedAnswer`. For the PPL tool, each test case should contain a `gold_query`. The test cases can contain other arbitrary fields needed, such as `index` for each PPL test case.

```typescript
export interface TestSpec {
  id: string;
  clusterStateId?: string;
  question: string;
}
export interface QASpec extends TestSpec {
  expectedAnswer: string;
}
interface PPLSpec extends TestSpec {
  gold_query: string;
  index: string;
}
```

The test cases will be stored as `.jsonl` files in the `src/tests/<skill-name>/specs` directory, for example [src/tests/query/specs/olly_ppl_eval.jsonl](./src/tests/query/specs/olly_ppl_eval.jsonl).

For a tool or a skill, 20 to 50 test cases should be a good start. Here are some notes:

- The test cases should have enough variety. Using the PPL tool as an example, it means that the expected query should have variety in syntax and semantic meaning, and the indices used should be different from each other.
- The test cases can be written by hand, or generated using [self-instruct](https://arxiv.org/pdf/2212.10560.pdf), or any other methods.
- The expected results should be manually approved by human.

### 2. Add the test runner

The test runner will be responsible for running and evaluating each test case for a list of spec files. There are two main parts need to be defined for each runner, the cluster state setup and the evaluation function. Optionally it can decide how to construct the input to send to API.

#### 2.1. Setting up the cluster state

Many skills need some data in the cluster to work, for example the alerting tool needs some config documents in the alerting indices. The documents should be deterministic so that the outputs are predictable. Test runner can define standard [`jest` hooks](https://jestjs.io/docs/setup-teardown) that receives the `clusterStateId` and do the necessary work to setup the cluster. Since most of the time it would be adding indices to the cluster, there is a helper utility function to create indices by group `OpenSearchTestIndices.create(group)`. Each directory under [data/indices](./data/indices) represents an index group, the structure is:

```
.
└── data
    └── indices
        └── index_group_1
            ├── index_1
            │   ├── documents.ndjson
            │   └── mappings.json
            └── index_2
                ├── documents.ndjson
                └── mappings.json
```

#### 2.2. Evaluation function

The test runner should also define how the score is calculated between the actual and expected output. This can be done by implementing the `evaluate` function.

```typescript
public abstract evaluate(received: ProviderResponse, spec: T): Promise<TestResult>;
```

Types:

```typescript
export interface ProviderResponse {
  error?: string;
  output?: string | object;
  tokenUsage?: Partial<TokenUsage>;
  cached?: boolean;
}
export interface TestResult extends jest.CustomMatcherResult {
  /**
   * a number between 0 and 1.
   */
  score: number;
  /**
   * any other information that should be persisted.
   */
  extras?: Record<string, unknown> & {
    // these are automatically set by the framework
    /**
     * true if API call to run tool/agent failed.
     */
    api_error?: boolean;
    /**
     * true if API call returned an empty output.
     */
    empty_output?: boolean;
    /**
     * true if call for evaluation failed.
     */
    evaluation_error?: boolean;
  };
}
```

Metrics supported by the test framework:

1. Model assisted metrics from [promptfoo](https://www.promptfoo.dev/docs/configuration/expected-outputs/#model-assisted-eval-metrics)
   1. `llm-rubric` - checks if the LLM output matches given requirements, using a language model to grade the output based on the rubric.
   1. `model-graded-closedqa` - similar to the above, a "criteria-checking" eval which specifies the evaluation prompt as checking a given criteria. Uses the prompt from OpenAI's public evals.
   1. `model-graded-factuality` - a factual consistency eval which, given a completion A and reference answer B evaluates whether A is a subset of B, A is a superset of B, A and B are equivalent, A and B disagree, or A and B differ, but difference don't matter from the perspective of factuality. Uses the prompt from OpenAI's public evals.
   1. `cosine-similarity` - uses embeddings model to calculate similarity score of a given output against a given expected output.
1. Non model based metrics
   1. `levenshtein` - edit distance
   1. `bert` - https://huggingface.co/spaces/evaluate-metric/bertscore
   1. `meteor` - https://huggingface.co/spaces/evaluate-metric/meteor
   1. `rouge` - https://huggingface.co/spaces/evaluate-metric/rouge
   1. `os_query_eval` - eval function specifically used to compare PPL/SQL query results

Python based metrics are stored under [packages](./packages). Each package should contain a `requirements.txt` and at least one python file that can be called with `python file.py "output" '{"expected":"value","additional_fields":"value"}'`. The call should output a score to standard output that can be one of `true`, `false`, a float number from 0 to 1, or a JSON string with a `score` key.

#### 2.3. Override build input

Some tools like the PPL tool requires extra fields in addition to the question, and other tools might be using a different field (e.g. `input` instead of `question`). The runner can override `buildInput` and pass in additional keys to context. For the agent framework provider, the API will be called as

```typescript
request({
  method: 'POST',
  path: `/_plugins/_ml/agents/${agentId}/_execute`,
  body: JSON.stringify({ parameters: { question: prompt, ...context?.vars } }),
});
```

For example, if a tool want to pass in `{ "input": <spec.question>, "index": <spec.index> }` as the `parameters`, the function should be

```typescript
protected buildInput(spec: T) {
  return {
    prompt: undefined,
    context: { vars: { input: spec.question, index: spec.index } },
  };
}
```

#### 2.4. Examples

The test runner can be defined in [src/runners](./src/runners) or as anonymous classes.

```typescript
// src/tests/api/cat.test.ts
const runner = new (class CatIndicesRunner extends QARunner {
  rougeMatcher = new PythonMatcher('rouge/rouge.py');

  protected async beforeAll(clusterStateId: string): Promise<void> {
    // create indices in the index group that matches the clusterStateId
    await OpenSearchTestIndices.init();
    await OpenSearchTestIndices.create(clusterStateId, { ignoreExisting: true });
  }

  public async evaluate(received: OpenSearchProviderResponse, spec: QASpec): Promise<TestResult> {
    // calculates cosine similarity
    const result = await matchesSimilarity(received.output || '', spec.expectedAnswer);
    // calculates rouge scores
    const rougeScores = await this.rougeMatcher.calculateScore(
      received.output || '',
      spec.expectedAnswer,
      { rouge: ['rouge1', 'rouge2', 'rouge3', 'rougeL'] },
    );
    // cosine similarity score is used to determine if test passes
    // rouge scores are added to `extras` that will be saved in the test result for reference
    return {
      pass: result.pass,
      message: () => result.reason,
      score: result.score,
      extras: { rougeScores: rougeScores.scores },
    };
  }
})(ApiProviderFactory.create());
runner.run([path.join(__dirname, 'specs', 'olly_cat_eval.jsonl')]);
```

<details>
<summary>Click for more examples</summary>

```typescript
/* Sample Rouge Usage */
const runner = new (class CatIndicesRunner extends QARunner {
  rougeMatcher = new PythonMatcher('rouge/rouge.py');

  public async evaluate(received: OpenSearchProviderResponse, spec: QASpec): Promise<TestResult> {
    const rougeScores = await this.rougeMatcher.calculateScore(
      received.output || '',
      spec.expectedAnswer,
      { rouge: ['rouge1', 'rouge2', 'rouge3', 'rougeL'] },
    );
    console.info(`Received: ${received.output}`);
    console.info(`Expected: ${spec.expectedAnswer}`);
    console.info(`Rouge scores: ${JSON.stringify(rougeScores.scores, null, 2)}`);
    return {
      pass: rougeScores.score >= 0.8,
      message: () => `Compared test score ${rougeScores.score} to threshold 0.8`,
      score: rougeScores.score,
      extras: { rougeScores: rougeScores.scores },
    };
  }
})(provider);

/* Sample Bert Usage */
const runner = new (class CatIndicesRunner extends QARunner {
  bertMatcher = new PythonMatcher('bert/bert.py');

  public async evaluate(received: OpenSearchProviderResponse, spec: QASpec): Promise<TestResult> {
    const bertScores = await this.bertMatcher.calculateScore(
      received.output || '',
      spec.expectedAnswer,
    );
    console.info(`Received: ${received.output}`);
    console.info(`Expected: ${spec.expectedAnswer}`);
    console.info(`Bert scores: ${JSON.stringify(bertScores.scores, null, 2)}`);
    return {
      pass: bertScores.score >= 0.8,
      message: () => `Compared test score ${bertScores.score} to threshold 0.8`,
      score: bertScores.score,
      extras: { bertScores: bertScores.scores },
    };
  }
})(provider);

/* Sample Meteor Usage */
const runner = new (class CatIndicesRunner extends QARunner {
  meteorMatcher = new PythonMatcher('meteor/meteor.py');

  public async evaluate(received: OpenSearchProviderResponse, spec: QASpec): Promise<TestResult> {
    const meteorScore = await this.meteorMatcher.calculateScore(
      received.output || '',
      spec.expectedAnswer,
    );
    console.info(`Received: ${received.output}`);
    console.info(`Expected: ${spec.expectedAnswer}`);
    console.info(`Meteor score: ${meteorScore.score}`);
    return {
      pass: meteorScore.score >= 0.8,
      message: () => `Compared test score ${meteorScore.score} to threshold 0.8`,
      score: meteorScore.score,
    };
  }
})(provider);
```

</details>

### 3. Create the test file

The test file should be a `.test.ts` file under `src/tests/<skill-name>`, used to run a test suite for a skill. It should instantiate the API provider and pass in at least one spec file to create the runner instance. Here is a minimal example

```typescript
const provider = ApiProviderFactory.create();
const runner = new (class CatIndicesRunner extends QARunner {})(provider);
runner.run([path.join(__dirname, 'specs', 'olly_cat_eval.jsonl')]);
```

Note that by default the agent framework provider will look for the agent id under `ROOT_AGENT_ID`, this can be defined when creating the provider like this:

```typescript
const provider = ApiProviderFactory.create(undefined, { agentIdKey: 'MY_AGENT_ID' });
```

And make sure to set `MY_AGENT_ID` instead in the environment variables.

# Adding Alerting Test Cases

If you're adding test cases to test the Alerting tool, please add your test cases to `src/tests/alerts/templates/get_alerts_test_templates.jsonl`. The test questions follow a template for questions or answers that concern specific dates (e.g. "How many alerts triggered on December 6?"). Any questions or answers that don't involve specific dates can be added as is, but for those that do involve specific dates, please follow the following syntax:

<{alert-id}.{start_time|end_time|acknowledged_time|last_notification_time},{date|dateAndTime}>

alert-id: the alert whose event time you would like to use in your test question/answer

start_time|end_time|acknowledged_time|last_notification_time: choose from this set the alert event time you would like to use. Note that the alert you use must have a valid value for the alert event time chosen here (e.g. if you choose "end_time" for an alert that is not COMPLETED in the alert cluster context, the framework will throw an error)

date|dateAndTime: choose from this set the format of the time you would like to use in your question/answer. Choosing "date" gives the month and day of the event (e.g. Dec 06), while choosing "dateAndTime" gives the month, day and time of the event (e.g. Dec 06 13:40). Adding the day of the week is currently not supported.

example: <0OgfsOs5t6yqi81f3yj18.start_time,dateAndTime>

for more examples, consult `src/tests/templates/get_alerts_test_templates.jsonl`
