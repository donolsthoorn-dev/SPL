import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient, createClient } from "@/lib/supabase/server";
import { WeeklyPlan } from "@/lib/types";
import { requireAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

const planSchema = z.object({
  week_start: z.string().min(10),
  title: z.string().min(3).max(120),
  notes: z.string().max(4000).optional(),
});

async function signOut() {
  "use server";
  const supabase = await createActionClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function createPlan(formData: FormData) {
  "use server";
  const supabase = await createActionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const payload = planSchema.safeParse({
    week_start: formData.get("week_start"),
    title: formData.get("title"),
    notes: formData.get("notes"),
  });

  if (!payload.success) {
    redirect("/dashboard?error=Controleer%20de%20invoer");
  }

  const { error } = await supabase.from("weekly_plans").insert({
    week_start: payload.data.week_start,
    title: payload.data.title,
    notes: payload.data.notes || null,
    published: false,
    created_by: user.id,
  });

  if (error) {
    redirect("/dashboard?error=Kon%20planning%20niet%20opslaan");
  }

  redirect("/dashboard");
}

async function publishPlan(formData: FormData) {
  "use server";
  const id = formData.get("id")?.toString();
  if (!id) redirect("/dashboard");

  const supabase = await createActionClient();
  const { error } = await supabase
    .from("weekly_plans")
    .update({ published: true })
    .eq("id", id);

  if (error) {
    redirect("/dashboard?error=Publiceren%20mislukt");
  }

  redirect("/dashboard");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { user } = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase
    .from("weekly_plans")
    .select("*")
    .order("week_start", { ascending: false })
    .limit(20);

  const plans = (data ?? []) as WeeklyPlan[];

  return (
    <main className="stack">
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0 }}>HR weekplanning</h1>
          <p>Welkom, {user.email}</p>
          <p style={{ margin: "0.5rem 0 0" }}>
            <Link href="/planning">← Terug naar interactieve planning (prototype)</Link>
          </p>
        </div>
        <form action={signOut}>
          <button type="submit" className="secondary">
            Uitloggen
          </button>
        </form>
      </div>

      {params.error ? (
        <p style={{ color: "#b42318", margin: 0 }}>{params.error}</p>
      ) : null}

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Nieuwe planning maken</h2>
        <form action={createPlan} className="stack">
          <label>
            Week startdatum
            <input name="week_start" type="date" required />
          </label>
          <label>
            Titel
            <input name="title" type="text" placeholder="Bijv. Week 16 planning" required />
          </label>
          <label>
            Opmerkingen
            <textarea
              name="notes"
              rows={5}
              placeholder="Zet hier de planningstekst die met medewerkers gedeeld wordt."
            />
          </label>
          <button type="submit">Planning opslaan</button>
        </form>
      </section>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Recente planningen</h2>
        {plans.length === 0 ? <p>Nog geen planningen.</p> : null}
        {plans.map((plan) => (
          <article
            key={plan.id}
            className="card"
            style={{ background: "#f8faff", borderColor: "#d6e1f3" }}
          >
            <h3 style={{ marginTop: 0 }}>
              {plan.title} ({plan.week_start})
            </h3>
            <p style={{ whiteSpace: "pre-wrap" }}>{plan.notes || "-"}</p>
            <p>Status: {plan.published ? "Gedeeld met medewerkers" : "Concept"}</p>
            {!plan.published ? (
              <form action={publishPlan}>
                <input name="id" type="hidden" value={plan.id} />
                <button type="submit">Publiceren</button>
              </form>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
