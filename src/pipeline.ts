import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { EntityType } from './EntityType';
import { OpenAIClient } from './openaiClient';
import { toYAML } from './yamlUtil';

export interface PipelineConfig {
  outputDir: string;
  entityCount: number;
  entityType: EntityType;
  additionalContext?: string;
}

export async function runPipeline(cfg: PipelineConfig, client: OpenAIClient) {
  mkdirSync(cfg.outputDir, { recursive: true });
  const imagesDir = join(cfg.outputDir, 'images');
  mkdirSync(imagesDir, { recursive: true });

  const fields = cfg.entityType.fields.map(f => `- ${f}`).join('\n');
  let examplesSection = '';
  if (cfg.entityType.examples) {
    examplesSection = `Here are some examples:\n${cfg.entityType.examples}`;
  }
  let prompt = `You are generating ${cfg.entityType.name} data. Each entity has the following fields:\n${fields}\n${examplesSection}`;
  if (cfg.additionalContext) {
    prompt += `\n${cfg.additionalContext}`;
  }
  prompt += `\nGenerate ${cfg.entityCount} items in JSON format.`;

  const completion = await client.chat([
    { role: 'system', content: 'You are a content generation assistant.' },
    { role: 'user', content: prompt },
  ]);

  const doc = JSON.parse(completion.trim());

  const yamlPath = join(cfg.outputDir, `${cfg.entityType.name.toLowerCase()}.yaml`);

  let idx = 0;
  for (const item of doc) {
    const baseName = `${cfg.entityType.name.toLowerCase()}_${idx}`;
    if (cfg.entityType.image.n > 0) {
      const imagePrompt = item.image_description || `Image for ${item.name}`;
      const images = await client.createImage(
        imagePrompt,
        cfg.entityType.image.n,
        cfg.entityType.image.size,
        cfg.entityType.image.style,
      );
      images.forEach((img, i) => {
        const fname = `${baseName}_${i}.png`;
        const dest = join(imagesDir, fname);
        fetch(img.url)
          .then((res: any) => res.arrayBuffer())
          .then((buff: ArrayBuffer) => {
            writeFileSync(dest, Buffer.from(buff));
          });
        const key = cfg.entityType.image.n > 1 ? 'image_names' : 'image_name';
        item[key] ||= [];
        item[key].push(fname);
      });
    }
    idx++;
  }

  writeFileSync(yamlPath, toYAML(doc), 'utf-8');
}

if (require.main === module) {
  const entityType = new EntityType({
    name: 'Card',
    description: 'A card entity for a card game.',
    fields: ['name', 'effect', 'image_description', 'image_name'],
    examples: '- name: Fireball\n  effect: Deal 3 damage to all enemies\n  image_description: A blazing fireball',
    image: { n: 3, size: '1024x1024', style: 'vivid' },
  });
  const cfg: PipelineConfig = {
    outputDir: './output',
    entityCount: 5,
    entityType,
  };
  const client = new OpenAIClient();
  runPipeline(cfg, client).catch(err => console.error(err));
}
