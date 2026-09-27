import { Router } from "express";
import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth.middleware";
import { createEtherealAccount } from "../email/mailer";

export const sendersRouter = Router();
sendersRouter.use(requireAuth);

sendersRouter.get("/", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, smtp_user, created_at FROM senders WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.userId]
  );
  res.json({ senders: rows });
});

/**
 * Creates a brand new Ethereal test-account-backed sender for this user.
 * This is what lets the assignment's "multiple senders" + per-sender rate
 * limiting actually be exercised from the UI without editing .env.
 */
sendersRouter.post("/", async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name) return res.status(400).json({ error: "name is required" });

  const account = await createEtherealAccount();
  const { rows } = await pool.query(
    `INSERT INTO senders (user_id, name, smtp_user, smtp_pass)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, smtp_user, created_at`,
    [req.userId, name, account.user, account.pass]
  );
  res.status(201).json({ sender: rows[0] });
});
