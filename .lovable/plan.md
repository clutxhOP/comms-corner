

# Drop Unique Constraint and Insert 38 Subreddits

## Step 1: Database Migration
Drop the unique index `subreddit_watch_subreddit_unique` on the `subreddit_watch` table:
```sql
DROP INDEX IF EXISTS public.subreddit_watch_subreddit_unique;
```

## Step 2: Bulk Insert Data
Insert all 38 unique subreddit URLs into the `subreddit` column using the insert tool:

```sql
INSERT INTO subreddit_watch (subreddit) VALUES
('https://www.reddit.com/r/AI_Agents'),
('https://www.reddit.com/r/n8n'),
('https://www.reddit.com/r/freelance_forhire/'),
('https://www.reddit.com/r/forhire'),
('https://www.reddit.com/r/hiring'),
('https://www.reddit.com/r/slavelabour'),
('https://www.reddit.com/r/startups/'),
('https://www.reddit.com/r/agency/'),
('https://www.reddit.com/r/AppIdeas/'),
('https://www.reddit.com/r/SaaS'),
('https://www.reddit.com/r/smallbusiness/'),
('https://www.reddit.com/r/Startup_Ideas'),
('https://www.reddit.com/r/sidehustle'),
('https://www.reddit.com/r/nocode'),
('https://www.reddit.com/r/Automation'),
('https://www.reddit.com/r/SideProject'),
('https://www.reddit.com/r/Frontend'),
('https://www.reddit.com/r/UKstartups'),
('https://www.reddit.com/r/Entrepreneur'),
('https://www.reddit.com/r/CreatorServices/'),
('https://www.reddit.com/r/RemoteJobs/'),
('https://www.reddit.com/r/WebDeveloperJobs/'),
('https://www.reddit.com/r/MarketingAutomation/'),
('https://www.reddit.com/r/ecommerce/'),
('https://www.reddit.com/r/automation/'),
('https://www.reddit.com/r/AiAutomations/'),
('https://www.reddit.com/r/parttimejobs/'),
('https://www.reddit.com/r/Solopreneur/'),
('https://www.reddit.com/r/microsaas/'),
('https://www.reddit.com/r/UAE/'),
('https://www.reddit.com/r/DubaiCentral/'),
('https://www.reddit.com/r/DubaiJobs/'),
('https://www.reddit.com/r/SmallBusinessUAE/'),
('https://www.reddit.com/r/UKJobs/'),
('https://www.reddit.com/r/ukstartups/'),
('https://www.reddit.com/r/smallbusinessuk/'),
('https://www.reddit.com/r/Startups_EU/'),
('https://www.reddit.com/r/CanadaJobs/'),
('https://www.reddit.com/r/EntrepreneurCanada/'),
('https://www.reddit.com/r/SmallBusinessCanada/'),
('https://www.reddit.com/r/ausbusiness/'),
('https://www.reddit.com/r/auscorp/');
```

No code changes needed -- purely database operations.

