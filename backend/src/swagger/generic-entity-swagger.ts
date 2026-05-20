import { ENTITY_REGISTRY } from '../entity/global/entity.registry';

type SwaggerSchema = {
  $ref?: string;
  allOf?: SwaggerSchema[];
  anyOf?: SwaggerSchema[];
  oneOf?: SwaggerSchema[];
  type?: string;
  title?: string;
  format?: string;
  nullable?: boolean;
  enum?: unknown[];
  properties?: Record<string, SwaggerSchema>;
  items?: SwaggerSchema;
  additionalProperties?: boolean | SwaggerSchema;
  required?: string[];
  example?: unknown;
  default?: unknown;
  readOnly?: boolean;
  writeOnly?: boolean;
};

type SwaggerExample = {
  summary: string;
  value: unknown;
};

type SwaggerMediaType = {
  schema?: SwaggerSchema;
  examples?: Record<string, SwaggerExample>;
  example?: unknown;
};

type SwaggerRequestBody = {
  description?: string;
  required?: boolean;
  content?: Record<string, SwaggerMediaType>;
};

type SwaggerResponse = {
  description?: string;
  content?: Record<string, SwaggerMediaType>;
};

type SwaggerOperation = {
  requestBody?: SwaggerRequestBody;
  responses?: Record<string, SwaggerResponse>;
};

type SwaggerDocument = {
  paths?: Record<
    string,
    | {
        get?: SwaggerOperation;
        post?: SwaggerOperation;
        patch?: SwaggerOperation;
        delete?: SwaggerOperation;
      }
    | undefined
  >;
  components?: {
    schemas?: Record<string, SwaggerSchema>;
  };
};

type ExampleMode = 'request' | 'response';

type EntitySchemaVariant = {
  handle: string;
  schemaName: string;
  schemaRef: { $ref: string };
  requestExample: unknown;
  responseExample: unknown;
};

const GENERIC_ENTITY_COLLECTION_PATH = '/api/generic/{entityHandle}';
const GENERIC_ENTITY_DOWNLOAD_PATH = '/api/generic/{entityHandle}/download';
const JSON_CONTENT_TYPE = 'application/json';
const PAGINATION_META_SCHEMA_REF = '#/components/schemas/PaginationMetaDto';
const ROOT_REQUEST_EXCLUDED_FIELDS = new Set([
  'handle',
  'createdAt',
  'updatedAt',
]);
const ENTITY_SCHEMA_NAMES = new Set(
  ENTITY_REGISTRY.map((entry) => entry.class.name),
);

export function enhanceGenericEntitySwaggerDocument(
  document: SwaggerDocument,
): SwaggerDocument {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return document;
  }

  const entityVariants: EntitySchemaVariant[] = [];

  for (const entry of ENTITY_REGISTRY) {
    const schemaName = entry.class.name;
    const rootSchema = schemas[schemaName];
    if (!rootSchema) {
      continue;
    }

    entityVariants.push({
      handle: entry.name,
      schemaName,
      schemaRef: { $ref: `#/components/schemas/${schemaName}` },
      requestExample: buildRootEntityExample(schemaName, schemas, 'request'),
      responseExample: buildRootEntityExample(schemaName, schemas, 'response'),
    });
  }

  if (entityVariants.length === 0) {
    return document;
  }

  const collectionPath = document.paths?.[GENERIC_ENTITY_COLLECTION_PATH];
  const downloadPath = document.paths?.[GENERIC_ENTITY_DOWNLOAD_PATH];

  if (collectionPath) {
    patchEntityListOperation(collectionPath.get, entityVariants);
    patchEntityCreateOperation(collectionPath.post, entityVariants);
    patchEntityUpdateOperation(collectionPath.patch, entityVariants);
  }

  if (downloadPath) {
    patchEntityDownloadOperation(downloadPath.get, entityVariants);
  }

  return document;
}

