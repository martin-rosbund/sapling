/**
 * Named handles for the seeded {@link RoleItem}s. Used by the
 * {@link PermissionSeeder} to map roles to their permission matrices and to
 * avoid magic numbers throughout the seeder logic.
 *
 * IMPORTANT: These values must match `RoleItem.handle` of the records seeded
 * by `seeder/json-{env}/role/`.
 */
export const ROLE_HANDLE = {
  ADMIN: 1,
  SUPPORT: 2,
  SALES: 3,
  CUSTOMER: 4,
  CONTRACTOR: 5,
} as const;

export type RoleHandle = (typeof ROLE_HANDLE)[keyof typeof ROLE_HANDLE];
