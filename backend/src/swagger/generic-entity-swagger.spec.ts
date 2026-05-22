import { describe, expect, it } from '@jest/globals';
import {
  buildGenericEntitySwaggerUiScript,
  enhanceGenericEntitySwaggerDocument,
} from './generic-entity-swagger';

type TestSwaggerDocument = Parameters<
  typeof enhanceGenericEntitySwaggerDocument
>[0];

function createDocument(): TestSwaggerDocument {
  return {
    paths: {
      '/api/generic/{entityHandle}': {
        get: {
          responses: {
            '200': { description: 'ok' },
          },
        },
        post: {
          responses: {
            '201': { description: 'created' },
          },
        },
        patch: {
          responses: {
            '200': { description: 'updated' },
          },
        },
      },
      '/api/generic/{entityHandle}/download': {
        get: {
          responses: {
            '200': { description: 'ok' },
          },
        },
      },
    },
    components: {
      schemas: {
        PaginationMetaDto: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        AddressItem: {
          type: 'object',
          properties: {
            handle: { type: 'integer' },
            city: { type: 'string' },
          },
        },
        CompanyItem: {
          type: 'object',
          properties: {
            handle: { type: 'integer' },
            name: { type: 'string' },
            address: {
              $ref: '#/components/schemas/AddressItem',
            },
            addresses: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/AddressItem',
              },
            },
          },
        },
      },
    },
  };
}

describe('generic entity swagger', () => {
  it('uses lightweight schemas for generic endpoints', () => {
    const document = enhanceGenericEntitySwaggerDocument(createDocument());
    const collectionPath = document.paths?.['/api/generic/{entityHandle}'];
    const listMediaType =
      collectionPath?.get?.responses?.['200']?.content?.['application/json'];
    const createRequestMediaType =
      collectionPath?.post?.requestBody?.content?.['application/json'];
    const createResponseMediaType =
      collectionPath?.post?.responses?.['201']?.content?.['application/json'];

    expect(listMediaType?.schema).not.toHaveProperty('oneOf');
    expect(createRequestMediaType?.schema).toMatchObject({
      type: 'object',
      additionalProperties: true,
    });
    expect(createResponseMediaType?.schema).toMatchObject({
      type: 'object',
      additionalProperties: true,
    });
  });

  it('collapses nested references to schema-name strings in examples', () => {
    const document = enhanceGenericEntitySwaggerDocument(createDocument());
    const createExamples =
      document.paths?.['/api/generic/{entityHandle}']?.post?.requestBody
        ?.content?.['application/json']?.examples;
    const companyExample = createExamples?.company?.value as
      | Record<string, unknown>
      | undefined;

    expect(companyExample).toBeDefined();
    expect(companyExample?.address).toBe('AddressItem');
    expect(companyExample?.addresses).toEqual(['AddressItem']);
  });

  it('only reloads request examples when entity or example selection changes', () => {
    const script = buildGenericEntitySwaggerUiScript(createDocument());

    expect(script).toContain('saplingRequestExampleLoaded');
    expect(script).toContain('if (entityChanged)');
    expect(script).toContain(
      "selector.addEventListener('change', onRequestExampleChange);",
    );
  });
});
