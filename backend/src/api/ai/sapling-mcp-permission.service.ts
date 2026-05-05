import { Injectable } from '@nestjs/common';
import type { GenericPermissionAction } from '../generic/generic.decorator';
import { GenericPermissionGuard } from '../../auth/guard/generic-permission.guard';
import type { PersonItem } from '../../entity/PersonItem';

@Injectable()
export class SaplingMcpPermissionService {
  constructor(
    private readonly genericPermissionGuard: GenericPermissionGuard,
  ) {}

  async assertEntityPermission(
    user: PersonItem,
    entityHandle: string,
    permission: GenericPermissionAction,
  ): Promise<void> {
    await this.genericPermissionGuard.assertPermissionForRequest(
      {
        method: this.mapPermissionToMethod(permission),
        params: { entityHandle },
        body: { entityHandle },
        user,
      },
      {
        entityHandle,
        permission,
      },
    );
  }

  private mapPermissionToMethod(permission: GenericPermissionAction): string {
    switch (permission) {
      case 'allowInsert':
        return 'POST';
      case 'allowUpdate':
        return 'PATCH';
      case 'allowDelete':
        return 'DELETE';
      case 'allowRead':
      default:
        return 'GET';
    }
  }
}
