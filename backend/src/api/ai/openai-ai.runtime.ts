import { OpenAI, toFile } from 'openai';
import type { AiProviderTypeItem } from '../../entity/AiProviderTypeItem';
import type { AiSpeechResponseFormat } from './ai.types';

const OPENAI_API_KEY_CREDENTIAL = 'openAiApiKey';
const OPENAI_BASE_URL_CREDENTIAL = 'openAiBaseUrl';
const LM_STUDIO_API_KEY_CREDENTIAL = 'lmStudioApiKey';
const LM_STUDIO_BASE_URL_CREDENTIAL = 'lmStudioBaseUrl';
const LOCAL_OPENAI_COMPATIBLE_API_KEY = 'sapling-local';

export function createOpenAiClient(provider: AiProviderTypeItem): OpenAI {
  const baseURL = getOpenAiBaseUrl(provider);
  const apiKey = baseURL
    ? getOpenAiCompatibleApiKey(provider)
    : getOpenAiApiKey(provider);

  if (!apiKey) {
    throw new Error('ai.providerNotConfigured');
  }

  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
}

export function getOpenAiApiKey(provider: AiProviderTypeItem): string | null {
  return getProviderCredential(provider, OPENAI_API_KEY_CREDENTIAL);
}

export function getOpenAiBaseUrl(provider: AiProviderTypeItem): string | null {
  const baseUrl =
    getProviderCredential(provider, OPENAI_BASE_URL_CREDENTIAL) ??
    getProviderCredential(provider, LM_STUDIO_BASE_URL_CREDENTIAL);

  return baseUrl ? normalizeOpenAiBaseUrl(baseUrl) : null;
}

export function hasOpenAiCredentials(provider: AiProviderTypeItem): boolean {
  return getOpenAiApiKey(provider) != null;
}

export function hasOpenAiCompatibleCredentials(
  provider: AiProviderTypeItem,
): boolean {
  return getOpenAiBaseUrl(provider) != null;
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

function getOpenAiCompatibleApiKey(provider: AiProviderTypeItem): string {
  return (
    getOpenAiApiKey(provider) ??
    getProviderCredential(provider, LM_STUDIO_API_KEY_CREDENTIAL) ??
    LOCAL_OPENAI_COMPATIBLE_API_KEY
  );
}

function normalizeOpenAiBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}
