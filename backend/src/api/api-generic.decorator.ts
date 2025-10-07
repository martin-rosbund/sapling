import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function ApiGenericEntityOperation(summary: string) {
  return applyDecorators(
    ApiOperation({ summary }),
    ApiParam({
      name: 'entityName',
      description: 'Der Name der Entität',
      enum: [
        'company',
        'contract',
        'entity',
        'role',
        'language',
        'note',
        'permission',
        'person',
        'product',
        'right',
        'ticket',
        'ticket-priority',
        'ticket-status',
        'translation',
      ],
    }),
    ApiResponse({
      status: 404,
      description: 'Entität oder Eintrag nicht gefunden',
    }),
    ApiResponse({ status: 400, description: 'Fehlerhafte Anfrage' }),
  );
}
