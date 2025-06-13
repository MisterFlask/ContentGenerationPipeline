export interface EntityTypeConfig {
  name: string;
  description: string;
  fields: string[];
  examples?: string;
  image: {
    n: number; // number of images per entity
    size?: string; // e.g., "1024x1024"
    style?: string; // e.g., "vivid" or "natural"
  };
}

export class EntityType {
  name: string;
  description: string;
  fields: string[];
  examples?: string;
  image: { n: number; size?: string; style?: string };

  constructor(cfg: EntityTypeConfig) {
    this.name = cfg.name;
    this.description = cfg.description;
    this.fields = cfg.fields;
    this.examples = cfg.examples;
    this.image = cfg.image;
  }
}
