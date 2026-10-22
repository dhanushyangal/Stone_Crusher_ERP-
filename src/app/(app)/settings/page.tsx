import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [site, settings, sequences, units] = await Promise.all([
    prisma.site.findUnique({ where: { id: user.siteId } }),
    prisma.businessSetting.findMany({ where: { siteId: user.siteId } }),
    prisma.invoiceSequence.findMany({ where: { siteId: user.siteId } }),
    prisma.unit.findMany({ where: { siteId: user.siteId } }),
  ]);

  const factor = settings.find((s) => s.key === "billing_to_tune_factor");

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-source-serif)] text-3xl font-bold">
        Settings
      </h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Site</h2>
          <p className="mt-2">{site?.name}</p>
          <p className="text-sm text-stone-600">{site?.address}</p>
          <p className="mt-2 text-sm">Timezone: Asia/Kolkata · Currency: INR</p>
        </Card>
        <Card>
          <h2 className="font-semibold">Unit conversion</h2>
          <p className="mt-2 text-lg font-bold">
            1 billing unit = {String(factor?.value ?? 4)} tunes
          </p>
          <ul className="mt-3 text-sm text-stone-600">
            {units.map((u) => (
              <li key={u.id}>
                {u.code} — {u.name}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Invoice sequences</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {sequences.map((s) => (
              <li key={s.id}>
                {s.series}: next {s.prefix}
                {String(s.nextNumber).padStart(s.padding, "0")}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">GST / statutory</h2>
          <p className="mt-2 text-sm text-stone-600">
            GSTIN, HSN, and e-invoicing wording are intentionally not fabricated.
            Configure after accountant review.
          </p>
        </Card>
      </div>
    </div>
  );
}
