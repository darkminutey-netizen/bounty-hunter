# bounty-hunter

Scans Algora and IssueHunt for open Rust bounties >= $50 and posts ranked results to Discord.

## What it does

1. Queries Algora's global bounty API for all active bounties, filters for Rust + minimum reward
2. Attempts to scrape IssueHunt for funded Rust issues (falls back gracefully if unavailable)
3. Scores each bounty by `reward / complexity_factor` where complexity is estimated from issue body length, comment count, and repo stars
4. Posts ranked embeds to Discord color-coded by score (green = high, yellow = medium, red = low)

## Setup

```bash
cd ~/projects/bounty-hunter
npm install
cp .env.example .env
# Edit .env and add your DISCORD_WEBHOOK_NOXCRAFT value
# Or source ~/.secrets if the webhook is already there
```

## Usage

```bash
# Dry run -- prints results to console, no Discord post
npx tsx src/index.ts --dry-run

# Post to Discord
source ~/.secrets && npx tsx src/index.ts

# Custom minimum reward
npx tsx src/index.ts --dry-run --min-reward 100

# Via npm script
npm run scan:dry
npm run scan
```

## Cron setup

Run daily at 9am:

```bash
crontab -e
```

Add:

```
0 9 * * * cd /home/lgrossi/projects/bounty-hunter && source /home/lgrossi/.secrets && /usr/bin/npx tsx src/index.ts >> /tmp/bounty-hunter.log 2>&1
```

Or weekly on Monday at 9am:

```
0 9 * * 1 cd /home/lgrossi/projects/bounty-hunter && source /home/lgrossi/.secrets && /usr/bin/npx tsx src/index.ts >> /tmp/bounty-hunter.log 2>&1
```
