import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiGenericEntityOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityName',
      description: 'Der Name der Entität',
      enum: ['language', 'translation'], // Deine Whitelist
    }),
    ApiResponse({ status: 404, description: 'Entität oder Eintrag nicht gefunden' }),
    ApiResponse({ status: 400, description: 'Fehlerhafte Anfrage' })
  );
}