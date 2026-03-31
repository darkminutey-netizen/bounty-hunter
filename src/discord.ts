import type { ScoredBounty } from "./types.js";

// Color thresholds for embed color coding (score = reward / complexity_factor)
const COLOR_HIGH = 0x2ecc71; // green
const COLOR_MEDIUM = 0xf1c40f; // yellow
const COLOR_LOW = 0xe74c3c; // red

function embedColor(score: number): number {
  if (score >= 200) return COLOR_HIGH;
  if (score >= 75) return COLOR_MEDIUM;
  return COLOR_LOW;
}

function formatAge(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

interface DiscordEmbed {
  title: string;
  url: string;
  description: string;
  color: number;
  fields: { name: string; value: string; inline: boolean }[];
  footer: { text: string };
  timestamp: string;
}

function buildEmbed(bounty: ScoredBounty): DiscordEmbed {
  return {
    title: bounty.title.length > 200 ? bounty.title.slice(0, 197) + "..." : bounty.title,
    url: bounty.issueUrl,
    description: `**${bounty.rewardFormatted}** bounty on \`${bounty.repo}\``,
    color: embedColor(bounty.score),
    fields: [
      { name: "Reward", value: bounty.rewardFormatted, inline: true },
      { name: "Score", value: String(bounty.score), inline: true },
      { name: "Complexity", value: bounty.complexityEstimate, inline: true },
      { name: "Org", value: bounty.org, inline: true },
      { name: "Source", value: bounty.source, inline: true },
      { name: "Posted", value: formatAge(bounty.createdAt), inline: true },
    ],
    footer: { text: bounty.issueUrl },
    timestamp: bounty.createdAt.toISOString(),
  };
}

async function postPayload(webhookUrl: string, payload: object): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Discord webhook error: ${res.status} ${text.slice(0, 200)}`);
  }
}

export async function postToDiscord(
  bounties: ScoredBounty[],
  webhookUrl: string
): Promise<void> {
  if (!bounties.length) {
    await postPayload(webhookUrl, {
      content: "**Rust Bounty Scanner**: No Rust bounties found this run.",
    });
    return;
  }

  // Header message
  await postPayload(webhookUrl, {
    content: `**Rust Bounty Scanner** -- Found **${bounties.length}** Rust bounties ranked by attractiveness`,
  });

  // Discord webhooks allow max 10 embeds per message
  const BATCH = 10;
  for (let i = 0; i < bounties.length; i += BATCH) {
    const batch = bounties.slice(i, i + BATCH);
    await postPayload(webhookUrl, { embeds: batch.map(buildEmbed) });

    // Discord rate limit: ~5 requests/2s for webhooks
    if (i + BATCH < bounties.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}
