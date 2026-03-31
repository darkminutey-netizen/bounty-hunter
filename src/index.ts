import { config } from "dotenv";
config();

import { scanAlgora } from "./algora.js";
import { scanIssueHunt } from "./issuehunt.js";
import { scoreBounties } from "./scorer.js";
import { postToDiscord } from "./discord.js";

function parseArgs(): { dryRun: boolean; minReward: number } {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const minRewardIdx = args.indexOf("--min-reward");
  const minReward =
    minRewardIdx !== -1 && args[minRewardIdx + 1]
      ? parseInt(args[minRewardIdx + 1], 10)
      : 50;

  return { dryRun, minReward };
}

async function main(): Promise<void> {
  const { dryRun, minReward } = parseArgs();

  console.log(`\nBounty Hunter`);
  console.log(`Min reward: $${minReward} | Dry run: ${dryRun}\n`);

  // Run scanners in parallel; each handles its own errors
  const [algora, issuehunt] = await Promise.all([
    scanAlgora(minReward).catch((err) => {
      console.error(`[algora] Fatal error: ${err}`);
      return [];
    }),
    scanIssueHunt(minReward).catch((err) => {
      console.error(`[issuehunt] Fatal error: ${err}`);
      return [];
    }),
  ]);

  const all = [...algora, ...issuehunt];

  if (!all.length) {
    console.log("\nNo bounties found. Nothing to post.");
    return;
  }

  const scored = scoreBounties(all);

  console.log(`\nTop bounties (${scored.length} total):`);
  for (const b of scored.slice(0, 10)) {
    console.log(
      `  [score ${b.score}] ${b.rewardFormatted.padEnd(8)} ${b.complexityEstimate.padEnd(6)} ${b.repo} -- ${b.title.slice(0, 60)}`
    );
    console.log(`    ${b.issueUrl}`);
  }

  if (dryRun) {
    console.log("\n[dry-run] Skipping Discord post.");
    return;
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_NOXCRAFT;
  if (!webhookUrl) {
    console.error(
      "\nError: DISCORD_WEBHOOK_NOXCRAFT is not set. Source ~/.secrets or add it to .env"
    );
    process.exit(1);
  }

  console.log("\nPosting to Discord...");
  try {
    await postToDiscord(scored, webhookUrl);
    console.log("Done.");
  } catch (err) {
    console.error(`Discord post failed: ${err}`);
    process.exit(1);
  }
}

main();
