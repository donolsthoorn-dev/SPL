import nodemailer from "nodemailer";
import { createPublicPlanningToken } from "@/lib/public-planning-token";

type Recipient = {
  id: string;
  name: string;
  email: string;
};

type SendPlanningPublishEmailsArgs = {
  weekStart: string;
  planTitle: string;
  notes?: string | null;
  recipients: Recipient[];
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} ontbreekt in de server-configuratie.`);
  return value;
}

function getPublicAppBaseUrl(): string {
  const raw = process.env.PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) {
    throw new Error("PUBLIC_APP_BASE_URL ontbreekt in de server-configuratie.");
  }
  return raw.replace(/\/+$/, "");
}

export function buildPlanningPublishEmailHtml(args: {
  recipientName: string;
  weekStart: string;
  planTitle: string;
  notes?: string | null;
  publicLink: string;
  logoUrl: string;
}): string {
  const notesBlock = args.notes?.trim()
    ? `<p style="margin:0 0 14px;color:#1f2a37;line-height:1.55;"><strong>Opmerking:</strong><br/>${args.notes.replace(/\n/g, "<br/>")}</p>`
    : "";
  return `<!DOCTYPE html>
  <html lang="nl">
  <body style="margin:0;padding:0;background:#dff0fb;">
    <div style="padding:24px;font-family:Arial,sans-serif;min-height:100vh;width:100%;box-sizing:border-box;">
      <div style="max-width:640px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:14px;">
          <img src="${args.logoUrl}" alt="SPL logo" width="200" height="64" style="display:inline-block;border:0;outline:none;text-decoration:none;" />
        </div>
        <div style="background:#ffffff;border:1px solid #c9deeb;border-radius:12px;padding:22px;box-shadow:0 6px 16px rgba(36,95,130,0.12);">
          <h2 style="margin:0 0 12px;color:#1f2a37;">Nieuwe planning staat klaar</h2>
          <p style="margin:0 0 10px;color:#1f2a37;line-height:1.55;">Beste ${args.recipientName},</p>
          <p style="margin:0 0 10px;color:#1f2a37;line-height:1.55;">
            Er is een nieuwe planning gepubliceerd: <strong>${args.planTitle}</strong> (week van ${args.weekStart}).
          </p>
          ${notesBlock}
          <p style="margin:0 0 16px;color:#1f2a37;line-height:1.55;">
            Via onderstaande knop open je direct jouw persoonlijke planning.
          </p>
          <p style="margin:0 0 12px;">
            <a href="${args.publicLink}" style="display:inline-block;background:#139ec5;color:#ffffff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:600;">Bekijk mijn planning</a>
          </p>
          <p style="margin:0;color:#5b6b79;font-size:12px;line-height:1.45;">
            Werkt de knop niet? Kopieer dan deze link in je browser:<br/>
            <a href="${args.publicLink}" style="color:#139ec5;">${args.publicLink}</a>
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>`;
}

export async function sendPlanningPublishEmails(args: SendPlanningPublishEmailsArgs): Promise<{ sent: number }> {
  if (!args.recipients.length) return { sent: 0 };

  const host = getRequiredEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || "587");
  const user = getRequiredEnv("SMTP_USER");
  const pass = getRequiredEnv("SMTP_PASS");
  const from = getRequiredEnv("MAIL_FROM");
  const baseUrl = getPublicAppBaseUrl();
  const logoUrl = `${baseUrl}/mail/spl-logo.png`;
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  let sent = 0;
  for (const recipient of args.recipients) {
    const token = createPublicPlanningToken(args.weekStart, recipient.id);
    const publicLink = `${baseUrl}/publieke-planning?t=${encodeURIComponent(token)}`;
    const html = buildPlanningPublishEmailHtml({
      recipientName: recipient.name,
      weekStart: args.weekStart,
      planTitle: args.planTitle,
      notes: args.notes,
      publicLink,
      logoUrl,
    });
    await transporter.sendMail({
      from,
      to: recipient.email,
      subject: `Nieuwe planning beschikbaar - week ${args.weekStart}`,
      html,
    });
    sent += 1;
  }
  return { sent };
}
