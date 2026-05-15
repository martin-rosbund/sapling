import type { AccumulatedPermission } from '@/entity/structure'

/**
 * Generic entity workspaces require both navigation visibility and read access.
 */
export function canAccessEntityWorkspace(
  permission: AccumulatedPermission | null | undefined,
): boolean {
  return permission?.allowShow === true && permission.allowRead === true
}
