## Cron setup

Run daily at 9am:

```bash
crontab -e
```

Add (replacing [PATH_TO_PROJECT] with your actual directory):

```
0 9 * * * cd /[PATH_TO_PROJECT]/bounty-hunter && npx tsx src/index.ts >> /tmp/bounty-hunter.log 2>&1
```