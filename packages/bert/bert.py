import json
import sys
from bert_score import BERTScorer

# This script throws the following expected error. It does not block the test framework workflow.
# stderr: Some weights of RobertaModel were not initialized from the model checkpoint at roberta-large and are newly initialized: ['roberta.pooler.dense.bias', 'roberta.pooler.dense.weight']
#     You should probably TRAIN this model on a down-stream task to be able to use it for predictions and inference.
def main():
   if len(sys.argv) < 3:
      raise ValueError("Model output and context are expected.")

   received = [sys.argv[1]]
   expected = [json.loads(sys.argv[2])["expected"]]

   scorer = BERTScorer(lang="en", rescale_with_baseline=False)
   P_tensor, R_tensor, F1_tensor = scorer.score(received, expected)

   P = P_tensor.item()
   R = R_tensor.item()
   F1 = F1_tensor.item()
   
   score = F1
   scores = {
      "P": P,
      "R": R,
      "F1": F1
   }

   results = {
      "scores": scores,
      "score": score
   }

   return json.dumps(results)

print(main())