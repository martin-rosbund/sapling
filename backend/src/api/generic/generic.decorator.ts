import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';

// Adds Swagger API decorators for generic entity operations
export function ApiGenericEntityOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityName',
      description: 'The name of the entity',
      enum: ENTITY_NAMES,
    }),
    ApiResponse({
      status: 404,
      description: 'Entity or entry not found',
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
  );
}

export function ApiGenericEntityReferenceOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityName',
      description: 'The name of the entity',
      enum: ENTITY_NAMES,
    }),
    ApiParam({
      name: 'referenceName',
      description: 'The name of the entity',
      enum: ENTITY_NAMES,
    }),
    ApiResponse({
      status: 404,
      description: 'Entity or entry not found',
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
  );
}
