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

To run the included example pipeline:

```bash
npx ts-node src/pipeline.ts
```

This will generate a set of entities, write them to `output/<entity>.yaml`, and download images to `output/images/`.
