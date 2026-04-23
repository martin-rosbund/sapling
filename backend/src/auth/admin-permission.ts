import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMISSION_KEY = 'admin:permission';

export function AdminPermission(required = true) {
  return SetMetadata(ADMIN_PERMISSION_KEY, required);
}
