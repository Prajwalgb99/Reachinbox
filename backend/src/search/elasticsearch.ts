import { Client } from "@elastic/elasticsearch";
import { env } from "../config/env";

export const esClient = new Client({ node: env.elasticsearchUrl });

export async function ensureIndex() {
  const exists = await esClient.indices.exists({ index: env.elasticsearchIndex });
  if (!exists) {
    await esClient.indices.create({
      index: env.elasticsearchIndex,
      mappings: {
        properties: {
          id: { type: "keyword" },
          userId: { type: "keyword" },
          senderId: { type: "keyword" },
          batchId: { type: "keyword" },
          recipient: { type: "keyword" },
          subject: { type: "text" },
          body: { type: "text" },
          status: { type: "keyword" },
          scheduledAt: { type: "date" },
          sentAt: { type: "date" },
        },
      },
    });
    console.log(`Created Elasticsearch index "${env.elasticsearchIndex}"`);
  }
}

export interface IndexableEmail {
  id: string;
  userId: string;
  senderId: string;
  batchId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string;
  sentAt?: string | null;
}

export async function indexEmail(email: IndexableEmail) {
  await esClient.index({
    index: env.elasticsearchIndex,
    id: email.id,
    document: email,
  });
}

export async function searchEmails(userId: string, query: string) {
  const result = await esClient.search({
    index: env.elasticsearchIndex,
    query: {
      bool: {
        filter: [{ term: { userId } }],
        must: query
          ? [
              {
                multi_match: {
                  query,
                  fields: ["recipient", "subject", "body"],
                },
              },
            ]
          : [{ match_all: {} }],
      },
    },
    sort: [{ scheduledAt: "desc" }],
    size: 50,
  });

  return result.hits.hits.map((hit) => hit._source);
}
