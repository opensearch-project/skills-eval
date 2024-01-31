import os
import json
import re
from typing import Callable, Union


def parseRawCompletions(raw_dir: str, fields: list[str], filter: Callable[[dict], Union[str, None]]):
    for filename in os.listdir(raw_dir):
        filepath = os.path.join(raw_dir, filename)
        if os.path.isfile(filepath):
            print(filepath)
            text = open(filepath).read()
            results = parse(text, fields)
            with open("parsed.jsonl", "a") as f:
                for result in results:
                    result["validation"] = filter(result)
                    f.write(json.dumps(result) + "\n")


def addToSeeds(seeds_dir, fields):
    if not os.path.exists(seeds_dir):
        os.mkdir(seeds_dir)
    with open("parsed.jsonl") as f:
        results = [
            json.loads(line) for line in f if json.loads(line)["validation"] == None
        ]
        num_files = len(os.listdir(seeds_dir))
        for i, result in enumerate(results):
            file = os.path.join(seeds_dir, "seedQ{}.txt".format(i + num_files))
            with open(file, "w") as g:
                g.write("\n".join([field + ": " + result[field] for field in fields]))


def parse(text: str, fields: list[str]) -> list[dict]:
    values = []
    for i, field in enumerate(fields):
        if i == len(fields) - 1:
            values.append(
                list(
                    map(
                        lambda x: x[0].strip(),
                        re.findall(
                            field + r":\s+(.+?)(?=(\n+(\d+\.)?\s*" + fields[0] + ")|$)",
                            text,
                            re.DOTALL,
                        ),
                    )
                )
            )
        else:
            values.append(
                list(
                    map(
                        str.strip,
                        re.findall(
                            field + r":\s+(.+?)(?=" + fields[i + 1] + ":)",
                            text,
                            re.DOTALL,
                        ),
                    )
                )
            )
    results = []
    try:
        for i in range(len(values[0])):
            result = {}
            for j in range(len(values)):
                result[fields[j]] = values[j][i]
            results.append(result)
    except IndexError:
        print("IndexError")
        return []
    return results
