import type { Config } from "@netlify/functions";
import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { proProfiles } from "../../db/schema.js";
import { databaseError, jsonError, readJson, validateProfile } from "../../lib/shared.js";

/**
 * The signed-in pro's own profile. `user_id` is taken from the verified JWT and
 * never from the request body, so a pro can only ever read or write their own row.
 */
export default async (req: Request) => {
  const user = await getUser();
  if (!user) return jsonError(401, "Sign in to manage your profile.");

  if (req.method === "GET") {
    try {
      const [profile] = await db.select().from(proProfiles).where(eq(proProfiles.userId, user.id));
      return Response.json({ profile: profile ?? null });
    } catch (error) {
      return databaseError(error, "loading your profile");
    }
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    const result = validateProfile(body);
    if (!result.ok) return jsonError(422, "Check the highlighted fields.", result.errors);

    const fields = {
      ...result.value,
      email: user.email ?? "",
      updatedAt: new Date(),
    };

    try {
      // One statement, so creating and updating a profile take the same path.
      const [profile] = await db
        .insert(proProfiles)
        .values({ userId: user.id, ...fields })
        .onConflictDoUpdate({ target: proProfiles.userId, set: fields })
        .returning();

      return Response.json({ profile });
    } catch (error) {
      return databaseError(error, "saving your profile");
    }
  }

  return jsonError(405, "Method not allowed.");
};

export const config: Config = {
  path: "/api/profile",
};
