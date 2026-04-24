import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/TicketSearchDocumentItem', () => ({
  TicketSearchDocumentItem: class {},
}));

import { TicketSearchService } from './ticket-search.service';

describe('TicketSearchService', () => {
  it('searches the ticket search index, boosts exact matches, and returns snippets', async () => {
    const genericService = {
      findAndCount: jest.fn().mockResolvedValue({
        data: [
          { handle: 42, title: 'Sage 100 Fehler' },
          { handle: 44, title: 'Sage 100 Workaround' },
        ],
        meta: { total: 1 },
      } as never),
    };
    const em = {
      findAndCount: jest.fn().mockResolvedValue([
        [
          {
            ticket: { handle: 44 },
            ticketNumber: '2026#00044',
            externalNumber: 'SAGE-44',
            title: 'Sage 100 Workaround',
            searchText: 'Titel: Sage 100 Workaround',
            solutionText: 'Sage 100 workaround fuer Importprobleme.',
            problemText: null,
            embedding: null,
          },
          {
            ticket: { handle: 42 },
            ticketNumber: '2026#00042',
            externalNumber: 'SAGE-42',
            title: 'Sage 100 Fehler',
            searchText: 'Titel: Sage 100 Fehler',
            solutionText:
              'Sage 100 Fehler durch Neustart des Dienstes beheben.',
            problemText: 'Sage 100 Fehler beim Buchen.',
            embedding: null,
          },
        ],
        2,
      ]),
      find: jest.fn().mockResolvedValue([]),
    };
    const service = new TicketSearchService(
      genericService as never,
      em as never,
      undefined,
    );
    const user = { handle: 1 } as never;

    const result = await service.executeSearch(
      {
        query: 'Sage 100 Fehler',
        searchMode: 'solution',
        limit: 5,
      },
      user,
    );

    expect(em.findAndCount).toHaveBeenCalledWith(
      expect.any(Function),
      {
        $or: [
          { ticketNumber: { $ilike: '%Sage 100 Fehler%' } },
          { externalNumber: { $ilike: '%Sage 100 Fehler%' } },
          { title: { $ilike: '%Sage 100 Fehler%' } },
          { searchText: { $ilike: '%Sage 100 Fehler%' } },
          { solutionText: { $ilike: '%Sage 100 Fehler%' } },
        ],
      },
      expect.objectContaining({
        limit: 25,
        populate: ['ticket'],
      }),
    );
    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      { handle: { $in: [42, 44] } },
      1,
      2,
      {},
      user,
      [],
    );
    expect(result).toMatchObject({
      entityHandle: 'ticket',
      query: 'Sage 100 Fehler',
      searchMode: 'solution',
      appliedFilter: { handle: { $in: [42, 44] } },
      matches: [
        expect.objectContaining({
          ticketHandle: 42,
          snippet: expect.stringContaining('Sage 100 Fehler'),
        }),
        expect.objectContaining({
          ticketHandle: 44,
          snippet: expect.stringContaining('Sage 100 Workaround'),
        }),
      ],
      data: [
        { handle: 42, title: 'Sage 100 Fehler' },
        { handle: 44, title: 'Sage 100 Workaround' },
      ],
    });
    expect(
      (result as { matches: Array<{ lexicalScore: number }> }).matches[0]
        ?.lexicalScore,
    ).toBeGreaterThan(
      (result as { matches: Array<{ lexicalScore: number }> }).matches[1]
        ?.lexicalScore ?? 0,
    );
  });

  it('falls back to all indexed text fields and caps the limit', async () => {
    const genericService = {
      findAndCount: jest.fn().mockResolvedValue({
        data: [],
        meta: { total: 0 },
      } as never),
    };
    const em = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([]),
    };
    const service = new TicketSearchService(
      genericService as never,
      em as never,
      undefined,
    );

    const result = await service.executeSearch(
      {
        query: 'Timeout Fehler',
        searchMode: 'unknown',
        limit: 999,
      },
      { handle: 7 } as never,
    );

    expect(em.findAndCount).toHaveBeenCalledWith(
      expect.any(Function),
      {
        $or: [
          { ticketNumber: { $ilike: '%Timeout Fehler%' } },
          { externalNumber: { $ilike: '%Timeout Fehler%' } },
          { title: { $ilike: '%Timeout Fehler%' } },
          { searchText: { $ilike: '%Timeout Fehler%' } },
          { problemText: { $ilike: '%Timeout Fehler%' } },
          { solutionText: { $ilike: '%Timeout Fehler%' } },
        ],
      },
      expect.objectContaining({
        limit: 250,
        populate: ['ticket'],
      }),
    );
    expect(genericService.findAndCount).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      appliedFilter: { handle: { $in: [] } },
      matches: [],
      data: [],
      meta: { total: 0, limit: 50 },
    });
  });

  it('adds semantic candidates when lexical search misses but embeddings exist', async () => {
    const genericService = {
      findAndCount: jest.fn().mockResolvedValue({
        data: [{ handle: 77, title: 'Dienst neu starten' }],
        meta: { total: 1 },
      } as never),
    };
    const em = {
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      find: jest.fn().mockResolvedValue([
        {
          ticket: { handle: 77 },
          ticketNumber: '2026#00077',
          externalNumber: 'SAGE-77',
          title: 'Dienst neu starten',
          searchText: 'Titel: Dienst neu starten',
          problemText: 'Sage Import bleibt haengen.',
          solutionText: 'Dienst neu starten loest das Problem.',
          embedding: [1, 0],
        },
      ]),
    };
    const embeddingService = {
      embedQuery: jest.fn().mockResolvedValue([1, 0]),
    };
    const service = new TicketSearchService(
      genericService as never,
      em as never,
      embeddingService as never,
    );

    const result = await service.executeSearch(
      {
        query: 'Serverprozess neu starten',
        limit: 5,
      },
      { handle: 1 } as never,
    );

    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      { handle: { $in: [77] } },
      1,
      1,
      {},
      { handle: 1 },
      [],
    );
    expect(result).toMatchObject({
      data: [{ handle: 77, title: 'Dienst neu starten' }],
      matches: [
        expect.objectContaining({
          ticketHandle: 77,
          matchedOn: expect.arrayContaining(['embedding']),
        }),
      ],
    });
    expect(
      (result as { matches: Array<{ semanticScore: number }> }).matches[0]
        ?.semanticScore,
    ).toBeGreaterThan(0);
  });
});
