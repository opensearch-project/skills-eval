import json
import re

from opensearchpy import OpenSearch

client = OpenSearch(
    hosts=[{"host": "localhost", "port": 9200}],
    http_compress=True,
    http_auth=("admin", "admin"),
    use_ssl=True,
    verify_certs=False,
    ssl_assert_hostname=False,
    ssl_show_warn=False,
)


def parseFile(path):
    text = json.load(open(path))
    instructions = re.findall(r"Instruction:\s+(.+?)(?=Index:)", text, re.DOTALL)
    indexes = re.findall(r"Index:\s+(.+?)(?=Fields:)", text, re.DOTALL)
    fields = re.findall(r"Fields:\s+(.+?)(?=PPL Output:)", text, re.DOTALL)
    ppl_outputs = re.findall(
        r"PPL Output:\s+(.+?)(?=(\n+(\d+\.)?\s*Instruction)|$)", text, re.DOTALL
    )

    if not (len(instructions) == len(indexes) == len(fields) == len(ppl_outputs)):
        print(path + " contains invalid examples, skipping")
        return {}

    results = []
    for i in range(len(instructions)):
        result = {
            "Instruction": instructions[i].strip(),
            "Index": indexes[i].strip(),
            "Fields": fields[i].strip(),
            "PPL Output": ppl_outputs[i][0].strip(),
        }
        exception = checkException(result)
        if exception == "IndexNotFoundException":
            createSampleIndex(result["Index"], result["Fields"])
            result["validation"] = checkException(result)
        else:
            result["validation"] = exception
        results.append(result)

    return results


def checkException(result):
    try:
        client.transport.perform_request(
            "POST", "/_plugins/_ppl", body={"query": result["PPL Output"]}
        )
        return None
    except Exception as e:
        error = json.loads(e.args[1])["error"]
        return error["type"]


def createSampleIndex(name, fields):
    field_names = re.findall(r"-\s+(.+?)(?=:)", fields, re.DOTALL)
    field_types = re.findall(r":\s+(.+?)(?=\()", fields, re.DOTALL)
    field_values = re.findall(r"\([\"'`]?(.+?)[\"'`]?\)", fields, re.DOTALL)
    if not (len(field_names) == len(field_types) == len(field_values)):
        print(name, " contains invalid examples, skipping")
        return

    mappings = {}
    document = {}
    for i in range(len(field_names)):
        mappings[field_names[i].strip()] = {"type": field_types[i].strip()}
        if mappings[field_names[i].strip()]["type"] == "text":
            mappings[field_names[i].strip()] = {
                "type": "text",
                "fields": {"keyword": {"type": "keyword"}},
            }
        document[field_names[i].strip()] = field_values[i].strip()
    try:
        client.indices.create(index=name, body={"mappings": {"properties": mappings}})
        client.index(index=name, body=document)
    except Exception as e:
        print(name, "failed to create:", e)
        return
