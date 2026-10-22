import type { UserRole } from "@prisma/client";

export type Permission =
  | "settings.manage"
  | "users.manage"
  | "customers.manage"
  | "suppliers.manage"
  | "products.manage"
  | "production.manage"
  | "purchases.manage"
  | "sales.create"
  | "sales.post"
  | "sales.cancel"
  | "sales.override_rate"
  | "dispatch.manage"
  | "stock.view"
  | "stock.adjust"
  | "payments.manage"
  | "expenses.manage"
  | "expenses.approve"
  | "reports.view"
  | "reports.profit"
  | "audit.view"
  | "sync.resolve"
  | "cash.manage";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "settings.manage",
    "users.manage",
    "customers.manage",
    "suppliers.manage",
    "products.manage",
    "production.manage",
    "purchases.manage",
    "sales.create",
    "sales.post",
    "sales.cancel",
    "sales.override_rate",
    "dispatch.manage",
    "stock.view",
    "stock.adjust",
    "payments.manage",
    "expenses.manage",
    "expenses.approve",
    "reports.view",
    "reports.profit",
    "audit.view",
    "sync.resolve",
    "cash.manage",
  ],
  MANAGER: [
    "customers.manage",
    "suppliers.manage",
    "products.manage",
    "production.manage",
    "purchases.manage",
    "sales.create",
    "sales.post",
    "dispatch.manage",
    "stock.view",
    "stock.adjust",
    "payments.manage",
    "expenses.manage",
    "reports.view",
    "sync.resolve",
  ],
  SALES_OPERATOR: [
    "sales.create",
    "dispatch.manage",
    "stock.view",
    "customers.manage",
  ],
  CASHIER: [
    "payments.manage",
    "expenses.manage",
    "cash.manage",
    "reports.view",
  ],
  ACCOUNTANT: [
    "reports.view",
    "reports.profit",
    "audit.view",
    "stock.view",
  ],
};

export function permissionsForRole(
  role: UserRole,
  extra: string[] = [],
): Permission[] {
  const base = ROLE_PERMISSIONS[role] ?? [];
  const extras = extra.filter((p): p is Permission =>
    Object.values(ROLE_PERMISSIONS)
      .flat()
      .includes(p as Permission),
  );
  return Array.from(new Set([...base, ...extras]));
}

export function hasPermission(
  role: UserRole,
  permission: Permission,
  extra: string[] = [],
): boolean {
  return permissionsForRole(role, extra).includes(permission);
}

export function assertPermission(
  role: UserRole,
  permission: Permission,
  extra: string[] = [],
): void {
  if (!hasPermission(role, permission, extra)) {
    throw new PermissionError(`Missing permission: ${permission}`);
  }
}

export class PermissionError extends Error {
  status = 403;
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}
