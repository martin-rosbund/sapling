import { Injectable } from '@nestjs/common';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { GenericReferenceService } from './generic-reference.service';

@Injectable()
export class GenericPayloadService {
  constructor(
    private readonly genericReferenceService: GenericReferenceService,
  ) {}

  prepareCreatePayload(
    template: EntityTemplateDto[] = [],
    data: Record<string, any>,
  ): Record<string, any> {
    return this.preparePayload(template, data, {
      removeAutoIncrement: true,
    });
  }

  prepareUpdatePayload(
    template: EntityTemplateDto[] = [],
    data: Record<string, any>,
  ): Record<string, any> {
    return this.preparePayload(template, data, {
      removeAutoIncrement: false,
    });
  }

  buildDependencyValidationPayload(
    item: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      ...item,
      ...data,
    };
  }

  private preparePayload(
    template: EntityTemplateDto[],
    data: Record<string, any>,
    options: { removeAutoIncrement: boolean },
  ): Record<string, any> {
    if (!template.length) {
      return data;
    }

    const nextData = this.genericReferenceService.reduceReferenceFields(
      template,
      data,
    ) as Record<string, any>;

    for (const field of template) {
      const isReadOnly = field.options?.includes('isReadOnly');
      const shouldRemove =
        isReadOnly || (options.removeAutoIncrement && field.isAutoIncrement);

      if (shouldRemove && typeof field.name !== 'undefined') {
        delete nextData[field.name];
      }
    }

    return nextData;
  }
}
