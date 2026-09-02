/**
 * Values and validation shared by every function. The browser mirrors the
 * option lists in markup, but this file is the authority — nothing reaches the
 * database without passing through `validateProfile` or `validateRequest`.
 */

export const TRADES = [
  "Plumber",
  "Electrician",
  "Handyman",
  "Painter",
  "Roofer",
  "Carpenter",
  "Tiler",
  "Locksmith",
  "Appliance repair",
  "Garden & outdoor",
  "Heating & cooling",
] as const;

export const URGENCY = [
  "Whenever possible",
  "Within a few days",
  "Urgent — today",
] as const;

export type Validated<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };

/** Collapse whitespace and clamp length so one long paste cannot bloat a row. */
function clean(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.replace(/\s+/g, " ").trim().slice(0, max);
}

/** Preserve newlines for prose fields, but still clamp and trim. */
function cleanProse(input: unknown, max: number): string {
  if (typeof input !== "string") return "";
  return input.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max);
}

function toInt(input: unknown, min: number, max: number): number {
  const n = Number.parseInt(String(input ?? ""), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, min), max);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value: unknown): boolean {
  return typeof value === "string" && value.length <= 254 && EMAIL.test(value);
}

export interface ProfileInput {
  displayName: string;
  trade: string;
  serviceArea: string;
  town: string;
  phone: string;
  bio: string;
  yearsExperience: number;
  calloutFee: number;
  qualifications: string;
  published: boolean;
}

export function validateProfile(body: Record<string, unknown>): Validated<ProfileInput> {
  const errors: Record<string, string> = {};

  const displayName = clean(body.displayName, 80);
  if (displayName.length < 2) errors.displayName = "Tell us the name customers should see.";

  const trade = clean(body.trade, 40);
  if (!TRADES.includes(trade as (typeof TRADES)[number])) errors.trade = "Choose one of the listed trades.";

  const serviceArea = clean(body.serviceArea, 120);
  if (serviceArea.length < 2) errors.serviceArea = "Add the areas you travel to.";

  const phone = clean(body.phone, 30);
  // Deliberately permissive: landlines, mobiles and +27 forms all vary.
  if (phone && phone.replace(/\D/g, "").length < 9) errors.phone = "That phone number looks too short.";

  const bio = cleanProse(body.bio, 1200);
  const published = body.published === true;
  // Only enforce a fuller profile at the point it becomes publicly visible.
  if (published && bio.length < 40) {
    errors.bio = "Write at least a couple of sentences before going live.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      displayName,
      trade,
      serviceArea,
      town: clean(body.town, 80),
      phone,
      bio,
      yearsExperience: toInt(body.yearsExperience, 0, 70),
      calloutFee: toInt(body.calloutFee, 0, 100000),
      qualifications: cleanProse(body.qualifications, 400),
      published,
    },
  };
}

export interface RequestInput {
  service: string;
  area: string;
  details: string;
  urgency: string;
  contactName: string;
  contactEmail: string;
}

export function validateRequest(body: Record<string, unknown>): Validated<RequestInput> {
  const errors: Record<string, string> = {};

  const service = clean(body.service, 40);
  if (!service) errors.service = "Pick the kind of help you need.";

  const area = clean(body.area, 120);
  if (area.length < 2) errors.area = "Let us know which area you're in.";

  const details = cleanProse(body.details, 2000);
  if (details.length < 10) errors.details = "A sentence or two about the job helps us match you.";

  const urgency = clean(body.urgency, 40);

  const contactEmail = clean(body.contactEmail, 254);
  if (!isEmail(contactEmail)) errors.contactEmail = "We need a valid email to send matches to.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      service,
      area,
      details,
      urgency: URGENCY.includes(urgency as (typeof URGENCY)[number]) ? urgency : URGENCY[0],
      contactName: clean(body.contactName, 80),
      contactEmail,
    },
  };
}

/** Parse a JSON body without letting malformed input throw past the handler. */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function jsonError(status: number, message: string, errors?: Record<string, string>) {
  return Response.json({ error: message, ...(errors ? { errors } : {}) }, { status });
}

/**
 * Turn an unexpected database failure into a response a visitor can read.
 *
 * Without this the runtime returns its own 500 with a full stack trace in the
 * body, which both reads as a broken site and tells the world our query shapes
 * and file paths. The detail goes to the function log instead, where it is
 * useful and private.
 */
export function databaseError(error: unknown, action: string) {
  console.error(`Database failure while ${action}`, error);
  return jsonError(503, "We couldn't reach our database just now. Please try again in a moment.");
}
