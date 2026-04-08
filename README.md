## Cron setup

Run daily at 9am:

```bash
crontab -e
```

Add:

```
0 9 * * * cd ~/projects/bounty-hunter && npx tsx src/index.ts >> /tmp/bounty-hunter.log 2>&1
```

Or weekly on Monday at 9am:

```
0 9 * * 1 cd ~/projects/bounty-hunter && npx tsx src/index.ts >> /tmp/bounty-hunter.log 2>&1
```