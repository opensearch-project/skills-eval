import json
import sys

from rouge_score import rouge_scorer


def main():
    if len(sys.argv) < 3:
        raise ValueError("Model output and context are expected.")

    received = sys.argv[1]
    context = json.loads(sys.argv[2])
    expected = context["expected"]

    results = {}
    scorer = rouge_scorer.RougeScorer(context["rouge"], use_stemmer=True)
    results["scores"] = scorer.score(received, expected)
    results["score"] = sum([score[2] for score in results["scores"].values()]) / len(
        results["scores"].values()
    )
    return json.dumps(results)


print(main())
