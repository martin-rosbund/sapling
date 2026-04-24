import { createHash } from 'node:crypto';
import { EntityManager } from '@mikro-orm/core';
import { Injectable, Optional } from '@nestjs/common';
import { TicketItem } from '../../entity/TicketItem';
import { TicketSearchDocumentItem } from '../../entity/TicketSearchDocumentItem';
import { TicketSearchEmbeddingService } from './ticket-search-embedding.service';

type TicketSearchSource = Pick<
  TicketItem,
  | 'handle'
  | 'number'
  | 'externalNumber'
  | 'title'
  | 'problemDescription'
  | 'solutionDescription'
  | 'createdAt'
  | 'updatedAt'
>;

export type TicketSearchBackfillOptions = {
  batchSize?: number;
  limit?: number;
  force?: boolean;
  includeEmbeddings?: boolean;
  providerHandle?: string;
  model?: string;
};

export type TicketSearchBackfillResult = {
  processed: number;
  created: number;
  updated: number;
  skipped: number;
};

@Injectable()
export class TicketSearchIndexService {
  constructor(
    private readonly em: EntityManager,
    @Optional()
    private readonly embeddingService?: TicketSearchEmbeddingService,
  ) {}

  async upsertTicket(ticket: TicketSearchSource): Promise<void> {
    const ticketHandle = this.asTicketHandle(ticket.handle);

    if (ticketHandle == null) {
      return;
    }

    const payload = this.buildDocumentPayload(ticket);
    const existingDocument = await this.em.findOne(TicketSearchDocumentItem, {
      ticket: { handle: ticketHandle },
    });

    await this.upsertTicketDocument(
      ticketHandle,
      payload,
      existingDocument,
      true,
      this.embeddingService?.shouldGenerateSyncEmbeddings() === true,
    );
    await this.em.flush();
  }

  async backfillTickets(
    options: TicketSearchBackfillOptions = {},
  ): Promise<TicketSearchBackfillResult> {
    const batchSize = this.normalizeBatchSize(options.batchSize);
    const limit = this.normalizeLimit(options.limit);
    const force = options.force === true;
    const includeEmbeddings = options.includeEmbeddings !== false;
    const providerHandle = options.providerHandle?.trim() || undefined;
    const model = options.model?.trim() || undefined;
    let cursorHandle = 0;
    let remaining = limit;
    const result: TicketSearchBackfillResult = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
    };

    while (remaining == null || remaining > 0) {
      const currentBatchSize =
        remaining == null ? batchSize : Math.min(batchSize, remaining);
      const tickets = await this.em.find(
        TicketItem,
        { handle: { $gt: cursorHandle } } as never,
        {
          limit: currentBatchSize,
          orderBy: { handle: 'ASC' } as never,
        },
      );

      if (tickets.length === 0) {
        break;
      }

      const ticketHandles = tickets
        .map((ticket) => this.asTicketHandle(ticket.handle))
        .filter((handle): handle is number => handle != null);
      const existingDocuments = ticketHandles.length
        ? await this.em.find(
            TicketSearchDocumentItem,
            { ticket: { handle: { $in: ticketHandles } } } as never,
            { populate: ['ticket'] as never },
          )
        : [];
      const existingDocumentMap = new Map<number, TicketSearchDocumentItem>();

      for (const document of existingDocuments) {
        const handle = this.asTicketHandle(document.ticket?.handle);

        if (handle != null) {
          existingDocumentMap.set(handle, document);
        }
      }

      for (const ticket of tickets) {
        const ticketHandle = this.asTicketHandle(ticket.handle);

        if (ticketHandle == null) {
          continue;
        }

        const payload = this.buildDocumentPayload(ticket);
        const existingDocument = existingDocumentMap.get(ticketHandle) ?? null;
        const upsertState = await this.upsertTicketDocument(
          ticketHandle,
          payload,
          existingDocument,
          force,
          includeEmbeddings,
          providerHandle,
          model,
        );

        result.processed += 1;
        result[upsertState] += 1;
        cursorHandle = ticketHandle;

        if (remaining != null) {
          remaining -= 1;
        }
      }

      await this.em.flush();
      this.em.clear();

      if (tickets.length < currentBatchSize) {
        break;
      }
    }

