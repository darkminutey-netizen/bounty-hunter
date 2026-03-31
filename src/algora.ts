import type { Bounty } from "./types.js";

// The @algora/sdk requires an org param but the underlying tRPC endpoint supports
// a global query. We call it directly to scan all active bounties at once.
const ALGORA_API = "https://console.algora.io/api/trpc";

interface AlgoraBountyItem {
  id: string;
  status: string;
  kind: string;
  task: {
    title: string;
    body: string;
    url: string;
    repo_name: string;
    repo_owner: string;
    number: number;
    tech: string[];
  };
  org: {
    handle: string;
    display_name: string;
  };
  tech: string[];
  reward: { amount: number; currency: string } | null;
  reward_formatted: string | null;
  created_at: string;
}

interface AlgoraResponse {
  result: {
    data: {
      json: {
        items: AlgoraBountyItem[];
        next_cursor: string | null;
      };
    };
  };
}

async function fetchPage(
  cursor: string | null,
  limit: number
): Promise<{ items: AlgoraBountyItem[]; next_cursor: string | null }> {
  const input: Record<string, unknown> = { limit, status: "open" };
  if (cursor) input.cursor = cursor;

  const url = new URL(`${ALGORA_API}/bounty.list`);
  url.searchParams.set("batch", "1");
  url.searchParams.set("input", JSON.stringify({ "0": { json: input } }));

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "bounty-hunter/1.0",
    },
  });

  if (!res.ok) {
    throw new Error(`Algora API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as AlgoraResponse[];
  return json[0].result.data.json;
}

function isRust(item: AlgoraBountyItem): boolean {
  const techSources = [
    ...(item.tech ?? []),
    ...(item.task.tech ?? []),
  ].map((t) => t.toLowerCase());

  if (techSources.some((t) => t === "rust" || t.includes("rust"))) return true;

  // If tech metadata is empty, check repo name and issue title/body heuristically.
  // This catches repos that don't tag their language on Algora.
  const text = `${item.task.repo_name} ${item.task.title} ${item.task.body}`.toLowerCase();
  const rustKeywords = ["cargo", "tokio", "crate", "crates.io", ".rs ", "rust ", "rustlang", "#[", "impl ", "fn main", "use std::"];
  const hits = rustKeywords.filter((kw) => text.includes(kw)).length;
  return hits >= 2;
}

export async function scanAlgora(minRewardUsd: number): Promise<Bounty[]> {
  const results: Bounty[] = [];
  let cursor: string | null = null;
  let page = 0;
  const maxPages = 20; // safety cap

  console.log("[algora] Scanning all active bounties...");

  while (page < maxPages) {
    let data: { items: AlgoraBountyItem[]; next_cursor: string | null };

    try {
      data = await fetchPage(cursor, 100);
    } catch (err) {
      console.warn(`[algora] Fetch error on page ${page}: ${err}`);
      break;
    }

    if (!data.items.length) break;

    for (const item of data.items) {
      if (item.kind !== "dev") continue;
      if (!item.reward || item.reward.amount < minRewardUsd * 100) continue;

      if (!isRust(item)) continue;

      results.push({
        id: `algora:${item.id}`,
        title: item.task.title,
        repo: `${item.task.repo_owner}/${item.task.repo_name}`,
        issueUrl: item.task.url,
        rewardUsd: item.reward.amount / 100,
        rewardFormatted: item.reward_formatted ?? `$${item.reward.amount / 100}`,
        org: item.org.display_name || item.org.handle,
        createdAt: new Date(item.created_at),
        issueBody: item.task.body ?? "",
        language: "Rust",
        commentCount: 0,
        repoStars: 0,
        source: "algora",
      });
    }

    if (!data.next_cursor) break;
    cursor = data.next_cursor;
    page++;
  }

  console.log(`[algora] Found ${results.length} Rust bounties >= $${minRewardUsd}`);
  return results;
}
