import type { DocumentItem } from '../../entity/DocumentItem';
import type { AiChatMessageItem } from '../../entity/AiChatMessageItem';
import type {
  AiChatMessageSpeechDescriptor,
  AiChatMessageSpeechPayload,
  AiPreparedSpeechText,
} from './ai.types';

export function normalizeAssistantSpeechText(content: string): string {
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

  return normalized;
}

export function prepareAssistantSpeechText(
  content: string,
  maxInputLength: number,
): AiPreparedSpeechText {
  const normalized = normalizeAssistantSpeechText(content);

  if (!normalized) {
    return {
      text: '',
      sourceTextLength: 0,
      wasTruncated: false,
    };
  }

  if (normalized.length <= maxInputLength) {
    return {
      text: normalized,
      sourceTextLength: normalized.length,
      wasTruncated: false,
    };
  }

  const truncationSuffix = ' Antwort gekuerzt.';
  const truncatedText = `${normalized
    .slice(0, maxInputLength - truncationSuffix.length)
    .trimEnd()}${truncationSuffix}`;

  return {
    text: truncatedText,
    sourceTextLength: normalized.length,
    wasTruncated: true,
  };
}

export function buildAssistantSpeechFilename(
  message: AiChatMessageItem,
  fileExtension: string,
): string {
  return `songbird-message-${message.handle ?? 'reply'}.${fileExtension}`;
}

export function buildAssistantSpeechDescription(
  message: AiChatMessageItem,
): string {
  const pageTitle = message.pageTitle?.trim();
  const parts = [
    'Songbird audio reply',
    message.handle ? `message ${message.handle}` : null,
    message.session?.handle ? `session ${message.session.handle}` : null,
    pageTitle ? `page ${pageTitle}` : null,
    new Date().toISOString(),
  ];

  return parts
    .filter((part): part is string => !!part)
    .join(' | ')
    .slice(0, 256);
}

export function buildAssistantSpeechPayload(
  preparedSpeechText: AiPreparedSpeechText,
  document: DocumentItem,
  speechDescriptor: AiChatMessageSpeechDescriptor,
): AiChatMessageSpeechPayload {
  return {
    status: 'completed',
    providerHandle: speechDescriptor.providerHandle,
    model: speechDescriptor.model,
    voice: speechDescriptor.voice,
    speed: speechDescriptor.speed,
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
  speechDescriptor: AiChatMessageSpeechDescriptor,
): AiChatMessageSpeechPayload {
  return {
    status: 'failed',
    providerHandle: speechDescriptor.providerHandle,
    model: speechDescriptor.model,
    voice: speechDescriptor.voice,
    speed: speechDescriptor.speed,
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
