import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const val = process.env[name] ?? fallback;
  if (val === undefined) {
    // We don't throw here for optional-at-boot things like OAuth keys,
    // callers decide whether an empty value is fatal for their feature.
    return "";
  }
  return val;
}

export const env = {
  port: parseInt(required("PORT", "4000"), 10),
  frontendUrl: required("FRONTEND_URL", "http://localhost:3000"),
  sessionSecret: required("SESSION_SECRET", "dev-secret-change-me"),
  jwtSecret: required("JWT_SECRET", "dev-jwt-secret-change-me"),

  databaseUrl: required("DATABASE_URL"),

  redisHost: required("REDIS_HOST", "localhost"),
  redisPort: parseInt(required("REDIS_PORT", "6379"), 10),

  elasticsearchUrl: required("ELASTICSEARCH_URL", "http://localhost:9200"),
  elasticsearchIndex: required("ELASTICSEARCH_INDEX", "emails"),

  etherealUser: required("ETHEREAL_USER"),
  etherealPass: required("ETHEREAL_PASS"),

  workerConcurrency: parseInt(required("WORKER_CONCURRENCY", "5"), 10),
  minDelayMsBetweenSends: parseInt(required("MIN_DELAY_MS_BETWEEN_SENDS", "2000"), 10),
  maxEmailsPerHourPerSender: parseInt(required("MAX_EMAILS_PER_HOUR_PER_SENDER", "200"), 10),

  googleClientId: required("GOOGLE_CLIENT_ID"),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET"),
  googleCallbackUrl: required("GOOGLE_CALLBACK_URL", "http://localhost:4000/api/auth/google/callback"),

  slackClientId: required("SLACK_CLIENT_ID"),
  slackClientSecret: required("SLACK_CLIENT_SECRET"),
  slackRedirectUri: required("SLACK_REDIRECT_URI", "http://localhost:4000/api/slack/oauth/callback"),
};
