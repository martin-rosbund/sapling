import {
  SchemaType,
  type FunctionCall,
  type FunctionDeclaration,
  type FunctionDeclarationSchema,
} from '@google/generative-ai';
import type { AiProviderModelItem } from '../../entity/AiProviderModelItem';
import {
  buildGeminiJsonStringDescription,
  buildGeminiToolPayloadDescription,
  normalizeJsonSchema,
} from './prompts/ai.prompts';
import type { AiToolErrorPayload, AiToolRegistryEntry } from './ai.types';
import type { McpToolDescriptor } from './mcp.service';

export function resolveMaxToolCallIterations(
  model: AiProviderModelItem,
): number {
  const value = model.maxToolCallIterations;

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 8;
  }

  return Math.max(1, Math.floor(value));
}

export function isToolErrorPayload(
  value: unknown,
): value is AiToolErrorPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { ok?: unknown }).ok === false
  );
}

export function buildToolCallSignature(
  functionName: string,
  args: Record<string, unknown>,
): string {
  return `${functionName}:${stableStringify(args)}`;
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

export function buildToolRegistry(
  availableTools: McpToolDescriptor[],
): AiToolRegistryEntry[] {
  const usedNames = new Set<string>();

  return availableTools.map((descriptor) => {
    const baseName = sanitizeToolFunctionName(
      `${descriptor.serverName}__${descriptor.toolName}`,
    );
    let encodedName = baseName;
    let suffix = 2;

    while (usedNames.has(encodedName)) {
      encodedName = sanitizeToolFunctionName(`${baseName}_${suffix}`);
      suffix += 1;
    }

    usedNames.add(encodedName);
    return { encodedName, descriptor };
  });
}

export function sanitizeToolFunctionName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
  const prefixed = /^[a-zA-Z_]/.test(sanitized)
    ? sanitized
    : `tool_${sanitized}`;
  return prefixed.slice(0, 64);
}

export function buildOpenAiTools(toolRegistry: AiToolRegistryEntry[]) {
  return toolRegistry.map((entry) => ({
    type: 'function' as const,
    function: {
      name: entry.encodedName,
      description: entry.descriptor.description,
      parameters: normalizeJsonSchema(entry.descriptor.inputSchema) ?? {
        type: 'object',
        properties: {},
        additionalProperties: true,
      },
    },
  }));
}

export function buildGeminiFunctionDeclarations(
  toolRegistry: AiToolRegistryEntry[],
): FunctionDeclaration[] {
  return toolRegistry.map((entry) => ({
    name: entry.encodedName,
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        payload: {
          type: SchemaType.STRING,
          description: buildGeminiToolPayloadDescription(entry),
        },
      },
      required: ['payload'],
    },
    ...(entry.descriptor.description
      ? { description: entry.descriptor.description }
      : {}),
  }));
}

export function convertJsonSchemaToGemini(
  schema?: Record<string, unknown> | null,
): FunctionDeclaration['parameters'] | undefined {
  if (!schema || schema.type !== 'object') {
    return undefined;
  }

  const propertiesRecord =
    schema.properties && typeof schema.properties === 'object'
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : {};

  const properties = Object.fromEntries(
    Object.entries(propertiesRecord)
      .map(([key, value]) => [key, convertJsonSchemaPropertyToGemini(value)])
      .filter(
        (
          entry,
        ): entry is [
          string,
          NonNullable<ReturnType<typeof convertJsonSchemaPropertyToGemini>>,
        ] => entry[1] != null,
      ),
  );

  return {
    type: SchemaType.OBJECT,
    properties:
      properties as unknown as FunctionDeclarationSchema['properties'],
    ...(typeof schema.description === 'string'
      ? { description: schema.description }
      : {}),
    ...(Array.isArray(schema.required)
      ? {
          required: schema.required.filter(
            (item): item is string => typeof item === 'string',
          ),
        }
      : {}),
  };
}

