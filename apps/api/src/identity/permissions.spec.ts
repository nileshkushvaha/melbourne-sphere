import { ALL_PERMISSION_KEYS, ACTIVE_PERMISSION_KEYS, isActivePermissionKey, isPermissionKey, PERMISSION_MODULES, PERMISSIONS, permissionDefinition } from './permissions.js';

describe('permission catalogue (SRS RBAC 002)', () => {
  it('uses the documented resource.action convention', () => {
    for (const key of ALL_PERMISSION_KEYS) {
      expect(key, key).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
    }
  });

  it('gives every entry a label, a description and a known module for the admin matrix', () => {
    for (const key of ALL_PERMISSION_KEYS) {
      const definition = permissionDefinition(key);
      expect(definition.label.length, key).toBeGreaterThan(2);
      expect(definition.description.length, key).toBeGreaterThan(5);
      expect(PERMISSION_MODULES, key).toContain(definition.module);
    }
  });

  it('recognises only registered codes, and only active ones grant access', () => {
    expect(isPermissionKey('listings.read')).toBe(true);
    expect(isPermissionKey('listings.everything')).toBe(false);
    expect(isActivePermissionKey('roles.update')).toBe(true);
    expect(isActivePermissionKey('nonsense')).toBe(false);
    expect(ACTIVE_PERMISSION_KEYS.every((key) => (PERMISSIONS[key] as { active?: false }).active !== false)).toBe(true);
  });

  it('covers access control itself, so role editing is not reachable without a grant', () => {
    for (const key of ['roles.view', 'roles.create', 'roles.update', 'roles.delete', 'permissions.view', 'admins.access.manage'] as const) {
      expect(ALL_PERMISSION_KEYS).toContain(key);
    }
  });
});
