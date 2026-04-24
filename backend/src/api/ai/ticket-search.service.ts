import { performance } from 'node:perf_hooks';
import { EntityManager } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { GenericService } from '../generic/generic.service';
import { PersonItem } from '../../entity/PersonItem';
import { TicketSearchDocumentItem } from '../../entity/TicketSearchDocumentItem';

export type TicketSearchMode = 'all' | 'problem' | 'solution';

@Injectable()
export class TicketSearchService {
  constructor(
    private readonly genericService: GenericService,
    private readonly em: EntityManager,
  ) {}

  async executeSearch(
    args: Record<string, unknown>,
    user: PersonItem,
  ): Promise<unknown> {
    const startTime = performance.now();
    const query = this.requireStringArg(args.query, 'query');
    const searchMode = this.asTicketSearchMode(args.searchMode);
    const limit = Math.min(this.asPositiveNumber(args.limit) ?? 10, 50);
    const searchFields = this.getTicketSearchFields(searchMode);
    const indexFilter = {
      $or: searchFields.map((field) => ({
        [field]: { $ilike: `%${query}%` },
      })),
    };
    const candidateLimit = Math.min(limit * 5, 250);
    const [documents] = await this.em.findAndCount(
      TicketSearchDocumentItem,
      indexFilter as never,
      {
        limit: candidateLimit,
        orderBy: { handle: 'ASC' } as never,
        populate: ['ticket'] as never,
      },
    );
    const candidateHandles = documents
      .map((document) => this.asTicketHandle(document.ticket?.handle))
      .filter((handle): handle is number => handle != null);

    if (candidateHandles.length === 0) {
      return {
        entityHandle: 'ticket',
        query,
        searchMode,
        searchFields,
        appliedFilter: { handle: { $in: [] } },
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit,
          totalPages: 0,
          executionTime: (performance.now() - startTime) / 1000,
        },
        usageHints: [
          'TicketItem is exposed via the generic entity handle ticket.',
          'Use searchMode solution when the user asks for an existing fix, workaround, or ticket solution.',
        ],
      };
    }

    const result = await this.genericService.findAndCount(
      'ticket',
      { handle: { $in: candidateHandles } },
      1,
      candidateHandles.length,
      {},
      user,
      [],
    );
    const allowedTicketByHandle = new Map(
      result.data
        .map((ticket) => [this.asTicketHandle((ticket as { handle?: unknown }).handle), ticket] as const)
        .filter(
          (
            entry,
          ): entry is [number, (typeof result.data)[number]] => entry[0] != null,
        ),
    );
    const orderedAllowedTickets = candidateHandles
      .map((handle) => allowedTicketByHandle.get(handle) ?? null)
      .filter((ticket): ticket is (typeof result.data)[number] => ticket != null);
    const data = orderedAllowedTickets.slice(0, limit);
    const appliedFilter = {
      handle: {
        $in: orderedAllowedTickets
          .map((ticket) => this.asTicketHandle((ticket as { handle?: unknown }).handle))
          .filter((handle): handle is number => handle != null),
      },
    };
    const total = orderedAllowedTickets.length;

    return {
      entityHandle: 'ticket',
      query,
      searchMode,
      searchFields,
      appliedFilter,
      data,
      meta: {
        total,
        page: 1,
        limit,
        totalPages: total > 0 ? Math.ceil(total / limit) : 0,
        executionTime: (performance.now() - startTime) / 1000,
      },
      usageHints: [
        'TicketItem is exposed via the generic entity handle ticket.',
        'Use searchMode solution when the user asks for an existing fix, workaround, or ticket solution.',
      ],
    };
  }

  private requireStringArg(value: unknown, fieldName: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new TypeError(`ai.mcp${fieldName}Missing`);
    }

    return value.trim();
  }

  private asPositiveNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsedValue = Number(value);

      if (Number.isFinite(parsedValue) && parsedValue > 0) {
        return parsedValue;
      }
    }

    return undefined;
  }

  private asTicketSearchMode(value: unknown): TicketSearchMode {
    return value === 'problem' || value === 'solution' ? value : 'all';
  }

  private getTicketSearchFields(searchMode: TicketSearchMode): string[] {
    switch (searchMode) {
      case 'problem':
        return ['searchText', 'problemText'];
      case 'solution':
        return ['searchText', 'solutionText'];
      default:
        return ['searchText', 'problemText', 'solutionText'];
    }
  }

  private asTicketHandle(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : null;
  }
}