import { OpenAI, toFile } from 'openai';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { AiSpeechResponseFormat } from './ai.types';

const OPENAI_API_KEY_CREDENTIAL = 'openAiApiKey';

export function createOpenAiClient(provider: AiProviderTypeItem): OpenAI {
  const apiKey = getOpenAiApiKey(provider);

  if (!apiKey) {
    throw new Error('ai.providerNotConfigured');
  }

  return new OpenAI({ apiKey });
}

export function getOpenAiApiKey(provider: AiProviderTypeItem): string | null {
  return getProviderCredential(provider, OPENAI_API_KEY_CREDENTIAL);
}

export function hasOpenAiCredentials(provider: AiProviderTypeItem): boolean {
  return getOpenAiApiKey(provider) != null;
}

export async function embedOpenAiTexts(
  provider: AiProviderTypeItem,
  model: string,
  texts: string[],
): Promise<number[][]> {
  const response = await createOpenAiClient(provider).embeddings.create({
    model,
    input: texts,
    encoding_format: 'float',
  });

  return response.data
    .sort((left, right) => left.index - right.index)
    .map((item) => item.embedding);
}

export async function transcribeOpenAiAudio(options: {
  provider: AiProviderTypeItem;
  model: string;
  fileBuffer: Buffer;
  originalname: string;
  mimetype: string;
  language?: string;
}) {
  return createOpenAiClient(options.provider).audio.transcriptions.create({
    file: await toFile(options.fileBuffer, options.originalname, {
      type: options.mimetype,
    }),
    model: options.model,
    language: options.language?.trim() || undefined,
    response_format: 'verbose_json',
  });
}

export async function synthesizeOpenAiSpeech(options: {
  provider: AiProviderTypeItem;
  model: string;
  voice: string;
  input: string;
  responseFormat: AiSpeechResponseFormat;
  instructions?: string;
  speed?: number;
}): Promise<Buffer> {
  const response = await createOpenAiClient(
    options.provider,
  ).audio.speech.create({
    model: options.model,
    voice: options.voice,
    input: options.input,
    response_format: options.responseFormat,
    instructions: options.instructions,
    speed: options.speed,
  });

  return Buffer.from(await response.arrayBuffer());
}

function getProviderCredential(
  provider: AiProviderTypeItem,
  key: string,
): string | null {
  const credentials = provider.credentials;

  if (!credentials || typeof credentials !== 'object') {
    return null;
  }

  const value = credentials[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
