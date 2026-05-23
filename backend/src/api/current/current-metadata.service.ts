import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { TemplateService } from '../template/template.service';
import { CurrentService } from './current.service';
import { CurrentEntityMetadataDto } from './dto/current-entity-metadata.dto';
import { FormConfigService } from '../form-config/form-config.service';

/**
 * Loads batched entity metadata required by generic frontend workspaces.
 */
@Injectable()
export class CurrentMetadataService {
  //#region Constructor
  constructor(
    private readonly em: EntityManager,
    private readonly templateService: TemplateService,
    private readonly currentService: CurrentService,
    private readonly formConfigService: FormConfigService,
  ) {}
  //#endregion

  //#region Entity Metadata
  /**
   * Returns entity definition, templates and accumulated permissions for unique handles.
   */
  async getEntityMetadata(
    person: PersonItem,
    entityHandles: string[],
  ): Promise<CurrentEntityMetadataDto[]> {
    const uniqueEntityHandles = [...new Set(entityHandles)]
      .map((entityHandle) => entityHandle.trim())
      .filter((entityHandle) => entityHandle.length > 0);

    return Promise.all(
      uniqueEntityHandles.map((entityHandle) =>
        this.getSingleEntityMetadata(person, entityHandle),
      ),
    );
  }

  private async getSingleEntityMetadata(
    person: PersonItem,
    entityHandle: string,
  ): Promise<CurrentEntityMetadataDto> {
    const [entity, baseTemplates] = await Promise.all([
      this.em.findOne(EntityItem, { handle: entityHandle }),
      Promise.resolve(this.templateService.getEntityTemplate(entityHandle)),
    ]);
    const entityTemplates = await this.formConfigService.getEffectiveTemplate(
      entityHandle,
      baseTemplates,
      person,
    );

    return {
      entityHandle,
      entity,
      entityPermission: this.currentService.getEntityPermissions(
        person,
        entityHandle,
      ),
      entityTemplates,
    };
  }
  //#endregion
}
