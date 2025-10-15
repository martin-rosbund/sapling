import { Controller, Get, Param } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import { ApiGenericEntityOperation } from 'src/generic/generic.decorator';
import { TemplateService } from './template.service';

@Controller('template')
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
  ) {}

  @Get(':entityName')
  @ApiGenericEntityOperation(
    'Gibt die Eigenschaften (Spalten) einer Entität zurück',
  )
  @ApiResponse({
    status: 200,
    description: 'Metadaten der Entität',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          length: { type: 'number', nullable: true },
          nullable: { type: 'boolean' },
          default: { type: 'any', nullable: true },
          isPrimaryKey: { type: 'boolean' },
        },
      },
    },
  })
  getEntityTemplate(@Param('entityName') entityName: string) {
    return this.templateService.getEntityTemplate(entityName);
  }
}
