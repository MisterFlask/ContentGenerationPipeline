import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { EntityType } from './EntityType';
import { OpenAIClient } from './openaiClient';
import { toYAML } from './yamlUtil';

export interface PipelineConfig {
  outputDir: string;
  entityCount: number;
  entityType: EntityType;
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
  const prompt = `You are generating ${cfg.entityType.name} data. Each entity has the following fields:\n${fields}\n${examplesSection}\nGenerate ${cfg.entityCount} items in JSON format.`;

  const completion = await client.chat([
    { role: 'system', content: 'You are a content generation assistant. Always respond with valid JSON only, no markdown formatting.' },
    { role: 'user', content: prompt },
  ]);

  // Clean up the response to extract JSON
  let jsonContent = completion.trim();
  
  // Remove markdown code blocks if present
  if (jsonContent.startsWith('```json')) {
    jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonContent.startsWith('```')) {
    jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  let doc = JSON.parse(jsonContent);

  // Robustly extract array of items
  if (!Array.isArray(doc)) {
    // If it's an object with a single array property, use that
    const arrayProps = Object.entries(doc).filter(([k, v]) => Array.isArray(v));
    if (arrayProps.length === 1) {
      doc = arrayProps[0][1];
    } else if (arrayProps.length > 1) {
      // If multiple array properties, pick the first and warn
      console.warn('Multiple array properties found in LLM response, using the first:', arrayProps.map(([k]) => k));
      doc = arrayProps[0][1];
    } else {
      // Log for debugging
      console.error('Parsed LLM response is not an array or object with array property:', doc);
      throw new Error('LLM response is not an array or object with array property.');
    }
  }

  const yamlPath = join(cfg.outputDir, `${cfg.entityType.name.toLowerCase()}.yaml`);

  let idx = 0;
  for (const item of doc) {
    const baseName = `${cfg.entityType.name.toLowerCase()}_${idx}`;
    const imagePrompt = item.image_description || `Image for ${item.name}`;
    
    // Apply standardized art style requirements
    const artStylePrefix = "Black and white icon design, high contrast, no grays, minimalist, evocative, readable at small sizes, clean lines, simple shapes, ";
    const fullImagePrompt = artStylePrefix + imagePrompt;
    
    // Generate 2 candidate images per card
    const imagePromises = [];
    for (let i = 0; i < 2; i++) {
      const imagePromise = client.createImage(
        fullImagePrompt,
        1, // DALL-E 3 only supports n=1
        cfg.entityType.image.size,
        cfg.entityType.image.style,
      );
      imagePromises.push(imagePromise);
    }
    
    const imageResults = await Promise.all(imagePromises);
    const imageNames = [];
    
    // Download and save each image
    for (let i = 0; i < imageResults.length; i++) {
      const images = imageResults[i];
      if (images.length > 0) {
        const fname = `${baseName}_candidate_${i + 1}.png`;
        const dest = join(imagesDir, fname);
        fetch(images[0].url)
          .then((res: any) => res.arrayBuffer())
          .then((buff: ArrayBuffer) => {
            writeFileSync(dest, Buffer.from(buff));
          });
        imageNames.push(fname);
      } else {
        console.log(`No image generated for candidate ${i + 1} of ${item.name || 'unnamed item'}`);
      }
    }
    
    // Store all image names in the item
    item['image_names'] = imageNames;
    idx++;
  }

  writeFileSync(yamlPath, toYAML(doc), 'utf-8');
}

if (require.main === module) {
  // Generate timestamped output directory
  const now = new Date();
  const timestamp = now.getFullYear().toString() +
    (now.getMonth() + 1).toString().padStart(2, '0') +
    now.getDate().toString().padStart(2, '0') + '_' +
    now.getHours().toString().padStart(2, '0') +
    now.getMinutes().toString().padStart(2, '0');
  const outputDir = `./output/${timestamp}`;
  
  const entityType = new EntityType({
    name: 'Card',
    description: 'A card entity for a card game.',
    fields: ['name', 'effect', 'image_description', 'image_names'],
    examples: '- name: Fireball\n  effect: Deal 3 damage to all enemies\n  image_description: A blazing fireball',
    image: { n: 1, size: '1024x1024', style: 'vivid' },
  });
  const cfg: PipelineConfig = {
    outputDir,
    entityCount: 5,
    entityType,
  };
  const client = new OpenAIClient();
  runPipeline(cfg, client).catch(err => console.error(err));
}
