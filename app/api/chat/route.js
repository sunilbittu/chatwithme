import { createOpenAI } from '@ai-sdk/openai';
import {
  convertToCoreMessages,
  createDataStreamResponse,
  streamText,
  tool,
} from 'ai';
import { z } from 'zod';

export const runtime = 'edge';
export const maxDuration = 60;

const nvidia = createOpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

export async function POST(req) {
  const { messages } = await req.json();

  return createDataStreamResponse({
    execute: (dataStream) => {
      const generateImage = tool({
        description:
          'Generate an image from a text prompt. Use this whenever the user asks to draw, create, generate, render, or make an image, picture, photo, or artwork.',
        parameters: z.object({
          prompt: z
            .string()
            .describe(
              'A vivid, detailed visual description: subject, style, lighting, composition.'
            ),
        }),
        execute: async ({ prompt }, { toolCallId }) => {
          const res = await fetch(
            'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify({
                prompt,
                width: 1024,
                height: 1024,
                steps: 4,
                cfg_scale: 0,
                seed: Math.floor(Math.random() * 1_000_000),
                samples: 1,
              }),
            }
          );

          if (!res.ok) {
            const text = await res.text();
            return {
              error: `Image generation failed (${res.status}): ${text.slice(0, 200)}`,
            };
          }

          const data = await res.json();
          const base64 =
            data.artifacts?.[0]?.base64 || data.image || data.images?.[0];
          if (!base64) {
            return { error: 'Image generation returned no image data.' };
          }

          dataStream.writeMessageAnnotation({
            type: 'generated-image',
            toolCallId,
            imageUrl: `data:image/png;base64,${base64}`,
          });

          return {
            prompt,
            status: 'Image generated and rendered to the user.',
          };
        },
      });

      const result = streamText({
        model: nvidia(
          process.env.NVIDIA_MODEL ||
            'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'
        ),
        system:
          'Your name is Dasu. When asked your name, who you are, or what you are called, reply that you are Dasu. Do not mention NVIDIA, Nemotron, or any underlying model. ' +
          'When the user asks for an image, picture, drawing, or artwork, call the generateImage tool with a rich descriptive prompt. ' +
          'After the tool runs, respond with a single short caption (one sentence). NEVER include URLs, markdown image syntax like ![...](...), or base64 data in your response — the image is already shown to the user automatically.',
        messages: convertToCoreMessages(messages),
        tools: { generateImage },
        maxSteps: 3,
        temperature: 0.6,
        topP: 0.95,
        maxTokens: 4096,
      });

      result.mergeIntoDataStream(dataStream, { sendReasoning: true });
    },
  });
}
