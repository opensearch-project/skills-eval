import json
from anthropic import Client
from configs import api_key, client_type

import boto3


class ClaudeClient:
    def __init__(self):
        if client_type == "bedrock":
            self.client = boto3.client(service_name="bedrock-runtime")
        elif client_type == "anthropic":
            self.client = Client(api_key=api_key)

    def invokeModel(self, prompt: str) -> str:
        if client_type == "bedrock":
            response = self.client.invoke_model(
                body=json.dumps(
                    {
                        "prompt": prompt,
                        "max_tokens_to_sample": 8192,
                        "temperature": 1,
                        "top_p": 0.9,
                        "top_k": 10,
                    }
                ),
                modelId="anthropic.claude-v2",
                accept="application/json",
                contentType="application/json",
            )

            response_body = json.loads(response.get("body").read())
            return response_body.get("completion")
        if client_type == "anthropic":
            res = self.client.completions.create(
                prompt=prompt,
                model="claude-2",
                max_tokens_to_sample=8192,
                temperature=1,
                top_p=0.9,
                top_k=10,
            )
            return res.completion
