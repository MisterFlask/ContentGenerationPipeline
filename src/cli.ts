import { readFileSync } from 'fs';
import { join } from 'path';
import { EntityType } from './EntityType';
import { OpenAIClient } from './openaiClient';
import { runPipeline } from './pipeline';

function load(file: string): string {
  const p = join(__dirname, '..', file);
  return readFileSync(p, 'utf-8');
}

interface Options {
  count: number;
  output: string;
}

function parseOptions(args: string[]): Options {
  const opts: Options = { count: 5, output: './output' };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--count' && args[i + 1]) {
      opts.count = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      opts.output = args[i + 1];
      i++;
    }
  }
  return opts;
}

async function generateCards(opts: Options) {
  const cardExamples = load('CARDS.txt');
  const buffExamples = load('BUFF_EXAMPLES.txt');
  const classes = load('CLASSES.txt');

  const context = `Here is a list of existing cards:\n${cardExamples}\n\nBuff examples for terminology:\n${buffExamples}\n\nAvailable classes:\n${classes}\n\nEach generated card must include:\n- a 'name'\n- a 'description'\n- a 'class' from the list above or the word 'Cargo'\n- if the class is Cargo, include numeric 'HellSellValue'\n- an array 'commentaries' with three cheeky one-sentence remarks\n- an array 'image_descriptions' containing three different prompts for illustrations.`;

  const entityType = new EntityType({
    name: 'Card',
    description: 'A playable card.',
    fields: ['name', 'description', 'class', 'HellSellValue', 'commentaries', 'image_descriptions'],
    image: { n: 3, size: '1024x1024', style: 'vivid' },
  });

  const client = new OpenAIClient();
  await runPipeline({ outputDir: opts.output, entityCount: opts.count, entityType, additionalContext: context }, client);
}

async function generatePersonaBuffs(opts: Options) {
  const buffExamples = load('BUFF_EXAMPLES.txt');
  const context = `Persona buffs are permanent character traits. Use the following examples for inspiration:\n${buffExamples}`;

  const entityType = new EntityType({
    name: 'PersonaBuff',
    description: 'A permanent trait possessed by a soldier.',
    fields: ['name', 'description'],
    image: { n: 0 },
  });

  const client = new OpenAIClient();
  await runPipeline({ outputDir: opts.output, entityCount: opts.count, entityType, additionalContext: context }, client);
}

async function describeClasses(opts: Options) {
  const cardExamples = load('CARDS.txt');
  const classList = load('CLASSES.txt').split(/\r?\n/).filter(Boolean);
  const context = `Using the following card examples, describe the aesthetics and mechanics embodied by each class. Generate one item per class name provided.\nClasses:\n${classList.map(c => '- ' + c).join('\n')}\n\nCard examples:\n${cardExamples}`;

  const entityType = new EntityType({
    name: 'ClassDescription',
    description: 'A description of a game class.',
    fields: ['name', 'aesthetics', 'mechanics'],
    image: { n: 0 },
  });

  const client = new OpenAIClient();
  await runPipeline({ outputDir: opts.output, entityCount: classList.length, entityType, additionalContext: context }, client);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const opts = parseOptions(rest);

  if (command === 'cards') {
    await generateCards(opts);
  } else if (command === 'persona-buffs') {
    await generatePersonaBuffs(opts);
  } else if (command === 'describe-classes') {
    await describeClasses(opts);
  } else {
    console.error('Commands: cards | persona-buffs | describe-classes');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
