export interface Bounty {
  id: string;
  title: string;
  repo: string;
  issueUrl: string;
  rewardUsd: number;
  rewardFormatted: string;
  org: string;
  createdAt: Date;
  issueBody: string;
  language: string | null;
  commentCount: number;
  repoStars: number;
  source: "algora" | "issuehunt";
}

export interface ScoredBounty extends Bounty {
  score: number;
  complexityEstimate: "low" | "medium" | "high";
}
