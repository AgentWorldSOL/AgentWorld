import type { Request, Response, NextFunction } from "express";

export type Permission =
  | "agents:read"
  | "agents:write"
  | "agents:delete"
  | "tasks:read"
  | "tasks:write"
  | "tasks:delete"
  | "tasks:assign"
  | "wallet:read"
  | "wallet:transfer"
  | "wallet:admin"
  | "org:read"
  | "org:write"
  | "org:admin"
  | "analytics:read"
  | "settings:read"
  | "settings:write";

export type Role = "viewer" | "member" | "manager" | "admin" | "owner";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  viewer: [
    "agents:read",
    "tasks:read",
    "wallet:read",
    "org:read",
    "analytics:read",
    "settings:read",
  ],
  member: [
    "agents:read",
    "agents:write",
    "tasks:read",
    "tasks:write",
    "tasks:assign",
    "wallet:read",
    "org:read",
    "analytics:read",
    "settings:read",
  ],
  manager: [
    "agents:read",
    "agents:write",
    "agents:delete",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "tasks:assign",
    "wallet:read",
    "wallet:transfer",
    "org:read",
    "org:write",
    "analytics:read",
    "settings:read",
    "settings:write",
  ],
  admin: [
    "agents:read",
    "agents:write",
    "agents:delete",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "tasks:assign",
    "wallet:read",
    "wallet:transfer",
    "wallet:admin",
    "org:read",
    "org:write",
    "org:admin",
    "analytics:read",
    "settings:read",
    "settings:write",
  ],
  owner: [
    "agents:read",
    "agents:write",
    "agents:delete",
    "tasks:read",
    "tasks:write",
    "tasks:delete",
    "tasks:assign",
    "wallet:read",
    "wallet:transfer",
    "wallet:admin",
    "org:read",
    "org:write",
    "org:admin",
    "analytics:read",
    "settings:read",
    "settings:write",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

export function hasAllPermissions(role: Role, required: Permission[]): boolean {
  return required.every((p) => hasPermission(role, p));
}

export function hasAnyPermission(role: Role, required: Permission[]): boolean {
  return required.some((p) => hasPermission(role, p));
}

export function getPermissionsForRole(role: Role): Permission[] {
  return [...(ROLE_PERMISSIONS[role] || [])];
}

export function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as unknown as Record<string, unknown>).userRole as Role | undefined;

    if (!userRole) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    if (!hasAllPermissions(userRole, permissions)) {
      const missing = permissions.filter((p) => !hasPermission(userRole, p));
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Insufficient permissions",
          required: permissions,
          missing,
        },
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = (req as unknown as Record<string, unknown>).userRole as Role | undefined;

    if (!userRole) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      });
      return;
    }

    if (!hasAnyPermission(userRole, permissions)) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "None of the required permissions found",
          requiredAny: permissions,
        },
      });
      return;
    }

    next();
  };
}

export function inferRoleFromAgentRole(agentRole: string): Role {
  const mapping: Record<string, Role> = {
    ceo: "owner",
    cto: "admin",
    cfo: "admin",
    cmo: "admin",
    coo: "admin",
    vp_engineering: "manager",
    vp_marketing: "manager",
    vp_sales: "manager",
    engineering_lead: "manager",
    product_manager: "manager",
    senior_developer: "member",
    developer: "member",
    designer: "member",
    analyst: "viewer",
    intern: "viewer",
  };

  return mapping[agentRole.toLowerCase()] || "member";
}
