import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";

export default async function AuditPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "OWNER" && user.role !== "ACCOUNTANT") {
    redirect("/dashboard");
  }

  const logs = await prisma.auditLog.findMany({
    where: { siteId: user.siteId },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
        Audit log
      </h1>
      <Card className="overflow-x-auto p-0">
        <table className="min-w-full text-sm">
          <thead className="bg-stone-50 text-left">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Action</th>
              <th className="px-3 py-2">Entity</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-3 py-2">
                  {l.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="px-3 py-2">{l.user?.name ?? "—"}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">
                  {l.entityType} {l.entityId ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
