import { createHash } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import type { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import type { TicketItem } from '../../entity/TicketItem';
import type { AiVectorDocumentDraft, AiVectorDocumentRow } from './ai.types';

export function assertVectorizableEntity(entityHandle: string): void {
  if (entityHandle === 'ticket') {
    return;
  }

  throw new BadRequestException('ai.vectorizationUnsupportedEntity');
}

export function createTicketVectorSectionDocuments(
  sourceRecordHandle: string,
  sourceSection: string,
  content: string,
  title: string | null,
  metadata: Record<string, unknown>,
  embeddingModel: AiProviderModelItem,
): AiVectorDocumentDraft[] {
  const chunks = chunkVectorContent(content, embeddingModel);

  return chunks.map((chunk, index) => ({
    sourceRecordHandle,
    sourceSection,
    chunkIndex: index,
    title,
    content: chunk,
    contentHash: hashVectorContent(chunk),
    metadata: {
      ...metadata,
      section: sourceSection,
      chunkIndex: index,
    },
  }));
}

export function buildTicketSectionContent(
  ticket: TicketItem,
  section: 'overview' | 'problem' | 'solution',
): string {
  const lines = [
    `Ticket: ${ticket.number?.trim() || ticket.handle || ''}`.trim(),
    ticket.externalNumber?.trim()
      ? `External ticket number: ${ticket.externalNumber.trim()}`
      : null,
    ticket.title?.trim() ? `Title: ${ticket.title.trim()}` : null,
    ticket.status && typeof ticket.status !== 'string'
      ? `Status: ${ticket.status.description}`
      : null,
    ticket.priority && typeof ticket.priority !== 'string'
      ? `Priority: ${ticket.priority.description}`
      : null,
    ticket.creatorCompany &&
    typeof ticket.creatorCompany !== 'string' &&
    'name' in ticket.creatorCompany
      ? `Creator company: ${String(ticket.creatorCompany.name ?? '').trim()}`
      : null,
    ticket.creatorPerson &&
    typeof ticket.creatorPerson !== 'string' &&
    'firstName' in ticket.creatorPerson
      ? `Creator person: ${buildPersonLabel(
          ticket.creatorPerson.firstName,
          ticket.creatorPerson.lastName,
          ticket.creatorPerson.email,
        )}`
      : null,
    ticket.assigneeCompany &&
    typeof ticket.assigneeCompany !== 'string' &&
    'name' in ticket.assigneeCompany
      ? `Assignee company: ${String(ticket.assigneeCompany.name ?? '').trim()}`
      : null,
    ticket.assigneePerson &&
    typeof ticket.assigneePerson !== 'string' &&
    'firstName' in ticket.assigneePerson
      ? `Assignee person: ${buildPersonLabel(
          ticket.assigneePerson.firstName,
          ticket.assigneePerson.lastName,
          ticket.assigneePerson.email,
        )}`
      : null,
    null,
  ].filter((line): line is string => !!line && line.trim().length > 0);

  if (section === 'overview') {
    lines.push('Section: Overview');
    const summaryLines = [
      ticket.problemDescription?.trim()
        ? `Problem summary: ${summarizeVectorText(ticket.problemDescription)}`
        : null,
      ticket.solutionDescription?.trim()
        ? `Solution summary: ${summarizeVectorText(ticket.solutionDescription)}`
        : null,
    ].filter((line): line is string => !!line && line.trim().length > 0);

    lines.push(...summaryLines);
    return lines.join('\n');
  }

  const sectionLabel =
    section === 'problem' ? 'Problem description' : 'Solution description';
  const sectionBody =
    section === 'problem'
      ? (ticket.problemDescription?.trim() ?? '')
      : (ticket.solutionDescription?.trim() ?? '');

  if (!sectionBody) {
    return '';
  }

  lines.push(`Section: ${sectionLabel}`);
  lines.push(sectionBody);
  return lines.join('\n');
}

export function buildTicketVectorMetadata(
  ticket: TicketItem,
): Record<string, unknown> {
  return {
    ticketHandle: ticket.handle ?? null,
    ticketNumber: ticket.number?.trim() || null,
    externalNumber: ticket.externalNumber?.trim() || null,
    title: ticket.title?.trim() || null,
    status:
      ticket.status && typeof ticket.status !== 'string'
        ? ticket.status.description
        : null,
    priority:
      ticket.priority && typeof ticket.priority !== 'string'
        ? ticket.priority.description
        : null,
    creatorCompany:
      ticket.creatorCompany &&
      typeof ticket.creatorCompany !== 'string' &&
      'name' in ticket.creatorCompany
        ? ticket.creatorCompany.name
        : null,
    creatorPerson:
      ticket.creatorPerson &&
      typeof ticket.creatorPerson !== 'string' &&
      'firstName' in ticket.creatorPerson
        ? buildPersonLabel(
            ticket.creatorPerson.firstName,
            ticket.creatorPerson.lastName,
            ticket.creatorPerson.email,
          )
        : null,
    assigneeCompany:
      ticket.assigneeCompany &&
      typeof ticket.assigneeCompany !== 'string' &&
      'name' in ticket.assigneeCompany
        ? ticket.assigneeCompany.name
        : null,
    assigneePerson:
      ticket.assigneePerson &&
      typeof ticket.assigneePerson !== 'string' &&
      'firstName' in ticket.assigneePerson
        ? buildPersonLabel(
            ticket.assigneePerson.firstName,
            ticket.assigneePerson.lastName,
            ticket.assigneePerson.email,
          )
        : null,
  };
}

export function buildPersonLabel(
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string {
  const fullName = [firstName, lastName]
    .filter(
      (part): part is string =>
        typeof part === 'string' && part.trim().length > 0,
    )
    .join(' ')
    .trim();

  return fullName || email?.trim() || '';
}

export function summarizeVectorText(
  value?: string | null,
  maxLength = 240,
): string {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function resolveEmbeddingBatchSize(
  model?: AiProviderModelItem | null,
): number {
  const value = model?.embeddingBatchSize;

  return Number.isFinite(value) && value != null && value > 0
    ? Math.max(1, Math.floor(value))
    : 32;
}

export function resolveVectorChunkLength(
  model?: AiProviderModelItem | null,
): number {
  const value = model?.vectorChunkLength;

  return Number.isFinite(value) && value != null && value > 0
    ? Math.max(200, Math.floor(value))
    : 1200;
}

export function resolveVectorChunkOverlap(
  model?: AiProviderModelItem | null,
  chunkLength = resolveVectorChunkLength(model),
): number {
  const value = model?.vectorChunkOverlap;
  const normalizedValue =
    Number.isFinite(value) && value != null && value >= 0
      ? Math.floor(value)
      : 200;

  return Math.max(0, Math.min(normalizedValue, Math.max(chunkLength - 1, 0)));
}

export function resolveVectorSearchCandidateMultiplier(
  model?: AiProviderModelItem | null,
): number {
  const value = model?.vectorSearchCandidateMultiplier;

  return Number.isFinite(value) && value != null && value > 0
    ? Math.max(1, Math.floor(value))
    : 6;
}

export function resolveVectorSearchMaxCandidateLimit(
  model?: AiProviderModelItem | null,
): number {
  const value = model?.vectorSearchMaxCandidateLimit;

  return Number.isFinite(value) && value != null && value > 0
    ? Math.max(1, Math.floor(value))
    : 60;
}

export function resolveVectorSearchMaxResults(
  model?: AiProviderModelItem | null,
): number {
  const value = model?.vectorSearchMaxResults;

  return Number.isFinite(value) && value != null && value > 0
    ? Math.max(1, Math.floor(value))
    : 10;
}

export function chunkVectorContent(
  content: string,
  embeddingModel: AiProviderModelItem,
): string[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const chunkLength = resolveVectorChunkLength(embeddingModel);
  const chunkOverlap = resolveVectorChunkOverlap(embeddingModel, chunkLength);

  if (!normalized) {
    return [];
  }

  if (normalized.length <= chunkLength) {
    return [normalized];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkLength, normalized.length);

    if (end < normalized.length) {
      const slice = normalized.slice(start, end);
      const preferredBreakpoints = [
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf(' '),
      ].filter((value) => value >= Math.floor(chunkLength * 0.6));

      if (preferredBreakpoints.length > 0) {
        end = start + Math.max(...preferredBreakpoints) + 1;
      }
    }

    const chunk = normalized.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    start = Math.max(end - chunkOverlap, start + 1);

    while (start < normalized.length && /\s/.test(normalized[start] ?? '')) {
      start += 1;
    }
  }

  return [...new Set(chunks)];
}

export function hashVectorContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function buildVectorDocumentKey(
  row:
    | Pick<
        AiVectorDocumentRow,
        'source_record_handle' | 'source_section' | 'chunk_index'
      >
    | Pick<
        AiVectorDocumentDraft,
        'sourceRecordHandle' | 'sourceSection' | 'chunkIndex'
      >,
): string {
  if ('source_record_handle' in row) {
    return `${row.source_record_handle}:${row.source_section}:${row.chunk_index}`;
  }

  return `${row.sourceRecordHandle}:${row.sourceSection}:${row.chunkIndex}`;
}

export function toVectorLiteral(embedding: number[]): string {
  if (embedding.length === 0) {
    throw new Error('ai.vectorEmbeddingFailed');
  }

  return `[${embedding.map((value) => Number(value).toString()).join(',')}]`;
}

export function coerceVectorRecordHandle(value: string): string | number {
  return /^\d+$/.test(value) ? Number(value) : value;
}

export function buildVectorExcerpt(content: string, maxLength = 280): string {
  const normalized = content.replace(/\s+/g, ' ').trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

export function asSimilarityScore(value: number | string): number {
  const numericValue =
    typeof value === 'number' ? value : Number.parseFloat(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numericValue));
}
