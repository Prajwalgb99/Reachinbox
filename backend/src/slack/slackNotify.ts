import { pool } from "../db/pool";

interface SlackIntegration {
  access_token: string;
  webhook_url: string | null;
  channel_id: string | null;
}

async function getIntegration(userId: string): Promise<SlackIntegration | null> {
  const { rows } = await pool.query(
    `SELECT access_token, webhook_url, channel_id FROM slack_integrations WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? null;
}

/**
 * Sends the "hourly rate limit hit" notification for a sender.
 * If the user hasn't connected Slack yet, this is a silent no-op (per spec:
 * "rate-limit hits should simply not notify (no crash)"). If they connect
 * later, notifications start working immediately on the next hit, with no
 * redeploy, because we look the integration up fresh every time.
 */
export async function notifyRateLimitHit(params: {
  userId: string;
  senderName: string;
  limit: number;
  windowStart: Date;
}) {
  const integration = await getIntegration(params.userId);
  if (!integration) {
    console.log(
      `[slack] user ${params.userId} has no Slack connected — skipping rate-limit notification.`
    );
    return;
  }

  const text = `:rotating_light: *Rate limit reached* for sender *${params.senderName}*\n` +
    `Hit the cap of *${params.limit} emails/hour* for the window starting ${params.windowStart.toLocaleString()}.\n` +
    `Remaining emails in this batch have been rescheduled into the next hourly window.`;

  try {
    if (integration.webhook_url) {
      // Incoming webhook path (simplest, works with a single default channel).
      await fetch(integration.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } else if (integration.channel_id) {
      // chat.postMessage path (used when the OAuth scope granted was
      // chat:write rather than incoming-webhook).
      await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${integration.access_token}`,
        },
        body: JSON.stringify({ channel: integration.channel_id, text }),
      });
    }
  } catch (err) {
    // Slack being down should never take the worker down with it.
    console.error("Failed to send Slack notification", err);
  }
}
