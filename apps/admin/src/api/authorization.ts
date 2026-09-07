import { httpClient, type HttpClient } from './http-client';

/**
 * Access administration client (SRS RBAC 008). Types are declared here rather
 * than generated: these endpoints return plain projections, and the API remains
 * the authority — every call is permission-checked server-side whatever this
 * client sends.
 */
export interface PermissionCatalogEntry {
  key: string;
  label: string;
  description: string;
  module: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface RoleListItem {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  isActive: boolean;
  version: number;
  adminCount: number;
  permissionCount: number;
  updatedAt: string;
}

export interface RoleRecord extends Omit<RoleListItem, 'permissionCount'> {
  permissions: string[];
}

export interface AdminAccessRecord {
  adminId: string;
  displayName: string;
  email: string;
  status: string;
  version: number;
  roles: { id: string; key: string; name: string; isActive: boolean }[];
  directPermissions: string[];
  inheritedPermissions: string[];
  effectivePermissions: string[];
  /** Where each effective permission comes from: role keys and/or 'direct'. */
  sources: Record<string, string[]>;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
}

export function authorizationApi(client: HttpClient = httpClient) {
  return {
    permissions: (signal?: AbortSignal) => client.request<{ data: PermissionCatalogEntry[] }>('/admin/permissions', { signal }).then((r) => r.data.data),

    listRoles: (params: { page: number; pageSize: number; q?: string }, signal?: AbortSignal) => {
      const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
      if (params.q) search.set('q', params.q);
      return client.request<Paginated<RoleListItem>>(`/admin/roles?${search.toString()}`, { signal }).then((r) => r.data);
    },
    getRole: (id: string, signal?: AbortSignal) => client.request<{ data: RoleRecord }>(`/admin/roles/${id}`, { signal }).then((r) => r.data.data),
    createRole: (body: { key: string; name: string; description: string; permissions: string[] }) =>
      client.request<{ data: RoleRecord }>('/admin/roles', { method: 'POST', body }).then((r) => r.data.data),
    updateRole: (id: string, body: { name?: string; description?: string; isActive?: boolean; expectedVersion: number }) =>
      client.request<{ data: RoleRecord }>(`/admin/roles/${id}`, { method: 'PATCH', body }).then((r) => r.data.data),
    replaceRolePermissions: (id: string, body: { permissions: string[]; expectedVersion: number }) =>
      client.request<{ data: RoleRecord }>(`/admin/roles/${id}/permissions`, { method: 'PUT', body }).then((r) => r.data.data),
    deleteRole: (id: string) => client.request<void>(`/admin/roles/${id}`, { method: 'DELETE' }).then(() => undefined),

    getAdminAccess: (adminId: string, signal?: AbortSignal) =>
      client.request<{ data: AdminAccessRecord }>(`/admin/admins/${adminId}/access`, { signal }).then((r) => r.data.data),
    replaceAdminRoles: (adminId: string, body: { roleIds: string[]; expectedVersion: number }) =>
      client.request<{ data: AdminAccessRecord }>(`/admin/admins/${adminId}/roles`, { method: 'PUT', body }).then((r) => r.data.data),
    replaceAdminPermissions: (adminId: string, body: { permissions: string[]; expectedVersion: number }) =>
      client.request<{ data: AdminAccessRecord }>(`/admin/admins/${adminId}/permissions`, { method: 'PUT', body }).then((r) => r.data.data),
  };
}
