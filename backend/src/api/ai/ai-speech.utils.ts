import type { DocumentItem } from '../../entity/DocumentItem';
import type { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import {
  AI_ASSISTANT_SPEECH_FILE_EXTENSION,
  AI_ASSISTANT_SPEECH_MAX_INPUT_LENGTH,
  AI_ASSISTANT_SPEECH_MODEL,
  AI_ASSISTANT_SPEECH_PROVIDER_HANDLE,
  AI_ASSISTANT_SPEECH_SPEED,
  AI_ASSISTANT_SPEECH_VOICE,
} from '../../constants/project.constants';
import type {
  AiChatMessageSpeechPayload,
  AiPreparedSpeechText,
} from './ai.types';

export function prepareAssistantSpeechText(
  content: string,
): AiPreparedSpeechText {
  const withoutCodeBlocks = content.replace(
    /```[\s\S]*?```/g,
    ' Codebeispiel ausgelassen. ',
  );
  const withoutImages = withoutCodeBlocks.replace(/!\[[^\]]*]\([^)]*\)/g, ' ');
  const withoutLinks = withoutImages.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1');
  const withoutRawUrls = withoutLinks.replace(/https?:\/\/\S+/g, ' ');
  const withoutInlineCode = withoutRawUrls.replace(/`([^`]+)`/g, '$1');
  const withoutHeadings = withoutInlineCode.replace(/^\s{0,3}#{1,6}\s*/gm, '');
  const withoutBullets = withoutHeadings.replace(/^\s*([-*+]|\d+\.)\s+/gm, '');
  const normalized = withoutBullets
    .replace(/[>*_~|]/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return {
      text: '',
      sourceTextLength: 0,
      wasTruncated: false,
    };
  }

  if (normalized.length <= AI_ASSISTANT_SPEECH_MAX_INPUT_LENGTH) {
    return {
      text: normalized,
      sourceTextLength: normalized.length,
      wasTruncated: false,
    };
  }

  const truncationSuffix = ' Antwort gekuerzt.';
  const truncatedText = `${normalized
    .slice(0, AI_ASSISTANT_SPEECH_MAX_INPUT_LENGTH - truncationSuffix.length)
    .trimEnd()}${truncationSuffix}`;

  return {
    text: truncatedText,
    sourceTextLength: normalized.length,
    wasTruncated: true,
  };
}

export function buildAssistantSpeechFilename(
  message: AiChatMessageItem,
): string {
  return `songbird-message-${message.handle ?? 'reply'}.${AI_ASSISTANT_SPEECH_FILE_EXTENSION}`;
}

export function buildAssistantSpeechDescription(
  message: AiChatMessageItem,
): string {
  const pageTitle = message.pageTitle?.trim();
  return pageTitle
    ? `Songbird audio reply for ${pageTitle}`
    : 'Songbird audio reply';
}

export function buildAssistantSpeechPayload(
  preparedSpeechText: AiPreparedSpeechText,
  document: DocumentItem,
  providerHandle: string | null,
): AiChatMessageSpeechPayload {
  return {
    status: 'completed',
    providerHandle,
    model: AI_ASSISTANT_SPEECH_MODEL,
    voice: AI_ASSISTANT_SPEECH_VOICE,
    speed: AI_ASSISTANT_SPEECH_SPEED,
    documentHandle: document.handle,
    mimeType: document.mimetype,
    filename: document.filename,
    sourceTextLength: preparedSpeechText.sourceTextLength,
    wasTruncated: preparedSpeechText.wasTruncated,
    generatedAt: new Date().toISOString(),
    error: null,
  };
}

export function buildAssistantSpeechFailurePayload(
  preparedSpeechText: AiPreparedSpeechText,
  error: unknown,
): AiChatMessageSpeechPayload {
  return {
    status: 'failed',
    providerHandle: AI_ASSISTANT_SPEECH_PROVIDER_HANDLE,
    model: AI_ASSISTANT_SPEECH_MODEL,
    voice: AI_ASSISTANT_SPEECH_VOICE,
    speed: AI_ASSISTANT_SPEECH_SPEED,
    documentHandle: null,
    mimeType: null,
    filename: null,
    sourceTextLength: preparedSpeechText.sourceTextLength,
    wasTruncated: preparedSpeechText.wasTruncated,
    generatedAt: new Date().toISOString(),
    error:
      error instanceof Error && error.message.trim()
        ? error.message
        : 'ai.speechGenerationFailed',
  };
}
