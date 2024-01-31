import json
import sys
import nltk
from nltk.translate.meteor_score import meteor_score

def main():
   if len(sys.argv) < 3:
      raise ValueError("Model output and context are expected.")

   received = sys.argv[1]
   expected = json.loads(sys.argv[2])["expected"]

   try:
      tokenized_received = nltk.word_tokenize(received)
      tokenized_expected = [nltk.word_tokenize(expected)]
   except LookupError:
      nltk.download('punkt')
      tokenized_received = nltk.word_tokenize(received)
      tokenized_expected = [nltk.word_tokenize(expected)]

   try:
      return meteor_score(tokenized_expected, tokenized_received)
   except LookupError:
      nltk.download('wordnet')
      return meteor_score(tokenized_expected, tokenized_received)

print(main())