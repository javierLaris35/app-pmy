import { axiosConfig } from "../axios-config";

export interface RbacPermission { id: string; code: string; name: string; groupName: string; description?: string }
export interface RbacRole { id: string; key: string; name: string; description?: string; isSystem: boolean; permissionCodes: string[] }
export type PermissionEffect = "allow" | "deny";
export interface UserPermissionInfo {
  userId: string;
  roleKey: string;
  rolePermissionCodes: string[];
  overrides: { code: string; effect: PermissionEffect }[];
  effective: string[];
}

export const getPermissions = async () => {
  const res = await axiosConfig.get<{ permissions: RbacPermission[]; groups: Record<string, RbacPermission[]> }>("rbac/permissions");
  return res.data;
};

export const getRoles = async () => {
  const res = await axiosConfig.get<RbacRole[]>("rbac/roles");
  return res.data;
};

export const createRole = async (payload: { key: string; name: string; description?: string; permissionCodes?: string[] }) => {
  const res = await axiosConfig.post("rbac/roles", payload);
  return res.data;
};

export const updateRole = async (id: string, payload: { name?: string; description?: string }) => {
  const res = await axiosConfig.patch(`rbac/roles/${id}`, payload);
  return res.data;
};

export const deleteRole = async (id: string) => {
  const res = await axiosConfig.delete(`rbac/roles/${id}`);
  return res.data;
};

export const setRolePermissions = async (id: string, permissionCodes: string[]) => {
  const res = await axiosConfig.put(`rbac/roles/${id}/permissions`, { permissionCodes });
  return res.data;
};

export const getUserPermissions = async (userId: string) => {
  const res = await axiosConfig.get<UserPermissionInfo>(`rbac/users/${userId}/permissions`);
  return res.data;
};

export const setUserPermissions = async (userId: string, overrides: { code: string; effect: PermissionEffect }[]) => {
  const res = await axiosConfig.put<UserPermissionInfo>(`rbac/users/${userId}/permissions`, { overrides });
  return res.data;
};
