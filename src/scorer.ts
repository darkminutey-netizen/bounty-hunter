import type { Bounty, ScoredBounty } from "./types.js";

// Complexity estimate: proxy from issue body length, comment count, and repo stars.
// Long body + many comments = hard problem. High stars = well-maintained repo (good docs).
//
// Score = reward / complexity_factor
// Higher score = more attractive (better reward relative to difficulty).

function estimateComplexity(bounty: Bounty): {
  factor: number;
  label: "low" | "medium" | "high";
} {
  let score = 0;

  // Body length: > 2000 chars suggests a detailed, potentially complex issue
  const bodyLen = bounty.issueBody.length;
  if (bodyLen > 3000) score += 2;
  else if (bodyLen > 1000) score += 1;

  // Comments: many comments may mean the issue is contested or unclear
  if (bounty.commentCount > 20) score += 2;
  else if (bounty.commentCount > 5) score += 1;

  // Repo stars: counter-intuitively, high-star repos tend to have BETTER docs/tests,
  // making them easier to work in. But very large repos can be intimidating.
  if (bounty.repoStars > 50_000) score += 1;
  else if (bounty.repoStars < 500) score += 1; // obscure repos may be poorly documented

  if (score >= 4) return { factor: 3.0, label: "high" };
  if (score >= 2) return { factor: 1.5, label: "medium" };
  return { factor: 1.0, label: "low" };
}

export function scoreBounties(bounties: Bounty[]): ScoredBounty[] {
  const scored: ScoredBounty[] = bounties.map((b) => {
    const { factor, label } = estimateComplexity(b);
    const score = Math.round(b.rewardUsd / factor);
    return { ...b, score, complexityEstimate: label };
  });

  // Sort by score descending
  return scored.sort((a, b) => b.score - a.score);
}