export function buildGenericEntitySwaggerUiScript(
  document: SwaggerDocument,
): string {
  const schemas = document.components?.schemas;
  if (!schemas) {
    return '';
  }

  const entitySchemaMap = Object.fromEntries(
    ENTITY_REGISTRY.filter((entry) => schemas[entry.class.name]).map(
      (entry) => [entry.name, entry.class.name],
    ),
  );

  const requestExamples = Object.fromEntries(
    ENTITY_REGISTRY.filter((entry) => schemas[entry.class.name]).map(
      (entry) => [
        entry.name,
        buildRootEntityExample(entry.class.name, schemas, 'request'),
      ],
    ),
  );

  return `
(function () {
  const GENERIC_ENTITY_COLLECTION_PATH = '${GENERIC_ENTITY_COLLECTION_PATH}';
  const GENERIC_ENTITY_DOWNLOAD_PATH = '${GENERIC_ENTITY_DOWNLOAD_PATH}';
  const ENTITY_SCHEMA_MAP = ${JSON.stringify(entitySchemaMap)};
  const REQUEST_EXAMPLES = ${JSON.stringify(requestExamples)};

  function normalize(value) {
    return String(value ?? '').trim();
  }

  function getOperationPath(block) {
    const pathElement = block.querySelector('.opblock-summary-path');
    return normalize(pathElement && pathElement.textContent);
  }

  function isSupportedGenericOperation(block) {
    const path = getOperationPath(block);
    return (
      path === GENERIC_ENTITY_COLLECTION_PATH ||
      path === GENERIC_ENTITY_DOWNLOAD_PATH
    );
  }

  function getParameterControl(block, parameterName) {
    const parameterLabels = block.querySelectorAll('.parameter__name');

    for (const label of parameterLabels) {
      if (normalize(label.textContent).startsWith(parameterName)) {
        const row =
          label.closest('tr') ||
          label.closest('.parameters-col_description') ||
          label.parentElement;

        if (!row) {
          continue;
        }

        const control = row.querySelector('select, input, textarea');
        if (control) {
          return control;
        }
      }
    }

    return null;
  }

  function dispatchControlChange(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncMatchingSelects(block, entityHandle) {
    const selects = block.querySelectorAll('select');

    for (const select of selects) {
      const matchingOption = Array.from(select.options).find(
        (option) =>
          normalize(option.value) === entityHandle ||
          normalize(option.textContent) === entityHandle,
      );

      if (matchingOption && select.value !== matchingOption.value) {
        select.value = matchingOption.value;
        dispatchControlChange(select);
      }
    }
  }

  function syncModelSelectors(block, entityHandle) {
    const schemaName = ENTITY_SCHEMA_MAP[entityHandle];
    if (!schemaName) {
      return;
    }

    const selectors = block.querySelectorAll(
      'select.model-box-control, .model-box-control select',
    );

    for (const selector of selectors) {
      const matchingOption = Array.from(selector.options).find(
        (option) =>
          normalize(option.value) === schemaName ||
          normalize(option.textContent) === schemaName ||
          normalize(option.value) === entityHandle ||
          normalize(option.textContent) === entityHandle,
      );

      if (matchingOption && selector.value !== matchingOption.value) {
        selector.value = matchingOption.value;
        dispatchControlChange(selector);
      }
    }
  }

  function syncRequestEditor(block, entityHandle) {
    const requestExample = REQUEST_EXAMPLES[entityHandle];
    if (!requestExample) {
      return;
    }

    const requestEditor = block.querySelector('textarea');
    if (!requestEditor) {
      return;
    }

    const serialized = JSON.stringify(requestExample, null, 2);
    if (requestEditor.value !== serialized) {
      requestEditor.value = serialized;
      dispatchControlChange(requestEditor);
    }
  }

  function syncGenericOperation(block) {
    const entityControl = getParameterControl(block, 'entityHandle');
    if (!entityControl) {
      return;
    }

    const entityHandle = normalize(entityControl.value);
    if (!entityHandle) {
      return;
    }

    syncMatchingSelects(block, entityHandle);
    syncModelSelectors(block, entityHandle);

    if (getOperationPath(block) === GENERIC_ENTITY_COLLECTION_PATH) {
      syncRequestEditor(block, entityHandle);
    }
  }

  function bindGenericOperation(block) {
    if (block.dataset.saplingEntitySwaggerBound === 'true') {
      syncGenericOperation(block);
      return;
    }

    const entityControl = getParameterControl(block, 'entityHandle');
    if (!entityControl) {
      return;
    }

    const onEntityChange = function () {
      window.setTimeout(function () {
        syncGenericOperation(block);
      }, 0);
    };

    entityControl.addEventListener('input', onEntityChange);
    entityControl.addEventListener('change', onEntityChange);
    block.dataset.saplingEntitySwaggerBound = 'true';
    syncGenericOperation(block);
  }

  function bindAllGenericOperations() {
    const blocks = document.querySelectorAll('.opblock');

    for (const block of blocks) {
      if (isSupportedGenericOperation(block)) {
        bindGenericOperation(block);
      }
    }
  }

  const observer = new MutationObserver(function () {
    bindAllGenericOperations();
  });

  function start() {
    bindAllGenericOperations();

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    window.setInterval(bindAllGenericOperations, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
  `.trim();
}

