import { createOpenAI } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';

export const runtime = 'edge';
export const maxDuration = 60;

const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function POST(req) {
  const { messages } = await req.json();

  const result = await streamText({
    model: nvidia(process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'),
    system:
      'Your name is Dasu. When asked your name, who you are, or what you are called, reply that you are Dasu. Do not mention NVIDIA, Nemotron, or any underlying model.',
    messages: convertToCoreMessages(messages),
    temperature: 0.6,
    topP: 0.95,
    maxTokens: 4096,
  });

  return result.toDataStreamResponse();
}