function convertJsonSchemaPropertyToGemini(
  schema?: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (Array.isArray(schema.anyOf)) {
    const anyOf = schema.anyOf as Array<Record<string, unknown>>;
    const preferred =
      anyOf.find((item) => item.type === 'object') ??
      anyOf.find((item) => item.type === 'string') ??
      anyOf[0];
    return convertJsonSchemaPropertyToGemini(preferred);
  }

  switch (schema.type) {
    case 'string':
      return {
        type: SchemaType.STRING,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
      };
    case 'number':
      return {
        type: SchemaType.NUMBER,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
      };
    case 'integer':
      return {
        type: SchemaType.INTEGER,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
      };
    case 'boolean':
      return {
        type: SchemaType.BOOLEAN,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
      };
    case 'array': {
      const itemSchema =
        schema.items && typeof schema.items === 'object'
          ? convertJsonSchemaPropertyToGemini(
              schema.items as Record<string, unknown>,
            )
          : null;

      return {
        type: SchemaType.ARRAY,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
        ...(itemSchema ? { items: itemSchema } : {}),
      };
    }
    case 'object': {
      const hasExplicitProperties =
        schema.properties &&
        typeof schema.properties === 'object' &&
        Object.keys(schema.properties).length > 0;

      if (!hasExplicitProperties) {
        return {
          type: SchemaType.STRING,
          description: buildGeminiJsonStringDescription(schema.description),
        };
      }

      const parameters = convertJsonSchemaToGemini(schema);
      return parameters ? { ...parameters } : null;
    }
    default:
      return {
        type: SchemaType.STRING,
        ...(typeof schema.description === 'string'
          ? { description: schema.description }
          : {}),
      };
  }
}

export function resolveToolRegistryEntry(
  toolRegistry: AiToolRegistryEntry[],
  requestedName: string,
): AiToolRegistryEntry | null {
  const normalizedRequestedName = sanitizeToolFunctionName(requestedName);
  const exactMatch =
    toolRegistry.find(
      (item) =>
        item.encodedName === requestedName ||
        item.encodedName === normalizedRequestedName,
    ) ?? null;

  if (exactMatch) {
    return exactMatch;
  }

  const aliasMatches = toolRegistry.filter((item) => {
    const qualifiedAlias = sanitizeToolFunctionName(
      `${item.descriptor.serverName}__${item.descriptor.toolName}`,
    );
    const collapsedQualifiedAlias = sanitizeToolFunctionName(
      `${item.descriptor.serverName}_${item.descriptor.toolName}`,
    );
    const rawAlias = sanitizeToolFunctionName(item.descriptor.toolName);

    return [qualifiedAlias, collapsedQualifiedAlias, rawAlias].includes(
      normalizedRequestedName,
    );
  });

  if (aliasMatches.length === 1) {
    return aliasMatches[0];
  }

  const saplingMatch =
    aliasMatches.find((item) => item.descriptor.serverName === 'sapling') ??
    null;

  if (saplingMatch) {
    return saplingMatch;
  }

  return null;
}

export function parseToolArguments(
  argumentsJson: string,
): Record<string, unknown> {
  if (!argumentsJson.trim()) {
    return {};
  }

  return coerceJsonLikeValues(
    JSON.parse(argumentsJson) as Record<string, unknown>,
  );
}

export function normalizeFunctionCallArgs(
  functionCall: FunctionCall,
): Record<string, unknown> {
  if (!functionCall.args || typeof functionCall.args !== 'object') {
    return {};
  }

  const functionArgs = functionCall.args as Record<string, unknown>;

  if (typeof functionArgs.payload === 'string') {
    const parsedPayload = parseJsonLikeValue(functionArgs.payload);

    if (
      parsedPayload &&
      typeof parsedPayload === 'object' &&
      !Array.isArray(parsedPayload)
    ) {
      return coerceJsonLikeValues(parsedPayload as Record<string, unknown>);
    }
  }

  return coerceJsonLikeValues(functionArgs);
}

function coerceJsonLikeValues(
  args: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(args).map(([key, value]) => [
      key,
      parseJsonLikeValue(value),
    ]),
  );
}

function parseJsonLikeValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmedValue = value.trim();

  if (
    !(trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) &&
    !(trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
  ) {
    return value;
  }

  try {
    return JSON.parse(trimmedValue) as unknown;
  } catch {
    return value;
  }
}
