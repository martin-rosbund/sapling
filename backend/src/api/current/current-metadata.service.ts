import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { EntityItem } from '../../entity/EntityItem';
import { PersonItem } from '../../entity/PersonItem';
import { TemplateService } from '../template/template.service';
import { EntityTemplateDto } from '../template/dto/entity-template.dto';
import { AccumulatedPermissionDto } from './dto/accumulated-permission.dto';
import { CurrentService } from './current.service';

export interface CurrentEntityMetadataDto {
  entityHandle: string;
  entity: EntityItem | null;
  entityPermission: AccumulatedPermissionDto;
  entityTemplates: EntityTemplateDto[];
}

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
    const [entity, entityTemplates] = await Promise.all([
      this.em.findOne(EntityItem, { handle: entityHandle }),
      Promise.resolve(this.templateService.getEntityTemplate(entityHandle)),
    ]);

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
