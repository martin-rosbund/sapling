/**
 * @module
 * @version         1.0
 * @author          Martin Rosbund
 * @summary         Decorators for generic entity operations. Adds Swagger API decorators for documentation and validation.
 *
 * @function        ApiGenericEntityOperation         Adds Swagger decorators for generic entity operations
 * @function        ApiGenericEntityReferenceOperation Adds Swagger decorators for generic entity reference operations
 */

import { applyDecorators, SetMetadata } from '@nestjs/common';
import type { EntityManager } from '@mikro-orm/core';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Request } from 'express';
import { ENTITY_HANDLES } from '../../entity/global/entity.registry';

export const GENERIC_PERMISSION_KEY = 'generic:permission';
export const GENERIC_PERMISSION_ENTITY_KEY = 'generic:permission:entity';
export const GENERIC_PERMISSION_RESOLVE_KEY = 'generic:permission:resolve';

export type GenericPermissionAction =
  | 'allowRead'
  | 'allowInsert'
  | 'allowUpdate'
  | 'allowDelete';

export type GenericPermissionResolution =
  | string
  | {
      entityHandle?: string;
      permission?: GenericPermissionAction;
    };

export type GenericPermissionResolver = (
  request: Request,
  em: EntityManager,
) =>
  | GenericPermissionResolution
  | null
  | undefined
  | Promise<GenericPermissionResolution | null | undefined>;

export function GenericPermission(permission: GenericPermissionAction) {
  return SetMetadata(GENERIC_PERMISSION_KEY, permission);
}

export function GenericPermissionEntity(entityHandle: string) {
  return SetMetadata(GENERIC_PERMISSION_ENTITY_KEY, entityHandle);
}

export function GenericPermissionResolve(resolver: GenericPermissionResolver) {
  return SetMetadata(GENERIC_PERMISSION_RESOLVE_KEY, resolver);
}

/**
 * Adds Swagger API decorators for generic entity operations.
 * @param {string} summary Summary description for the operation
 * @returns {MethodDecorator} Decorator for Swagger documentation
 */
export function ApiGenericEntityOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityHandle',
      description: 'The name of the entity',
      enum: ENTITY_HANDLES,
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
      name: 'entityHandle',
      description: 'The name of the entity',
      enum: ENTITY_HANDLES,
    }),
    ApiParam({
      name: 'referenceName',
      description: 'The name of the entity',
      enum: ENTITY_HANDLES,
    }),
    ApiResponse({
      status: 404,
      description: 'Entity or entry not found',
    }),
    ApiResponse({ status: 400, description: 'Bad request' }),
  );
}
