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
      toolName: 'import_get_batch',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importGetBatch,
      jsonSchema: {
        type: 'object',
        properties: {
          batchHandle: {
            type: 'integer',
            description: 'Import batch handle to inspect.',
          },
        },
        required: ['batchHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        batchHandle: z
          .number()
          .int()
          .positive()
          .describe('Import batch handle to inspect.'),
      },
    },
    {
      toolName: 'import_list_templates',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importListTemplates,
      jsonSchema: {
        type: 'object',
        properties: {
          entityHandle: {
            type: 'string',
            description: 'Optional target entity handle.',
          },
          sourceHandle: {
            type: 'string',
            description: 'Optional external import source handle.',
          },
        },
        additionalProperties: false,
      },
      serverInputSchema: {
        entityHandle: z
          .string()
          .optional()
          .describe('Optional target entity handle.'),
        sourceHandle: z
          .string()
          .optional()
          .describe('Optional external import source handle.'),
      },
    },
    {
      toolName: 'import_suggest_mapping',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importSuggestMapping,
      jsonSchema: {
        type: 'object',
        properties: {
          batchHandle: {
            type: 'integer',
            description: 'Analyzed import batch handle.',
          },
          entityHandle: {
            type: 'string',
            description: 'Optional target entity handle.',
          },
          sourceHandle: {
            type: 'string',
            description: 'Optional external import source handle.',
          },
          maxSampleRows: {
            type: 'integer',
            description: 'Maximum sample rows sent to the suggestion model.',
          },
        },
        required: ['batchHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        batchHandle: z
          .number()
          .int()
          .positive()
          .describe('Analyzed import batch handle.'),
        entityHandle: z
          .string()
          .optional()
          .describe('Optional target entity handle.'),
        sourceHandle: z
          .string()
          .optional()
          .describe('Optional external import source handle.'),
        maxSampleRows: z
          .number()
          .int()
          .positive()
          .max(20)
          .optional()
          .describe('Maximum sample rows sent to the suggestion model.'),
      },
    },
    {
      toolName: 'import_match_existing_records',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importMatchExistingRecords,
      jsonSchema: {
        type: 'object',
        properties: {
          batchHandle: {
            type: 'integer',
            description: 'Import batch handle whose rows should be checked.',
          },
          entityHandle: {
            type: 'string',
            description: 'Target Sapling entity handle to search.',
          },
          sourceColumns: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional source columns to use. Defaults to configured mapping columns or all batch headers.',
          },
          targetFields: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Optional target entity fields to search. Defaults to common display/search fields.',
          },
          sampleLimit: {
            type: 'integer',
            description: 'Maximum import rows to inspect, default 10.',
          },
          limitPerValue: {
            type: 'integer',
            description:
              'Maximum Sapling matches per sampled value, default 3.',
          },
        },
        required: ['batchHandle', 'entityHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        batchHandle: z
          .number()
          .int()
          .positive()
          .describe('Import batch handle whose rows should be checked.'),
        entityHandle: z
          .string()
          .describe('Target Sapling entity handle to search.'),
        sourceColumns: z
          .array(z.string())
          .optional()
          .describe('Optional source columns to use.'),
        targetFields: z
          .array(z.string())
          .optional()
          .describe('Optional target entity fields to search.'),
        sampleLimit: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe('Maximum import rows to inspect, default 10.'),
        limitPerValue: z
          .number()
          .int()
          .positive()
          .max(10)
          .optional()
          .describe('Maximum Sapling matches per sampled value, default 3.'),
      },
    },
    {
      toolName: 'import_configure_batch',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importConfigureBatch,
      jsonSchema: {
        type: 'object',
        properties: {
          batchHandle: {
            type: 'integer',
            description: 'Import batch handle to configure.',
          },
          entityHandle: {
            type: 'string',
            description: 'Target Sapling entity handle.',
          },
          sourceHandle: {
            type: 'string',
            description: 'Optional external import source handle.',
          },
          templateHandle: {
            type: 'integer',
            description: 'Optional import template handle.',
          },
          keyColumns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional external key source columns.',
          },
          mappings: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Field mappings from source columns to target fields.',
          },
          relationMappings: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Relation mapping configuration.',
          },
          valueMappings: {
            type: 'array',
            items: { type: 'object', additionalProperties: true },
            description: 'Value mapping configuration.',
          },
          genericReferenceMapping: {
            type: 'object',
            additionalProperties: true,
            description: 'Optional generic reference mapping.',
          },
        },
        required: ['batchHandle', 'entityHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        batchHandle: z
          .number()
          .int()
          .positive()
          .describe('Import batch handle to configure.'),
        entityHandle: z.string().describe('Target Sapling entity handle.'),
        sourceHandle: z
          .string()
          .optional()
          .describe('Optional external import source handle.'),
        templateHandle: z.number().int().positive().optional(),
        keyColumns: z.array(z.string()).optional(),
        mappings: z.array(z.record(z.string(), z.unknown())).optional(),
        relationMappings: z.array(z.record(z.string(), z.unknown())).optional(),
        valueMappings: z.array(z.record(z.string(), z.unknown())).optional(),
        genericReferenceMapping: z.record(z.string(), z.unknown()).optional(),
      },
    },
    {
      toolName: 'import_execute_batch',
      description: SAPLING_MCP_TOOL_DESCRIPTIONS.importExecuteBatch,
      jsonSchema: {
        type: 'object',
        properties: {
          batchHandle: {
            type: 'integer',
            description: 'Validated import batch handle to execute.',
          },
        },
        required: ['batchHandle'],
        additionalProperties: false,
      },
      serverInputSchema: {
        batchHandle: z
          .number()
          .int()
          .positive()
          .describe('Validated import batch handle to execute.'),
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
