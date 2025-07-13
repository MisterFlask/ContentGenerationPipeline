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
        model: options.model || 'gpt-4o-mini',
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
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
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
        
        if (response.ok) {
          const json = (await response.json()) as any;
          return json.data as { url: string }[];
        }
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const errorText = await response.text();
          console.log(`Rate limit hit (attempt ${attempt + 1}/${maxRetries + 1}), retrying with exponential backoff...`);
          
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
            console.log(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        // Handle safety filter errors
        if (response.status === 400) {
          const errorText = await response.text();
          if (errorText.includes('safety system') || errorText.includes('content_policy_violation')) {
            console.log(`Safety filter rejected prompt: "${prompt}"`);
            console.log(`Skipping image generation for this prompt.`);
            return []; // Return empty array to skip this image
          }
        }
        
        // For other errors, throw immediately
        throw new Error(`OpenAI image error: ${response.status} ${await response.text()}`);
        
      } catch (error) {
        // Only retry network errors, not API errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt === maxRetries) {
            throw error;
          }
          console.log(`Network error (attempt ${attempt + 1}/${maxRetries + 1}), retrying...`);
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // For other errors (like API errors), throw immediately
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded for image generation');
  }
}
