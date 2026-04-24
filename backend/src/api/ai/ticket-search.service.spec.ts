import { describe, expect, it, jest } from '@jest/globals';

jest.mock('../../entity/TicketSearchDocumentItem', () => ({
  TicketSearchDocumentItem: class {},
}));

import { TicketSearchService } from './ticket-search.service';

describe('TicketSearchService', () => {
  it('searches the ticket search index and hydrates allowed tickets', async () => {
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
          { ticket: { handle: 44 } },
          { ticket: { handle: 42 } },
        ],
        2,
      ]),
    };
    const service = new TicketSearchService(genericService as never, em as never);
    const user = { handle: 1 } as never;

    const result = await service.executeSearch(
      {
        query: 'Sage 100',
        searchMode: 'solution',
        limit: 5,
      },
      user,
    );

    expect(em.findAndCount).toHaveBeenCalledWith(
      expect.any(Function),
      {
        $or: [
          { searchText: { $ilike: '%Sage 100%' } },
          { solutionText: { $ilike: '%Sage 100%' } },
        ],
      },
      expect.objectContaining({
        limit: 25,
        populate: ['ticket'],
      }),
    );
    expect(genericService.findAndCount).toHaveBeenCalledWith(
      'ticket',
      { handle: { $in: [44, 42] } },
      1,
      2,
      {},
      user,
      [],
    );
    expect(result).toMatchObject({
      entityHandle: 'ticket',
      query: 'Sage 100',
      searchMode: 'solution',
      appliedFilter: { handle: { $in: [44, 42] } },
      data: [
        { handle: 44, title: 'Sage 100 Workaround' },
        { handle: 42, title: 'Sage 100 Fehler' },
      ],
    });
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
    };
    const service = new TicketSearchService(genericService as never, em as never);

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
      data: [],
      meta: { total: 0, limit: 50 },
    });
  });
});