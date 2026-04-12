import { createHmac, timingSafeEqual } from "node:crypto";

type PublicPlanningTokenPayload = {
  weekStart: string;
  employeeId: string;
  exp: number;
};

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f-]{36}$/i;

function getSigningSecret(): string {
  const secret = process.env.PUBLIC_LINK_SIGNING_SECRET;
  if (!secret) {
    throw new Error("PUBLIC_LINK_SIGNING_SECRET ontbreekt in de server-configuratie.");
  }
  return secret;
}

function encodeBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function decodeBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signPart(part: string, secret: string): string {
  return createHmac("sha256", secret).update(part).digest("base64url");
}

export function createPublicPlanningToken(weekStart: string, employeeId: string): string {
  if (!WEEK_RE.test(weekStart)) throw new Error("Ongeldige weekStart");
  if (!UUID_RE.test(employeeId)) throw new Error("Ongeldig employeeId");
  const payload: PublicPlanningTokenPayload = {
    weekStart,
    employeeId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const sigPart = signPart(payloadPart, getSigningSecret());
  return `${payloadPart}.${sigPart}`;
}

export function verifyPublicPlanningToken(token: string): PublicPlanningTokenPayload | null {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;
  const secret = getSigningSecret();
  const expectedSig = signPart(payloadPart, secret);
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: PublicPlanningTokenPayload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadPart)) as PublicPlanningTokenPayload;
  } catch {
    return null;
  }

  if (!WEEK_RE.test(payload.weekStart)) return null;
  if (!UUID_RE.test(payload.employeeId)) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
