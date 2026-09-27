import { Router } from "express";
import { env } from "../config/env";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth.middleware";

export const slackRouter = Router();

const SLACK_SCOPES = ["chat:write", "incoming-webhook"].join(",");

/**
 * Step 1: "Connect Slack" button in the dashboard hits this. It redirects
 * the browser to Slack's real OAuth authorize screen.
 */
slackRouter.get("/oauth/authorize", requireAuth, (req, res) => {
  const state = req.userId!; // tie the callback back to the logged-in user
  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", env.slackClientId);
  url.searchParams.set("scope", SLACK_SCOPES);
  url.searchParams.set("redirect_uri", env.slackRedirectUri);
  url.searchParams.set("state", state);
  res.redirect(url.toString());
});

/**
 * Step 2: Slack redirects back here with a `code`. Exchange it for a real
 * access token / incoming webhook, and store it against the user (tenant).
 */
slackRouter.get("/oauth/callback", async (req, res) => {
  const { code, state } = req.query as { code?: string; state?: string };
  if (!code || !state) {
    return res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }

  try {
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.slackClientId,
        client_secret: env.slackClientSecret,
        code,
        redirect_uri: env.slackRedirectUri,
      }),
    });
    const data: any = await tokenRes.json();

    if (!data.ok) {
      console.error("Slack OAuth exchange failed", data);
      return res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
    }

    const accessToken: string = data.access_token;
    const webhookUrl: string | null = data.incoming_webhook?.url ?? null;
    const channelId: string | null = data.incoming_webhook?.channel_id ?? null;
    const teamName: string | null = data.team?.name ?? null;

    await pool.query(
      `INSERT INTO slack_integrations (user_id, access_token, webhook_url, channel_id, team_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE
         SET access_token = EXCLUDED.access_token,
             webhook_url = EXCLUDED.webhook_url,
             channel_id = EXCLUDED.channel_id,
             team_name = EXCLUDED.team_name,
             connected_at = now()`,
      [state, accessToken, webhookUrl, channelId, teamName]
    );

    res.redirect(`${env.frontendUrl}/dashboard?slack=connected`);
  } catch (err) {
    console.error("Slack OAuth callback error", err);
    res.redirect(`${env.frontendUrl}/dashboard?slack=error`);
  }
});

slackRouter.get("/status", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT team_name, connected_at FROM slack_integrations WHERE user_id = $1`,
    [req.userId]
  );
  res.json({ connected: rows.length > 0, integration: rows[0] ?? null });
});

slackRouter.delete("/disconnect", requireAuth, async (req, res) => {
  await pool.query(`DELETE FROM slack_integrations WHERE user_id = $1`, [req.userId]);
  res.json({ ok: true });
});
