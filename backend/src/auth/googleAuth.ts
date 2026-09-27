import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { pool } from "../db/pool";

export const authRouter = Router();

const oauthClient = new OAuth2Client(
  env.googleClientId,
  env.googleClientSecret,
  env.googleCallbackUrl
);

authRouter.get("/google", (req, res) => {
  const url = oauthClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
  res.redirect(url);
});

authRouter.get("/google/callback", async (req, res) => {
  const { code } = req.query as { code?: string };
  if (!code) return res.redirect(`${env.frontendUrl}/login?error=missing_code`);

  try {
    const { tokens } = await oauthClient.getToken(code);
    const ticket = await oauthClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: env.googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub || !payload.email) {
      return res.redirect(`${env.frontendUrl}/login?error=no_profile`);
    }

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (google_id) DO UPDATE
         SET email = EXCLUDED.email, name = EXCLUDED.name, avatar_url = EXCLUDED.avatar_url
       RETURNING id`,
      [payload.sub, payload.email, payload.name ?? "", payload.picture ?? ""]
    );
    const userId = rows[0].id;

    const sessionToken = jwt.sign({ userId }, env.jwtSecret, { expiresIn: "7d" });
    res.cookie("session", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(`${env.frontendUrl}/dashboard`);
  } catch (err) {
    console.error("Google OAuth callback failed", err);
    res.redirect(`${env.frontendUrl}/login?error=oauth_failed`);
  }
});

authRouter.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const { userId } = jwt.verify(token, env.jwtSecret) as { userId: string };
    const { rows } = await pool.query(
      `SELECT id, email, name, avatar_url FROM users WHERE id = $1`,
      [userId]
    );
    if (!rows[0]) return res.status(401).json({ error: "User not found" });
    res.json({ user: rows[0] });
  } catch {
    res.status(401).json({ error: "Invalid session" });
  }
});
