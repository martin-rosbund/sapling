/**
 * @module
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Decorators for generic entity operations. Adds Swagger API decorators for documentation and validation.
 *
 * @function        ApiGenericEntityOperation         Adds Swagger decorators for generic entity operations
 * @function        ApiGenericEntityReferenceOperation Adds Swagger decorators for generic entity reference operations
 */

import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';

/**
 * Adds Swagger API decorators for generic entity operations.
 * @param {string} summary Summary description for the operation
 * @returns {MethodDecorator} Decorator for Swagger documentation
 */
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

/**
 * Adds Swagger API decorators for generic entity reference operations.
 * @param {string} summary Summary description for the operation
 * @returns {MethodDecorator} Decorator for Swagger documentation
 */
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
