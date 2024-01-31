import json
import sys
import random

def main():
    if len(sys.argv) < 3: raise ValueError("Model output and context are expected.")

    received = sys.argv[1]
    context = json.loads(sys.argv[2])
    expected = context["expected"]

    print('received:', received, file=sys.stderr)
    print('expected:', expected, file=sys.stderr)
    results = {}
    results["score"] = random.random()
    return json.dumps(results)

print(main())
