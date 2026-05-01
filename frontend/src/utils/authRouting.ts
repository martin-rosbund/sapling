import type { PersonItem } from '@/entity/entity'

export function hasAssignedRoles(person?: PersonItem | null): boolean {
  return Array.isArray(person?.roles) && person.roles.length > 0
}

export function resolvePostLoginPath(person?: PersonItem | null): string {
  return hasAssignedRoles(person) ? '/' : '/access-pending'
}
