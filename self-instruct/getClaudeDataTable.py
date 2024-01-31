import os
import random
from threading import Thread

from configs import seeds_dir, output_dir, intro_file, threads, per_thread_run
from llm_client import ClaudeClient

intro = open(intro_file).read()
client = ClaudeClient()


def getContent():
    all = os.listdir(seeds_dir)
    random.shuffle(all)
    exampleNum = random.randint(3, 5)
    start = random.randint(0, len(all) - exampleNum - 2)
    selectedSeeds = all[start : start + exampleNum]
    content = intro
    for i in range(exampleNum):
        with open(os.path.join(seeds_dir, selectedSeeds[i]), "r") as f:
            content += str(i + 1) + ". " + f.read()
    return "\n\nHuman: " + content + "\nAssistant:"


def target(number):
    random.seed(number)
    for i in range(per_thread_run):
        print(str(number) + "_" + str(i) + "_start")
        output_file = "./{}/rawDataS{}_{}.txt".format(output_dir, number, i)
        if os.path.exists(output_file):
            print("continue")
            continue

        while True:
            try:
                res = client.invokeModel(getContent())
                with open(output_file, "w") as r:
                    r.write(res)
                break
            except Exception as e:
                print(e)
                pass
        print(str(number) + "_" + str(i) + "_finish")


def requestClaude():
    if not os.path.exists(output_dir):
        os.mkdir(output_dir)
    thread_pool = []
    for i in range(1, threads + 1):
        thread_pool.append(
            Thread(
                target=target,
                args=(i,),
                name=str(i),
                daemon=True,
            )
        )
    for i in range(threads):
        thread_pool[i].start()
    for i in range(threads):
        thread_pool[i].join()
