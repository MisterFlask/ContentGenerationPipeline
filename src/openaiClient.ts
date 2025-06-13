interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export class OpenAIClient {
  private apiKey: string;
  private baseUrl: string;
  constructor(apiKey?: string, baseUrl = 'https://api.openai.com/v1') {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.baseUrl = baseUrl;
  }

  async chat(messages: ChatMessage[], options: GenerationOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages,
        temperature: options.temperature ?? 1,
        max_tokens: options.max_tokens ?? 800,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI chat error: ${response.status} ${await response.text()}`);
    }
    const json = (await response.json()) as any;
    return json.choices[0].message.content as string;
  }

  async createImage(prompt: string, n = 1, size = '1024x1024', style = 'vivid'): Promise<{ url: string }[]> {
    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n,
        size,
        style,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI image error: ${response.status} ${await response.text()}`);
    }
    const json = (await response.json()) as any;
    return json.data as { url: string }[];
  }
}
