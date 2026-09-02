import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { jobRequests, proProfiles } from "../../db/schema.js";
import { databaseError, jsonError, readJson, validateRequest } from "../../lib/shared.js";

/**
 * A homeowner's job enquiry. This used to be written to localStorage, where no
 * one ever saw it; it now persists, and the response tells the visitor how many
 * matching pros are actually listed in their trade.
 */
export default async (req: Request) => {
  if (req.method !== "POST") return jsonError(405, "Method not allowed.");

  const body = await readJson(req);
  const result = validateRequest(body);
  if (!result.ok) return jsonError(422, "Check the highlighted fields.", result.errors);

  try {
    const [saved] = await db.insert(jobRequests).values(result.value).returning({ id: jobRequests.id });

    const matches = await db
      .select({ id: proProfiles.id })
      .from(proProfiles)
      .where(and(eq(proProfiles.published, true), eq(proProfiles.trade, result.value.service)));

    return Response.json({ id: saved.id, matchCount: matches.length }, { status: 201 });
  } catch (error) {
    return databaseError(error, "saving a job request");
  }
};

export const config: Config = {
  path: "/api/requests",
};
