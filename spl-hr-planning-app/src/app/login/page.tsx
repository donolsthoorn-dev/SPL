import { redirect } from "next/navigation";
import { z } from "zod";
import { createActionClient } from "@/lib/supabase/server";
import "./login.css";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

async function signIn(formData: FormData) {
  "use server";

  const payload = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!payload.success) {
    redirect("/login?error=Ongeldige%20gegevens");
  }

  const supabase = await createActionClient();
  const { error } = await supabase.auth.signInWithPassword(payload.data);

  if (error) {
    redirect("/login?error=Inloggen%20mislukt");
  }

  redirect("/planning");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-page">
      <div className="login-card stack">
        <h1 className="login-title">Admin login</h1>
        <p className="login-subtitle">Log in als HR admin om de weekplanning te beheren.</p>
        {params.error ? <p className="login-error">{params.error}</p> : null}
        <form action={signIn} className="login-form">
          <label className="login-label">
            E-mail
            <input className="login-field" name="email" type="email" required />
          </label>
          <label className="login-label">
            Wachtwoord
            <input className="login-field" name="password" type="password" required minLength={8} />
          </label>
          <button className="login-submit" type="submit">
            Inloggen
          </button>
        </form>
      </div>
    </main>
  );
}
