# Content Generation Pipeline

This project demonstrates a simple content generation pipeline using the OpenAI API in Node.js/TypeScript.
It generates textual content for a configurable entity type using GPT models and creates images with DALL-E 3.

## Setup

1. Ensure Node.js 18+ is installed.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set the `OPENAI_API_KEY` environment variable with your OpenAI API key.

## Usage

The generator consumes several input text files stored in the repository root:

- `CARDS.txt` – example cards grouped by class
- `BUFF_EXAMPLES.txt` – sample buff descriptions
- `CLASSES.txt` – the list of class names
- `CLASS_DESCRIPTIONS.txt` – brief summaries of each class drawn from the card examples

You can run the generator through the CLI which exposes several commands:

```bash
npx ts-node src/cli.ts <command> [--count N] [--output DIR]
```

Available commands are:

- `cards` – generate new cards complete with image prompts and cheeky commentary.
- `persona-buffs` – generate new persona trait buffs.
- `describe-classes` – generate aesthetic/mechanical descriptions for each class.

Output files are written to the chosen directory (default `./output`) with images saved under `images/` when applicable.
