export function formatInr(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatQty(value: string | number, unit?: string) {
  const n = Number(value);
  const q = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 4,
  }).format(n);
  return unit ? `${q} ${unit}` : q;
}

export function statusTone(status: string) {
  switch (status) {
    case "POSTED":
    case "synced":
      return "success" as const;
    case "DRAFT":
    case "PENDING_SYNC":
    case "queued":
    case "syncing":
      return "warning" as const;
    case "CANCELLED":
    case "FAILED":
    case "failed":
      return "danger" as const;
    case "NEEDS_REVIEW":
    case "needs_review":
      return "info" as const;
    default:
      return "default" as const;
  }
}