function patchEntityListOperation(
  operation: SwaggerOperation | undefined,
  entityVariants: EntitySchemaVariant[],
): void {
  if (!operation) {
    return;
  }

  const mediaType = ensureJsonResponse(operation, '200');
  mediaType.schema = {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: createEntityUnionSchema(entityVariants),
      },
      meta: {
        $ref: PAGINATION_META_SCHEMA_REF,
      },
    },
    required: ['data', 'meta'],
  };
  mediaType.examples = createPaginatedExamples(entityVariants);
}

function patchEntityCreateOperation(
  operation: SwaggerOperation | undefined,
  entityVariants: EntitySchemaVariant[],
): void {
  if (!operation) {
    return;
  }

  const requestMediaType = ensureJsonRequest(operation);
  requestMediaType.schema = createEntityUnionSchema(entityVariants);
  requestMediaType.examples = createEntityRequestExamples(entityVariants);

  const responseMediaType = ensureJsonResponse(operation, '201');
  responseMediaType.schema = createEntityUnionSchema(entityVariants);
  responseMediaType.examples = createEntityResponseExamples(entityVariants);
}

function patchEntityUpdateOperation(
  operation: SwaggerOperation | undefined,
  entityVariants: EntitySchemaVariant[],
): void {
  if (!operation) {
    return;
  }

  const requestMediaType = ensureJsonRequest(operation);
  requestMediaType.schema = createEntityUnionSchema(entityVariants);
  requestMediaType.examples = createEntityRequestExamples(entityVariants);

  const responseMediaType = ensureJsonResponse(operation, '200');
  responseMediaType.schema = createEntityUnionSchema(entityVariants);
  responseMediaType.examples = createEntityResponseExamples(entityVariants);
}

function patchEntityDownloadOperation(
  operation: SwaggerOperation | undefined,
  entityVariants: EntitySchemaVariant[],
): void {
  if (!operation) {
    return;
  }

  const mediaType = ensureJsonResponse(operation, '200');
  mediaType.schema = {
    type: 'array',
    items: createEntityUnionSchema(entityVariants),
  };
  mediaType.examples = Object.fromEntries(
    entityVariants.map((variant) => [
      variant.handle,
      {
        summary: `${variant.handle} download example`,
        value: [cloneExampleValue(variant.responseExample)],
      },
    ]),
  );
}

function ensureJsonRequest(operation: SwaggerOperation): SwaggerMediaType {
  operation.requestBody ??= {
    required: true,
    content: {},
  };
  operation.requestBody.content ??= {};
  operation.requestBody.content[JSON_CONTENT_TYPE] ??= {};
  return operation.requestBody.content[JSON_CONTENT_TYPE];
}

function ensureJsonResponse(
  operation: SwaggerOperation,
  statusCode: string,
): SwaggerMediaType {
  operation.responses ??= {};
  operation.responses[statusCode] ??= { description: '' };
  operation.responses[statusCode].content ??= {};
  operation.responses[statusCode].content[JSON_CONTENT_TYPE] ??= {};
  return operation.responses[statusCode].content[JSON_CONTENT_TYPE];
}

function createEntityUnionSchema(
  entityVariants: EntitySchemaVariant[],
): SwaggerSchema {
  return {
    oneOf: entityVariants.map((variant) => ({
      title: variant.handle,
      allOf: [cloneSchemaRef(variant.schemaRef)],
    })),
  };
}

