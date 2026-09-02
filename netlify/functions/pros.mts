import type { Config, Context } from "@netlify/functions";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { proProfiles } from "../../db/schema.js";
import { TRADES, databaseError, jsonError } from "../../lib/shared.js";

/**
 * The public directory. Only published profiles are exposed, and only the
 * columns a visitor should see — no email addresses, and no unpublished drafts.
 */
const PUBLIC_COLUMNS = {
  id: proProfiles.id,
  displayName: proProfiles.displayName,
  trade: proProfiles.trade,
  serviceArea: proProfiles.serviceArea,
  town: proProfiles.town,
  bio: proProfiles.bio,
  yearsExperience: proProfiles.yearsExperience,
  calloutFee: proProfiles.calloutFee,
  qualifications: proProfiles.qualifications,
  createdAt: proProfiles.createdAt,
};

export default async (req: Request, context: Context) => {
  if (req.method !== "GET") return jsonError(405, "Method not allowed.");

  const id = context.params.id;
  if (id) {
    const numericId = Number.parseInt(id, 10);
    if (!Number.isInteger(numericId)) return jsonError(400, "Unknown professional.");

    try {
      const [pro] = await db
        .select(PUBLIC_COLUMNS)
        .from(proProfiles)
        .where(and(eq(proProfiles.id, numericId), eq(proProfiles.published, true)));

      if (!pro) return jsonError(404, "That profile isn't available.");
      return Response.json({ pro });
    } catch (error) {
      return databaseError(error, "loading a profile");
    }
  }

  const url = new URL(req.url);
  const trade = (url.searchParams.get("trade") ?? "").trim();
  const search = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? "24", 10) || 24, 1), 48);

  const filters = [eq(proProfiles.published, true)];
  if (TRADES.includes(trade as (typeof TRADES)[number])) {
    filters.push(eq(proProfiles.trade, trade));
  }
  if (search) {
    const pattern = `%${search}%`;
    filters.push(
      or(
        ilike(proProfiles.displayName, pattern),
        ilike(proProfiles.serviceArea, pattern),
        ilike(proProfiles.town, pattern),
      )!,
    );
  }

  try {
    const pros = await db
      .select(PUBLIC_COLUMNS)
      .from(proProfiles)
      .where(and(...filters))
      .orderBy(desc(proProfiles.yearsExperience), desc(proProfiles.createdAt))
      .limit(limit);

    return Response.json({ pros, trades: TRADES });
  } catch (error) {
    return databaseError(error, "listing the directory");
  }
};

export const config: Config = {
  path: ["/api/pros", "/api/pros/:id"],
};
