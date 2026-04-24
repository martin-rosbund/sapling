import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/TicketSearchDocumentItem', () => ({
  TicketSearchDocumentItem: class {},
}));
jest.mock('../../entity/TicketItem', () => ({
  TicketItem: class {},
}));

import { TicketSearchIndexService } from './ticket-search-index.service';

describe('TicketSearchIndexService', () => {
  it('creates a new search document for a ticket', async () => {
    const createdDocuments: object[] = [];
    const em = {
      findOne: jest.fn().mockResolvedValue(null),
      getReference: jest.fn((_entityName: string, handle: number) => ({ handle })),
      create: jest.fn((_entity: unknown, data: object) => {
        createdDocuments.push(data);
        return data;
      }),
      flush: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TicketSearchIndexService(em as never);

    await service.upsertTicket({
      handle: 7,
      number: '2026#00007',
      externalNumber: 'SAGE-77',
      title: 'Sage 100 Fehler',
      problemDescription: 'Beim Buchen erscheint ein Timeout.',
      solutionDescription: 'Mandantenservice neu starten.',
      createdAt: new Date('2026-04-24T08:00:00.000Z'),
      updatedAt: new Date('2026-04-24T09:00:00.000Z'),
    } as never);

    expect(em.findOne).toHaveBeenCalledWith(expect.any(Function), {
      ticket: { handle: 7 },
    });
    expect(em.create).toHaveBeenCalledWith(expect.any(Function),
      expect.objectContaining({
        ticket: { handle: 7 },
        problemText: 'Beim Buchen erscheint ein Timeout.',
        solutionText: 'Mandantenservice neu starten.',
      }),
    );
    expect(createdDocuments[0]).toMatchObject({
      ticket: { handle: 7 },
      searchText: expect.stringContaining('Titel: Sage 100 Fehler'),
      contentHash: expect.any(String),
    });
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('resets stale embeddings when the indexed content changes', async () => {
    const existingDocument = {
      contentHash: 'old-hash',
      embedding: [0.1, 0.2],
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: 3,
    };
    const em = {
      findOne: jest.fn().mockResolvedValue(existingDocument),
      assign: jest.fn((_target: object, data: object) => data),
      flush: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TicketSearchIndexService(em as never);

    await service.upsertTicket({
      handle: 8,
      title: 'Timeout bei Uebertragung',
      problemDescription: 'Neue Beschreibung',
      solutionDescription: null,
      createdAt: new Date('2026-04-24T08:00:00.000Z'),
      updatedAt: new Date('2026-04-24T09:00:00.000Z'),
    } as never);

    expect(em.assign).toHaveBeenCalledWith(
      existingDocument,
      expect.objectContaining({
        embedding: null,
        embeddingModel: null,
        embeddingVersion: 3,
      }),
    );
    expect(em.flush).toHaveBeenCalledTimes(1);
  });

  it('backfills tickets in batches and skips unchanged documents by default', async () => {
    const firstTicket = {
      handle: 7,
      number: '2026#00007',
      title: 'Sage 100 Fehler',
      problemDescription: 'Beim Buchen erscheint ein Timeout.',
      solutionDescription: 'Mandantenservice neu starten.',
      createdAt: new Date('2026-04-24T08:00:00.000Z'),
      updatedAt: new Date('2026-04-24T09:00:00.000Z'),
    };
    const secondTicket = {
      handle: 8,
      number: '2026#00008',
      title: 'Drucker reagiert nicht',
      problemDescription: 'Der Drucker bleibt offline.',
      solutionDescription: null,
      createdAt: new Date('2026-04-24T08:00:00.000Z'),
      updatedAt: new Date('2026-04-24T09:30:00.000Z'),
    };
    const createdDocuments: object[] = [];
    const em = {
      find: jest.fn(),
      assign: jest.fn((_target: object, data: object) => data),
      create: jest.fn((_entity: unknown, data: object) => {
        createdDocuments.push(data);
        return data;
      }),
      flush: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
    };
    const service = new TicketSearchIndexService(em as never);
    const firstPayload = (
      service as unknown as {
        buildDocumentPayload: (ticket: typeof firstTicket) => {
          contentHash: string;
          sourceUpdatedAt: Date | null;
        };
      }
    ).buildDocumentPayload(firstTicket);
    const existingDocument = {
      ticket: { handle: 7 },
      contentHash: firstPayload.contentHash,
      sourceUpdatedAt: firstPayload.sourceUpdatedAt,
      embedding: [0.1, 0.2],
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: 3,
    };
    em.find.mockImplementation((entity: unknown) => {
      if ((entity as { name?: string }).name === 'TicketItem') {
        if (
          em.find.mock.calls.filter(
            (call: unknown[]) => (call[0] as { name?: string }).name === 'TicketItem',
          ).length === 1
        ) {
          return Promise.resolve([firstTicket, secondTicket]);
        }

        return Promise.resolve([]);
      }

      return Promise.resolve([existingDocument]);
    });

    const result = await service.backfillTickets({ batchSize: 2 });

    expect(result).toEqual({
      processed: 2,
      created: 1,
      updated: 0,
      skipped: 1,
    });
    expect(createdDocuments).toHaveLength(1);
    expect(createdDocuments[0]).toMatchObject({
      ticket: { handle: 8 },
      searchText: expect.stringContaining('Titel: Drucker reagiert nicht'),
    });
    expect(em.assign).not.toHaveBeenCalled();
    expect(em.flush).toHaveBeenCalledTimes(1);
    expect(em.clear).toHaveBeenCalledTimes(1);
  });

  it('forces document updates during backfill when requested', async () => {
    const ticket = {
      handle: 9,
      title: 'VPN Fehler',
      problemDescription: 'VPN trennt Verbindung.',
      solutionDescription: null,
      createdAt: new Date('2026-04-24T08:00:00.000Z'),
      updatedAt: new Date('2026-04-24T09:00:00.000Z'),
    };
    const em = {
      find: jest.fn(),
      assign: jest.fn((_target: object, data: object) => data),
      create: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
    };
    const service = new TicketSearchIndexService(em as never);
    const payload = (
      service as unknown as {
        buildDocumentPayload: (input: typeof ticket) => {
          contentHash: string;
          sourceUpdatedAt: Date | null;
        };
      }
    ).buildDocumentPayload(ticket);
    const existingDocument = {
      ticket: { handle: 9 },
      contentHash: payload.contentHash,
      sourceUpdatedAt: payload.sourceUpdatedAt,
      embedding: [0.1, 0.2],
      embeddingModel: 'text-embedding-3-small',
      embeddingVersion: 3,
    };
    em.find.mockImplementation((entity: unknown) =>
      Promise.resolve(
        (entity as { name?: string }).name === 'TicketItem'
          ? em.find.mock.calls.filter(
              (call: unknown[]) => (call[0] as { name?: string }).name === 'TicketItem',
            ).length === 1
            ? [ticket]
            : []
          : [existingDocument],
      ),
    );

    const result = await service.backfillTickets({ force: true, batchSize: 10 });

    expect(result).toEqual({
      processed: 1,
      created: 0,
      updated: 1,
      skipped: 0,
    });
    expect(em.assign).toHaveBeenCalledWith(
      existingDocument,
      expect.objectContaining({
        embedding: existingDocument.embedding,
        embeddingModel: existingDocument.embeddingModel,
      }),
    );
  });
});