function createEntityRequestExamples(
  entityVariants: EntitySchemaVariant[],
): Record<string, SwaggerExample> {
  return Object.fromEntries(
    entityVariants.map((variant) => [
      variant.handle,
      {
        summary: `${variant.handle} request example`,
        value: cloneExampleValue(variant.requestExample),
      },
    ]),
  );
}

function createEntityResponseExamples(
  entityVariants: EntitySchemaVariant[],
): Record<string, SwaggerExample> {
  return Object.fromEntries(
    entityVariants.map((variant) => [
      variant.handle,
      {
        summary: `${variant.handle} response example`,
        value: cloneExampleValue(variant.responseExample),
      },
    ]),
  );
}

function createPaginatedExamples(
  entityVariants: EntitySchemaVariant[],
): Record<string, SwaggerExample> {
  return Object.fromEntries(
    entityVariants.map((variant) => [
      variant.handle,
      {
        summary: `${variant.handle} list example`,
        value: {
          data: [cloneExampleValue(variant.responseExample)],
          meta: {
            total: 1,
            page: 1,
            limit: 1,
            totalPages: 1,
          },
        },
      },
    ]),
  );
}

function buildRootEntityExample(
  schemaName: string,
  components: Record<string, SwaggerSchema>,
  mode: ExampleMode,
): unknown {
  const rawExample = buildExampleFromSchema(
    { $ref: `#/components/schemas/${schemaName}` },
    components,
    {
      mode,
      depth: 0,
      seenRefs: new Set<string>(),
      propertyName: schemaName,
    },
  );

  if (mode !== 'request' || !isPlainObject(rawExample)) {
    return rawExample;
  }

  const sanitizedExample = { ...rawExample };
  for (const field of ROOT_REQUEST_EXCLUDED_FIELDS) {
    delete sanitizedExample[field];
  }

  return sanitizedExample;
}

function buildExampleFromSchema(
  schema: SwaggerSchema | undefined,
  components: Record<string, SwaggerSchema>,
  context: {
    mode: ExampleMode;
    depth: number;
    seenRefs: Set<string>;
    propertyName: string;
  },
): unknown {
  if (!schema) {
    return {};
  }

  if (schema.example !== undefined) {
    return cloneExampleValue(schema.example);
  }

  if (schema.default !== undefined) {
    return cloneExampleValue(schema.default);
  }

  if (schema.enum && schema.enum.length > 0) {
    return cloneExampleValue(schema.enum[0]);
  }

  if (schema.$ref) {
    return buildExampleFromReference(schema.$ref, components, context);
  }

  if (schema.allOf && schema.allOf.length > 0) {
    return schema.allOf.reduce<Record<string, unknown>>((accumulator, part) => {
      const partExample = buildExampleFromSchema(part, components, context);
      if (isPlainObject(partExample)) {
        return { ...accumulator, ...partExample };
      }

      return accumulator;
    }, {});
  }

  if (schema.oneOf && schema.oneOf.length > 0) {
    return buildExampleFromSchema(schema.oneOf[0], components, context);
  }

  if (schema.anyOf && schema.anyOf.length > 0) {
    return buildExampleFromSchema(schema.anyOf[0], components, context);
  }

  if (schema.type === 'array') {
    return [
      buildExampleFromSchema(schema.items, components, {
        ...context,
        depth: context.depth + 1,
        propertyName: singularize(context.propertyName),
      }),
    ];
  }

  if (
    schema.type === 'object' ||
    schema.properties ||
    schema.additionalProperties
  ) {
    return buildObjectExample(schema, components, context);
  }

  if (schema.nullable) {
    return null;
  }

  return buildPrimitiveExample(schema, context.propertyName);
}

