import { createHmac, timingSafeEqual } from "node:crypto";

type RawPublicLinkPayload = {
  weekStart: string;
  exp: number;
  employeeId?: string;
  locationId?: string;
};

export type VerifiedPublicPlanningLink =
  | { audience: "employee"; weekStart: string; employeeId: string }
  | { audience: "location"; weekStart: string; locationId: string };

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
  const payload: RawPublicLinkPayload = {
    weekStart,
    employeeId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const sigPart = signPart(payloadPart, getSigningSecret());
  return `${payloadPart}.${sigPart}`;
}

export function createPublicLocationPlanningToken(weekStart: string, locationId: string): string {
  if (!WEEK_RE.test(weekStart)) throw new Error("Ongeldige weekStart");
  if (!UUID_RE.test(locationId)) throw new Error("Ongeldig locationId");
  const payload: RawPublicLinkPayload = {
    weekStart,
    locationId,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 45,
  };
  const payloadPart = encodeBase64Url(JSON.stringify(payload));
  const sigPart = signPart(payloadPart, getSigningSecret());
  return `${payloadPart}.${sigPart}`;
}

export function verifyPublicPlanningToken(token: string): VerifiedPublicPlanningLink | null {
  const [payloadPart, sigPart] = token.split(".");
  if (!payloadPart || !sigPart) return null;
  const secret = getSigningSecret();
  const expectedSig = signPart(payloadPart, secret);
  const a = Buffer.from(sigPart);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: RawPublicLinkPayload;
  try {
    payload = JSON.parse(decodeBase64Url(payloadPart)) as RawPublicLinkPayload;
  } catch {
    return null;
  }

  if (!WEEK_RE.test(payload.weekStart)) return null;
  if (!Number.isFinite(payload.exp) || payload.exp < Math.floor(Date.now() / 1000)) return null;

  const hasEmp = typeof payload.employeeId === "string" && payload.employeeId.length > 0;
  const hasLoc = typeof payload.locationId === "string" && payload.locationId.length > 0;
  if (hasEmp && hasLoc) return null;

  if (hasEmp) {
    if (!UUID_RE.test(payload.employeeId!)) return null;
    return { audience: "employee", weekStart: payload.weekStart, employeeId: payload.employeeId! };
  }
  if (hasLoc) {
    if (!UUID_RE.test(payload.locationId!)) return null;
    return { audience: "location", weekStart: payload.weekStart, locationId: payload.locationId! };
  }
  return null;
}
