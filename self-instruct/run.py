from getClaudeDataTable import requestClaude
from parseRawCompletion import addToSeeds, parseRawCompletions
from configs import seeds_dir, seed_sections, output_dir, validate


if __name__ == "__main__":
    requestClaude()
    parseRawCompletions(output_dir, seed_sections, validate)
    # addToSeeds(seeds_dir, seed_sections)