function buildExampleFromReference(
  reference: string,
  components: Record<string, SwaggerSchema>,
  context: {
    mode: ExampleMode;
    depth: number;
    seenRefs: Set<string>;
    propertyName: string;
  },
): unknown {
  const schemaName = reference.split('/').pop();
  if (!schemaName) {
    return {};
  }

  if (context.depth > 0 && ENTITY_SCHEMA_NAMES.has(schemaName)) {
    return { handle: 1 };
  }

  if (context.seenRefs.has(reference)) {
    return { handle: 1 };
  }

  const targetSchema = components[schemaName];
  if (!targetSchema) {
    return {};
  }

  context.seenRefs.add(reference);
  const resolvedExample = buildExampleFromSchema(
    targetSchema,
    components,
    context,
  );
  context.seenRefs.delete(reference);
  return resolvedExample;
}

function buildObjectExample(
  schema: SwaggerSchema,
  components: Record<string, SwaggerSchema>,
  context: {
    mode: ExampleMode;
    depth: number;
    seenRefs: Set<string>;
    propertyName: string;
  },
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [propertyName, propertySchema] of Object.entries(
    schema.properties ?? {},
  )) {
    if (context.mode === 'request' && propertySchema.readOnly) {
      continue;
    }

    if (context.mode === 'response' && propertySchema.writeOnly) {
      continue;
    }

    result[propertyName] = buildExampleFromSchema(propertySchema, components, {
      ...context,
      depth: context.depth + 1,
      propertyName,
    });
  }

  if (Object.keys(result).length === 0 && schema.additionalProperties) {
    if (schema.additionalProperties === true) {
      return { key: 'value' };
    }

    return {
      key: buildExampleFromSchema(schema.additionalProperties, components, {
        ...context,
        depth: context.depth + 1,
        propertyName: 'key',
      }),
    };
  }

  return result;
}

function buildPrimitiveExample(
  schema: SwaggerSchema,
  propertyName: string,
): boolean | number | string | null {
  switch (schema.type) {
    case 'boolean':
      return false;
    case 'integer':
      return propertyName === 'handle' ? 1 : 0;
    case 'number':
      return 0;
    case 'string':
      return buildStringExample(propertyName, schema.format);
    default:
      return null;
  }
}

function buildStringExample(propertyName: string, format?: string): string {
  switch (format) {
    case 'date-time':
      return '2026-01-01T12:00:00.000Z';
    case 'date':
      return '2026-01-01';
    case 'email':
      return 'max.mustermann@example.com';
    case 'uri':
    case 'url':
      return 'https://example.com';
    case 'uuid':
      return '123e4567-e89b-12d3-a456-426614174000';
    default:
      break;
  }

  const normalizedPropertyName = propertyName.toLowerCase();

  if (normalizedPropertyName.includes('firstname')) {
    return 'Max';
  }

  if (normalizedPropertyName.includes('lastname')) {
    return 'Mustermann';
  }

  if (
    normalizedPropertyName.includes('email') ||
    normalizedPropertyName.includes('mail')
  ) {
    return 'max.mustermann@example.com';
  }

  if (
    normalizedPropertyName.includes('phone') ||
    normalizedPropertyName.includes('mobile')
  ) {
    return '+49 30 1234567';
  }

  if (normalizedPropertyName.includes('street')) {
    return 'Musterstrasse 1';
  }

  if (normalizedPropertyName.includes('zip')) {
    return '10115';
  }

  if (normalizedPropertyName.includes('city')) {
    return 'Berlin';
  }

  if (normalizedPropertyName.includes('country')) {
    return 'DE';
  }

  if (normalizedPropertyName.includes('language')) {
    return 'de';
  }

  if (normalizedPropertyName.includes('color')) {
    return '#4CAF50';
  }

  if (
    normalizedPropertyName.includes('website') ||
    normalizedPropertyName.includes('url')
  ) {
    return 'https://example.com';
  }

  if (normalizedPropertyName.includes('description')) {
    return 'Beispielbeschreibung';
  }

  if (normalizedPropertyName.includes('title')) {
    return 'Beispieltitel';
  }

  if (normalizedPropertyName === 'name') {
    return 'Beispiel';
  }

  if (normalizedPropertyName.includes('handle')) {
    return '1';
  }

  return `${propertyName} value`;
}

function singularize(value: string): string {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function cloneSchemaRef(schemaRef: SwaggerSchema): SwaggerSchema {
  return { ...schemaRef };
}

function cloneExampleValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
