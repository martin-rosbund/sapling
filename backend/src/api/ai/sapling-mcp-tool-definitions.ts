import * as z from 'zod/v4';
import { SAPLING_MCP_TOOL_DESCRIPTIONS } from './prompts/sapling-mcp.prompts';

export type SaplingMcpToolDefinition = {
  toolName: string;
  description: string;
  jsonSchema: Record<string, unknown>;
  serverInputSchema: Record<string, z.ZodType>;
};

export const SAPLING_MCP_TOOL_DEFINITIONS: readonly SaplingMcpToolDefinition[] =
  [
    {
      toolName: 'current_person',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.currentPerson,
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      serverInputSchema: {},
    },
    {
      toolName: 'entity_catalog',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.entityCatalog,
      jsonSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      serverInputSchema: {},
    },
    {
      toolName: 'entity_schema',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.entitySchema,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle to inspect.',
          },
        },
        required: ['entityHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z
          .string()
          .describe('Registered Sapling entity handle to inspect.'),
      },
    },
    {
      toolName: 'entity_search',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.entitySearch,
      jsonSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Search term matched against entity handles and schema fields.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of matches to return, default 10.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      serverInputSchema: {
        query: z
          .string()
          .describe(
            'Search term matched against entity handles and schema fields.',
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe('Maximum number of matches to return, default 10.'),
      },
    },
    {
      toolName: 'generic_list',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericList,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          filter: {
            type: 'object',
            description: 'Optional MikroORM filter object.',
            additionalProperties: true,
          },
          orderBy: {
            type: 'object',
            description: 'Optional orderBy object.',
            additionalProperties: true,
          },
          relations: {
            type: 'array',
            description: 'Optional relations to populate.',
            items: { type: 'string' },
          },
          page: {
            type: 'integer',
            description: 'Page number, default 1.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum result size, default 50.',
          },
        },
        required: ['entityHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        filter: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Optional MikroORM filter object.'),
        orderBy: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Optional orderBy object.'),
        relations: z
          .array(z.string())
          .optional()
          .describe('Optional relations to populate.'),
        page: z
          .number()
          .int()
          .positive()
          .optional()
          .describe('Page number, default 1.'),
        limit: z
          .number()
          .int()
          .positive()
          .max(200)
          .optional()
          .describe('Maximum result size, default 50.'),
      },
    },
    {
      toolName: 'generic_get',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericGet,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to load.',
          },
          relations: {
            type: 'array',
            description: 'Optional relations to populate.',
            items: { type: 'string' },
          },
        },
        required: ['entityHandle', 'handle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        handle: z
          .union([z.string(), z.number()])
          .describe('Record handle to load.'),
        relations: z
          .array(z.string())
          .optional()
          .describe('Optional relations to populate.'),
      },
    },
    {
      toolName: 'generic_timeline',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericTimeline,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to inspect.',
          },
          before: {
            type: 'string',
            description: 'Optional month cursor in YYYY-MM format.',
          },
          months: {
            type: 'integer',
            description: 'Number of non-empty months to load, default 6.',
          },
        },
        required: ['entityHandle', 'handle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        handle: z
          .union([z.string(), z.number()])
          .describe('Record handle to inspect.'),
        before: z
          .string()
          .optional()
          .describe('Optional month cursor in YYYY-MM format.'),
        months: z
          .number()
          .int()
          .positive()
          .max(12)
          .optional()
          .describe('Number of non-empty months to load, default 6.'),
      },
    },
    {
      toolName: 'ticket_search',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.ticketSearch,
      jsonSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search text matched against TicketItem text fields.',
          },
          searchMode: {
            type: 'string',
            enum: ['all', 'problem', 'solution'],
            description:
              'Search scope. Use solution for known fixes, problem for incident descriptions, default all.',
          },
          limit: {
            type: 'integer',
            description: 'Maximum number of matches to return, default 10.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      serverInputSchema: {
        query: z
          .string()
          .describe('Search text matched against TicketItem text fields.'),
        searchMode: z
          .enum(['all', 'problem', 'solution'])
          .optional()
          .describe(
            'Search scope. Use solution for known fixes, problem for incident descriptions, default all.',
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe('Maximum number of matches to return, default 10.'),
      },
    },
    {
      toolName: 'semantic_search',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.semanticSearch,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description:
              'Registered Sapling entity handle with an active vector index, for example ticket, event, salesOpportunity, effortEstimate, or effortEstimatePosition.',
          },
          query: {
            type: 'string',
            description:
              'Natural-language query that should be matched semantically against vectorized content.',
          },
          limit: {
            type: 'integer',
            description:
              'Maximum number of semantic results to return, default 5.',
          },
        },
        required: ['entityHandle', 'query'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z
          .string()
          .describe(
            'Registered Sapling entity handle with an active vector index, for example ticket, event, salesOpportunity, effortEstimate, or effortEstimatePosition.',
          ),
        query: z
          .string()
          .describe(
            'Natural-language query that should be matched semantically against vectorized content.',
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe('Maximum number of semantic results to return, default 5.'),
      },
    },
    {
      toolName: 'knowledge_search',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.knowledgeSearch,
      jsonSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description:
              'Natural-language knowledge question or problem description.',
          },
          entityHandles: {
            type: 'array',
            description:
              'Optional subset of indexed knowledge sources. Defaults to knowledgeArticle, ticket, effortEstimate, effortEstimatePosition, and salesOpportunity.',
            items: { type: 'string' },
          },
          limit: {
            type: 'integer',
            description:
              'Maximum combined result size across all knowledge sources, default 8.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
      serverInputSchema: {
        query: z
          .string()
          .describe(
            'Natural-language knowledge question or problem description.',
          ),
        entityHandles: z
          .array(z.string())
          .optional()
          .describe(
            'Optional subset of indexed knowledge sources. Defaults to knowledgeArticle, ticket, effortEstimate, effortEstimatePosition, and salesOpportunity.',
          ),
        limit: z
          .number()
          .int()
          .positive()
          .max(30)
          .optional()
          .describe(
            'Maximum combined result size across all knowledge sources, default 8.',
          ),
      },
    },
    {
      toolName: 'generic_create',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericCreate,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          data: {
            type: 'object',
            description: 'Payload for the new record.',
            additionalProperties: true,
          },
        },
        required: ['entityHandle', 'data'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        data: z
          .record(z.string(), z.unknown())
          .describe('Payload for the new record.'),
      },
    },
    {
      toolName: 'generic_update',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericUpdate,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to update.',
          },
          data: {
            type: 'object',
            description: 'Partial update payload.',
            additionalProperties: true,
          },
          relations: {
            type: 'array',
            description: 'Optional relations to populate in the response.',
            items: { type: 'string' },
          },
        },
        required: ['entityHandle', 'handle', 'data'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        handle: z
          .union([z.string(), z.number()])
          .describe('Record handle to update.'),
        data: z
          .record(z.string(), z.unknown())
          .describe('Partial update payload.'),
        relations: z
          .array(z.string())
          .optional()
          .describe('Optional relations to populate in the response.'),
      },
    },
    {
      toolName: 'generic_delete',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.genericDelete,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Registered Sapling entity handle.',
          },
          handle: {
            anyOf: [{ type: 'string' }, { type: 'integer' }],
            description: 'Record handle to delete.',
          },
        },
        required: ['entityHandle', 'handle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z.string().describe('Registered Sapling entity handle.'),
        handle: z
          .union([z.string(), z.number()])
          .describe('Record handle to delete.'),
      },
    },
  ] as const;
