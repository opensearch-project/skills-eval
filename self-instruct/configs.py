import json

from opensearchpy import OpenSearch

# Claude library, can be 'anthropic' or 'bedrock'
client_type = 'bedrock'
# required if type is 'anthropic'
api_key = ""
# how many threads can run concurrently
threads = 8
# how many times should a thread run
per_thread_run = 8

# file containing the prompt that will be put on top of seed examples
intro_file = "./HEAD_EXAMPLE"
# directory containing seeds, each seed will be a text file named `seedQn.txt`
seeds_dir = "./seeds"
# sections in each seed and completion, each seed should have these sections
seed_sections = ["Instruction", "Index", "Fields", "PPL Output"]
# directory to store LLM generated examples
output_dir = "./raw_outputs"


# function to add a 'validate' field to result
def validate(result: dict):
    client = OpenSearch(
        hosts=[{"host": "localhost", "port": 9200}],
        http_compress=True,
        http_auth=("admin", "admin"),
        use_ssl=True,
        verify_certs=False,
        ssl_assert_hostname=False,
        ssl_show_warn=False,
    )
    try:
        client.transport.perform_request(
            "POST", "/_plugins/_ppl", body={"query": result["PPL Output"]}
        )
        return None
    except Exception as e:
        error = json.loads(e.args[1])["error"]
        return error["type"]
