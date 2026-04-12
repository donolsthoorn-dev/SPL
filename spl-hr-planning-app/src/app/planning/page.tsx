import { requireAdmin } from "@/lib/require-admin";
import { PlanningWorkspace } from "./PlanningWorkspace";

export const dynamic = "force-dynamic";

export default async function PlanningPage() {
  const { user } = await requireAdmin();
  const email = user.email ?? "";
  const iframeSrc = `/prototype/index.html?user=${encodeURIComponent(email)}`;

  return (
    <div className="planning-shell">
      <PlanningWorkspace iframeSrc={iframeSrc} />
    </div>
  );
}
