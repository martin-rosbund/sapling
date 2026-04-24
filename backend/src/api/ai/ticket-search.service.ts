import { performance } from 'node:perf_hooks';
import { EntityManager } from '@mikro-orm/core';
import { Injectable, Optional } from '@nestjs/common';
import { GenericService } from '../generic/generic.service';
import { PersonItem } from '../../entity/PersonItem';
import { TicketSearchDocumentItem } from '../../entity/TicketSearchDocumentItem';
import { TicketSearchEmbeddingService } from './ticket-search-embedding.service';

export type TicketSearchMode = 'all' | 'problem' | 'solution';

type TicketSearchMatch = {
  ticketHandle: number;
  score: number;
  matchedOn: string[];
  snippet: string | null;
  lexicalScore: number;
  semanticScore: number;
};

type TicketSearchEmbeddingTarget = {
  providerHandle: string | null;
  model: string | null;
};

@Injectable()
export class TicketSearchService {
  constructor(
    private readonly genericService: GenericService,
    private readonly em: EntityManager,
    @Optional()
    private readonly embeddingService?: TicketSearchEmbeddingService,
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
    const semanticDocuments = await this.em.find(
      TicketSearchDocumentItem,
      {
        embedding: { $ne: null },
      } as never,
      {
        populate: ['ticket'] as never,
      },
    );
    const queryEmbeddingsByTarget = await this.buildQueryEmbeddingsByTarget(
      query,
      semanticDocuments,
    );
    const allDocuments = this.mergeDocumentsByTicketHandle(
      documents,
      semanticDocuments,
    );
    const scoredMatches = allDocuments
      .map((document) =>
        this.scoreDocument(
          query,
          searchMode,
          document,
          queryEmbeddingsByTarget,
        ),
      )
      .filter((match): match is TicketSearchMatch => match != null)
      .sort(
        (left, right) =>
          right.score - left.score || left.ticketHandle - right.ticketHandle,
      );
    const candidateHandles = scoredMatches.map((match) => match.ticketHandle);

    if (candidateHandles.length === 0) {
      return {
        entityHandle: 'ticket',
        query,
        searchMode,
        searchFields,
        appliedFilter: { handle: { $in: [] } },
        matches: [],
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
        .map(
          (ticket) =>
            [
              this.asTicketHandle((ticket as { handle?: unknown }).handle),
              ticket,
            ] as const,
        )
        .filter(
          (entry): entry is [number, (typeof result.data)[number]] =>
            entry[0] != null,
        ),
    );
    const orderedAllowedTickets = candidateHandles
      .map((handle) => allowedTicketByHandle.get(handle) ?? null)
      .filter(
        (ticket): ticket is (typeof result.data)[number] => ticket != null,
      );
    const data = orderedAllowedTickets.slice(0, limit);
    const visibleHandles = new Set(
      data
        .map((ticket) =>
          this.asTicketHandle((ticket as { handle?: unknown }).handle),
        )
        .filter((handle): handle is number => handle != null),
    );
    const appliedFilter = {
      handle: {
        $in: data
          .map((ticket) =>
            this.asTicketHandle((ticket as { handle?: unknown }).handle),
          )
          .filter((handle): handle is number => handle != null),
      },
    };
    const matches = scoredMatches.filter((match) =>
      visibleHandles.has(match.ticketHandle),
    );
    const total = orderedAllowedTickets.length;

    return {
      entityHandle: 'ticket',
      query,
      searchMode,
      searchFields,
      appliedFilter,
      matches,
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
        return [
          'ticketNumber',
          'externalNumber',
          'title',
          'searchText',
          'problemText',
        ];
      case 'solution':
        return [
          'ticketNumber',
          'externalNumber',
          'title',
          'searchText',
          'solutionText',
        ];
      default:
        return [
          'ticketNumber',
          'externalNumber',
          'title',
          'searchText',
          'problemText',
          'solutionText',
        ];
    }
  }

  private asTicketHandle(value: unknown): number | null {
    return typeof value === 'number' && Number.isInteger(value) && value > 0
      ? value
      : null;
  }

  private mergeDocumentsByTicketHandle(
    ...collections: TicketSearchDocumentItem[][]
  ): TicketSearchDocumentItem[] {
    const documents = new Map<number, TicketSearchDocumentItem>();

    for (const collection of collections) {
      for (const document of collection) {
        const handle = this.asTicketHandle(document.ticket?.handle);

        if (handle != null && !documents.has(handle)) {
          documents.set(handle, document);
        }
      }
    }

    return [...documents.values()];
  }

  private scoreDocument(
    query: string,
    searchMode: TicketSearchMode,
    document: TicketSearchDocumentItem,
    queryEmbeddingsByTarget: Map<string, number[]>,
  ): TicketSearchMatch | null {
    const ticketHandle = this.asTicketHandle(document.ticket?.handle);

    if (ticketHandle == null) {
      return null;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const queryTokens = normalizedQuery
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2);
    const matchedOn = new Set<string>();
    let lexicalScore = 0;
    let semanticScore = 0;
    let bestSnippetSource: {
      label: string;
      text: string | null;
      score: number;
    } | null = null;

    lexicalScore += this.scoreDocumentValue(
      normalizedQuery,
      document.ticketNumber,
      'ticketNumber',
      matchedOn,
      900,
      600,
      250,
      bestSnippetSource,
    );
    bestSnippetSource = this.nextSnippetCandidate(
      bestSnippetSource,
      normalizedQuery,
      document.ticketNumber,
      'ticketNumber',
      900,
      600,
      250,
    );

    lexicalScore += this.scoreDocumentValue(
      normalizedQuery,
      document.externalNumber,
      'externalNumber',
      matchedOn,
      780,
      520,
      220,
      bestSnippetSource,
    );
    bestSnippetSource = this.nextSnippetCandidate(
      bestSnippetSource,
      normalizedQuery,
      document.externalNumber,
      'externalNumber',
      780,
      520,
      220,
    );

    lexicalScore += this.scoreDocumentValue(
      normalizedQuery,
      document.title,
      'title',
      matchedOn,
      360,
      240,
      120,
      bestSnippetSource,
    );
    bestSnippetSource = this.nextSnippetCandidate(
      bestSnippetSource,
      normalizedQuery,
      document.title,
      'title',
      360,
      240,
      120,
    );

    lexicalScore += this.scoreDocumentValue(
      normalizedQuery,
      document.searchText,
      'searchText',
      matchedOn,
      150,
      90,
      40,
      bestSnippetSource,
    );
    bestSnippetSource = this.nextSnippetCandidate(
      bestSnippetSource,
      normalizedQuery,
      document.searchText,
      'searchText',
      150,
      90,
      40,
    );

    if (searchMode !== 'solution') {
      lexicalScore += this.scoreDocumentValue(
        normalizedQuery,
        document.problemText,
        'problemText',
        matchedOn,
        180,
        120,
        60,
        bestSnippetSource,
      );
      bestSnippetSource = this.nextSnippetCandidate(
        bestSnippetSource,
        normalizedQuery,
        document.problemText,
        'problemText',
        180,
        120,
        60,
      );
    }

    if (searchMode !== 'problem') {
      lexicalScore += this.scoreDocumentValue(
        normalizedQuery,
        document.solutionText,
        'solutionText',
        matchedOn,
        220,
        150,
        75,
        bestSnippetSource,
      );
      bestSnippetSource = this.nextSnippetCandidate(
        bestSnippetSource,
        normalizedQuery,
        document.solutionText,
        'solutionText',
        220,
        150,
        75,
      );
    }

    for (const token of queryTokens) {
      lexicalScore += this.scoreTokenPresence(
        token,
        document.ticketNumber,
        180,
      );
      lexicalScore += this.scoreTokenPresence(
        token,
        document.externalNumber,
        150,
      );
      lexicalScore += this.scoreTokenPresence(token, document.title, 32);
      lexicalScore += this.scoreTokenPresence(token, document.searchText, 10);

      if (searchMode !== 'solution') {
        lexicalScore += this.scoreTokenPresence(
          token,
          document.problemText,
          18,
        );
      }

      if (searchMode !== 'problem') {
        lexicalScore += this.scoreTokenPresence(
          token,
          document.solutionText,
          24,
        );
      }
    }

    const embeddingTarget = {
      providerHandle: this.inferProviderHandleFromModel(
        document.embeddingModel,
      ),
      model: document.embeddingModel ?? null,
    };
    const queryEmbedding = queryEmbeddingsByTarget.get(
      this.toEmbeddingTargetKey(embeddingTarget),
    );

    if (queryEmbedding) {
      semanticScore = this.scoreSemanticSimilarity(
        queryEmbedding,
        document.embedding,
      );

      if (semanticScore > 0) {
        matchedOn.add('embedding');
      }
    }

    const score = lexicalScore + semanticScore;

    if (lexicalScore === 0 && semanticScore < 35) {
      return null;
    }

    if (score === 0) {
      return null;
    }

    return {
      ticketHandle,
      score,
      matchedOn: [...matchedOn],
      snippet: this.extractSnippet(
        query,
        bestSnippetSource?.text ?? document.title ?? document.searchText,
      ),
      lexicalScore,
      semanticScore,
    };
  }

  private async buildQueryEmbeddingsByTarget(
    query: string,
    documents: TicketSearchDocumentItem[],
  ): Promise<Map<string, number[]>> {
    const embeddingsByTarget = new Map<string, number[]>();

    if (!this.embeddingService) {
      return embeddingsByTarget;
    }

    const targets = new Map<string, TicketSearchEmbeddingTarget>();

    for (const document of documents) {
      if (!document.embeddingModel) {
        continue;
      }

      const target = {
        providerHandle: this.inferProviderHandleFromModel(
          document.embeddingModel,
        ),
        model: document.embeddingModel,
      };
      const key = this.toEmbeddingTargetKey(target);

      if (!targets.has(key)) {
        targets.set(key, target);
      }
    }

    for (const [key, target] of targets) {
      const embedding = await this.embeddingService.embedQuery(query, target);

      if (embedding) {
        embeddingsByTarget.set(key, embedding);
      }
    }

    return embeddingsByTarget;
  }

  private toEmbeddingTargetKey(target: TicketSearchEmbeddingTarget): string {
    return `${target.providerHandle ?? 'unknown'}::${target.model ?? 'unknown'}`;
  }

  private inferProviderHandleFromModel(
    model: string | null | undefined,
  ): string | null {
    if (!model) {
      return null;
    }

    const normalizedModel = model.trim().toLowerCase();

    if (normalizedModel.startsWith('text-embedding-')) {
      return 'openai';
    }

    if (normalizedModel.includes('embedding')) {
      return 'gemini';
    }

    return null;
  }

  private scoreDocumentValue(
    normalizedQuery: string,
    candidate: string | null | undefined,
    label: string,
    matchedOn: Set<string>,
    exactScore: number,
    prefixScore: number,
    includeScore: number,
    _snippetSource: {
      label: string;
      text: string | null;
      score: number;
    } | null,
  ): number {
    if (!candidate) {
      return 0;
    }

    const normalizedCandidate = candidate.toLowerCase();

    if (normalizedCandidate === normalizedQuery) {
      matchedOn.add(label);
      return exactScore;
    }

    if (normalizedCandidate.startsWith(normalizedQuery)) {
      matchedOn.add(label);
      return prefixScore;
    }

    if (normalizedCandidate.includes(normalizedQuery)) {
      matchedOn.add(label);
      return includeScore;
    }

    return 0;
  }

  private nextSnippetCandidate(
    current: { label: string; text: string | null; score: number } | null,
    normalizedQuery: string,
    candidate: string | null | undefined,
    label: string,
    exactScore: number,
    prefixScore: number,
    includeScore: number,
  ): { label: string; text: string | null; score: number } | null {
    if (!candidate) {
      return current;
    }

    const normalizedCandidate = candidate.toLowerCase();
    let score = 0;

    if (normalizedCandidate === normalizedQuery) {
      score = exactScore;
    } else if (normalizedCandidate.startsWith(normalizedQuery)) {
      score = prefixScore;
    } else if (normalizedCandidate.includes(normalizedQuery)) {
      score = includeScore;
    }

    if (score === 0 || (current != null && current.score >= score)) {
      return current;
    }

    return { label, text: candidate, score };
  }

  private scoreTokenPresence(
    token: string,
    candidate: string | null | undefined,
    tokenScore: number,
  ): number {
    if (!candidate) {
      return 0;
    }

    return candidate.toLowerCase().includes(token) ? tokenScore : 0;
  }

  private scoreSemanticSimilarity(
    queryEmbedding: number[],
    candidateEmbedding: number[] | null | undefined,
  ): number {
    if (
      !Array.isArray(candidateEmbedding) ||
      candidateEmbedding.length === 0 ||
      candidateEmbedding.length !== queryEmbedding.length
    ) {
      return 0;
    }

    const similarity = queryEmbedding.reduce(
      (sum, value, index) => sum + value * candidateEmbedding[index]!,
      0,
    );

    if (!Number.isFinite(similarity) || similarity <= 0.45) {
      return 0;
    }

    return Math.round(similarity * 100);
  }

  private extractSnippet(
    query: string,
    candidate: string | null | undefined,
  ): string | null {
    if (!candidate) {
      return null;
    }

    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCandidate = candidate.toLowerCase();
    const directIndex = normalizedCandidate.indexOf(normalizedQuery);
    const tokenIndex =
      directIndex >= 0
        ? directIndex
        : (normalizedQuery
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2)
            .map((token) => normalizedCandidate.indexOf(token))
            .find((index) => index >= 0) ?? -1);

    if (tokenIndex < 0) {
      return candidate.length > 180
        ? `${candidate.slice(0, 177)}...`
        : candidate;
    }

    const start = Math.max(0, tokenIndex - 48);
    const end = Math.min(candidate.length, tokenIndex + 132);
    const excerpt = candidate.slice(start, end).trim();

    if (!excerpt) {
      return null;
    }

    return `${start > 0 ? '...' : ''}${excerpt}${end < candidate.length ? '...' : ''}`;
  }
}