    return result;
  }

  private upsertTicketDocument(
    ticketHandle: number,
    payload: ReturnType<TicketSearchIndexService['buildDocumentPayload']>,
    existingDocument: TicketSearchDocumentItem | null,
    force: boolean,
    includeEmbeddings: boolean,
    providerHandle?: string,
    model?: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    return this.performUpsertTicketDocument(
      ticketHandle,
      payload,
      existingDocument,
      force,
      includeEmbeddings,
      providerHandle,
      model,
    );
  }

  private async performUpsertTicketDocument(
    ticketHandle: number,
    payload: ReturnType<TicketSearchIndexService['buildDocumentPayload']>,
    existingDocument: TicketSearchDocumentItem | null,
    force: boolean,
    includeEmbeddings: boolean,
    providerHandle?: string,
    model?: string,
  ): Promise<'created' | 'updated' | 'skipped'> {
    if (existingDocument) {
      const contentChanged =
        existingDocument.contentHash !== payload.contentHash;
      const sourceChanged = !this.sameDateValue(
        existingDocument.sourceUpdatedAt,
        payload.sourceUpdatedAt,
      );
      const needsEmbeddingRefresh =
        includeEmbeddings &&
        (contentChanged ||
          force ||
          !Array.isArray(existingDocument.embedding) ||
          existingDocument.embedding.length === 0);

      if (
        !force &&
        !contentChanged &&
        !sourceChanged &&
        !needsEmbeddingRefresh
      ) {
        return 'skipped';
      }

      const embeddingState = await this.resolveEmbeddingState(
        payload.searchText,
        existingDocument,
        includeEmbeddings,
        contentChanged,
        force,
        providerHandle,
        model,
      );

      this.em.assign(existingDocument, {
        ...payload,
        embedding: embeddingState.embedding,
        embeddingModel: embeddingState.embeddingModel,
        embeddingVersion: embeddingState.embeddingVersion,
      });

      return 'updated';
    }

    const embeddingState = await this.resolveEmbeddingState(
      payload.searchText,
      null,
      includeEmbeddings,
      true,
      false,
      providerHandle,
      model,
    );

    this.em.create(TicketSearchDocumentItem, {
      ...payload,
      ticket: { handle: ticketHandle },
      embedding: embeddingState.embedding,
      embeddingModel: embeddingState.embeddingModel,
      embeddingVersion: embeddingState.embeddingVersion,
    } as never);

    return 'created';
  }

  private async resolveEmbeddingState(
    searchText: string,
    existingDocument: TicketSearchDocumentItem | null,
    includeEmbeddings: boolean,
    contentChanged: boolean,
    force: boolean,
    providerHandle?: string,
    model?: string,
  ): Promise<{
    embedding: number[] | null;
    embeddingModel: string | null;
    embeddingVersion: number;
  }> {
    const currentEmbeddingVersion = existingDocument?.embeddingVersion ?? 1;

    if (!includeEmbeddings || !this.embeddingService) {
      return {
        embedding:
          contentChanged || existingDocument == null
            ? null
            : (existingDocument.embedding ?? null),
        embeddingModel:
          contentChanged || existingDocument == null
            ? null
            : (existingDocument.embeddingModel ?? null),
        embeddingVersion: currentEmbeddingVersion,
      };
    }

    const embeddingResult = await this.embeddingService.embedDocument(
      searchText,
      {
        providerHandle,
        model,
      },
    );

    if (!embeddingResult) {
      return {
        embedding:
          contentChanged || existingDocument == null
            ? null
            : (existingDocument.embedding ?? null),
        embeddingModel:
          contentChanged || existingDocument == null
            ? null
            : (existingDocument.embeddingModel ?? null),
        embeddingVersion: currentEmbeddingVersion,
      };
    }

    return {
      embedding: embeddingResult.values,
      embeddingModel: embeddingResult.model,
      embeddingVersion: embeddingResult.version,
    };
  }

  private sameDateValue(
    left: Date | null | undefined,
    right: Date | null | undefined,
  ): boolean {
    if (left == null && right == null) {
      return true;
    }

    if (left == null || right == null) {
      return false;
    }

    return left.getTime() === right.getTime();
  }

  private normalizeBatchSize(value: unknown): number {
    const normalizedValue = this.asPositiveInteger(value);

    if (normalizedValue == null) {
      return 100;
    }

    return Math.min(normalizedValue, 1000);
  }

  private normalizeLimit(value: unknown): number | null {
    const normalizedValue = this.asPositiveInteger(value);

    return normalizedValue ?? null;
  }

  private asPositiveInteger(value: unknown): number | null {
    if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number(value);

      if (Number.isInteger(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }

    return null;
  }

  private buildDocumentPayload(ticket: TicketSearchSource): {
    ticketNumber: string | null;
    externalNumber: string | null;
    title: string | null;
    searchText: string;
    problemText: string | null;
    solutionText: string | null;
    contentHash: string;
    sourceUpdatedAt: Date | null;
    lastIndexedAt: Date;
  } {
    const problemText = this.normalizeText(ticket.problemDescription);
    const solutionText = this.normalizeText(ticket.solutionDescription);
    const ticketNumber = this.normalizeText(ticket.number);
    const externalNumber = this.normalizeText(ticket.externalNumber);
    const title = this.normalizeText(ticket.title);
    const searchText = [
      this.formatLabeledValue('Ticket', ticketNumber),
      this.formatLabeledValue('Extern', externalNumber),
      this.formatLabeledValue('Titel', title),
      this.formatLabeledValue('Problem', problemText),
      this.formatLabeledValue('Loesung', solutionText),
    ]
      .filter((part): part is string => part != null)
      .join('\n\n');

    return {
      ticketNumber,
      externalNumber,
      title,
      searchText,
      problemText,
      solutionText,
      contentHash: this.createContentHash(
        ticketNumber,
        externalNumber,
        title,
        searchText,
        problemText,
        solutionText,
      ),
      sourceUpdatedAt: ticket.updatedAt ?? ticket.createdAt ?? null,
      lastIndexedAt: new Date(),
    };
  }
  private createContentHash(...parts: Array<string | null>): string {
    const hash = createHash('sha256');

    for (const part of parts) {
      hash.update(part ?? '');
      hash.update('\u0000');
    }

    return hash.digest('hex');
  }

  private formatLabeledValue(
    label: string,
    value: string | null | undefined,
  ): string | null {
    const normalizedValue = this.normalizeText(value);

    return normalizedValue ? `${label}: ${normalizedValue}` : null;
  }

  private normalizeText(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalizedValue = value.replace(/\r\n/g, '\n').trim();

    return normalizedValue.length > 0 ? normalizedValue : null;
  }

  private asTicketHandle(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : null;
  }
}
