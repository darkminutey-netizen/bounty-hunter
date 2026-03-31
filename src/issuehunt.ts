import type { Bounty } from "./types.js";

// IssueHunt has no public API. Their OSS portal at oss.issuehunt.io renders
// server-side HTML but the data is React-hydrated from a JSON endpoint.
// If the endpoint isn't stable, we return empty and warn -- Algora is the
// primary source.

const BASE_URL = "https://oss.issuehunt.io";

interface IssueHuntItem {
  title: string;
  html_url: string;
  funded_sum: number;
  comments: number;
  repo: {
    name: string;
    full_name: string;
    language: string | null;
    stargazers_count: number;
  };
  created_at: string;
  body: string;
}

export async function scanIssueHunt(minRewardUsd: number): Promise<Bounty[]> {
  console.log("[issuehunt] Attempting to scrape funded Rust issues...");

  try {
    const url = `${BASE_URL}/api/v1/issues?language=Rust&status=funded&order=funded_sum&limit=50`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; bounty-hunter/1.0)",
        Referer: BASE_URL,
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    // IssueHunt may return { hits: [] } or a direct array
    const items: IssueHuntItem[] = Array.isArray(json)
      ? json
      : json.hits ?? json.data ?? json.results ?? [];

    if (!items.length) {
      console.warn("[issuehunt] Endpoint returned empty or unexpected shape -- skipping");
      return [];
    }

    const results: Bounty[] = [];

    for (const item of items) {
      if ((item.repo?.language ?? "").toLowerCase() !== "rust") continue;
      if (item.funded_sum < minRewardUsd) continue;

      results.push({
        id: `issuehunt:${item.html_url}`,
        title: item.title,
        repo: item.repo.full_name,
        issueUrl: item.html_url,
        rewardUsd: item.funded_sum,
        rewardFormatted: `$${item.funded_sum}`,
        org: item.repo.full_name.split("/")[0],
        createdAt: new Date(item.created_at),
        issueBody: item.body ?? "",
        language: "Rust",
        commentCount: item.comments ?? 0,
        repoStars: item.repo.stargazers_count ?? 0,
        source: "issuehunt",
      });
    }

    console.log(`[issuehunt] Found ${results.length} Rust bounties >= $${minRewardUsd}`);
    return results;
  } catch (err) {
    console.warn(`[issuehunt] Scrape failed (${err}) -- returning empty`);
    return [];
  }
}
