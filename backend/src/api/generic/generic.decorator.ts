import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ENTITY_NAMES } from '../../entity/global/entity.registry';

// Adds Swagger API decorators for generic entity operations
export function ApiGenericEntityOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityName',
      description: 'Der Name der Entität', // The name of the entity
      enum: ENTITY_NAMES,
    }),
    ApiResponse({
      status: 404,
      description: 'Entität oder Eintrag nicht gefunden', // Entity or entry not found
    }),
    ApiResponse({ status: 400, description: 'Fehlerhafte Anfrage' }), // Bad request
  );
}
