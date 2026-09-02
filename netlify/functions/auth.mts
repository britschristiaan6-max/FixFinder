import type { Config, Context } from "@netlify/functions";
import {
  AuthError,
  MissingIdentityError,
  confirmEmail,
  getUser,
  login,
  logout,
  signup,
  verifyRequestOrigin,
} from "@netlify/identity";
import { isEmail, jsonError, readJson } from "../../lib/shared.js";

/**
 * Auth lives entirely server-side. The site ships as plain static files with no
 * bundler, so instead of loading an SDK in the browser the pages POST here and
 * the Functions runtime sets the `nf_jwt` cookie on the response. Pages then do
 * a full navigation so the browser sends that cookie on the next request.
 */

function authErrorResponse(error: unknown) {
  if (error instanceof MissingIdentityError) {
    return jsonError(503, "Accounts aren't available on this environment yet. Run the site with `netlify dev` or enable Identity.");
  }
  if (error instanceof AuthError) {
    switch (error.status) {
      case 401:
        return jsonError(401, "That email and password don't match.");
      case 403:
        return jsonError(403, "Signups are closed right now. Ask us for an invite.");
      case 404:
        return jsonError(404, "We couldn't find an account with that email.");
      case 422:
        return jsonError(422, "Check the email address and use a password of at least 8 characters.");
      case 405:
        // GoTrue answers 405 when the Identity instance isn't provisioned —
        // which is the case locally until the site has been deployed once.
        return jsonError(503, "Accounts aren't available on this environment yet. They activate on the first deploy.");
      default:
        return jsonError(400, error.message);
    }
  }
  console.error("Unexpected auth failure", error);
  return jsonError(500, "Something went wrong on our side. Try again in a moment.");
}

/** The subset of the Identity user the browser is allowed to see. */
function publicUser(user: { id: string; email?: string; name?: string; confirmedAt?: string }) {
  return {
    id: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
    confirmed: Boolean(user.confirmedAt),
  };
}

export default async (req: Request, context: Context) => {
  const action = context.params.action;

  if (action === "me") {
    if (req.method !== "GET") return jsonError(405, "Method not allowed.");
    try {
      const user = await getUser();
      return Response.json({ user: user ? publicUser(user) : null });
    } catch {
      // A missing Identity config shouldn't break page load — treat as logged out.
      return Response.json({ user: null });
    }
  }

  if (req.method !== "POST") return jsonError(405, "Method not allowed.");

  // Every branch below mutates auth state, so guard all of them against CSRF.
  try {
    verifyRequestOrigin(req);
  } catch {
    return jsonError(403, "Request blocked for security reasons. Reload the page and try again.");
  }

  const body = await readJson(req);

  try {
    if (action === "signup") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      const displayName = String(body.displayName ?? "").trim().slice(0, 80);

      const errors: Record<string, string> = {};
      if (!isEmail(email)) errors.email = "Enter a valid email address.";
      if (password.length < 8) errors.password = "Use at least 8 characters.";
      if (displayName.length < 2) errors.displayName = "Tell us your name or trading name.";
      if (Object.keys(errors).length > 0) return jsonError(422, "Check the highlighted fields.", errors);

      const user = await signup(email, password, { full_name: displayName });
      return Response.json({
        user: publicUser(user),
        // When email confirmation is on, the account exists but isn't logged in yet.
        needsConfirmation: !user.confirmedAt,
      }, { status: 201 });
    }

    if (action === "login") {
      const email = String(body.email ?? "").trim();
      const password = String(body.password ?? "");
      if (!email || !password) return jsonError(422, "Enter your email and password.");

      const user = await login(email, password);
      return Response.json({ user: publicUser(user) });
    }

    if (action === "logout") {
      await logout();
      return Response.json({ ok: true });
    }

    if (action === "confirm") {
      const token = String(body.token ?? "").trim();
      if (!token) return jsonError(422, "That confirmation link is incomplete.");
      const user = await confirmEmail(token);
      return Response.json({ user: publicUser(user) });
    }

    return jsonError(404, "Unknown auth action.");
  } catch (error) {
    return authErrorResponse(error);
  }
};

export const config: Config = {
  path: "/api/auth/:action",
};
