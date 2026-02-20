

# Subreddit Watch CRUD Dashboard

## Overview
Add a new `subreddit_watch` table and a full CRUD dashboard page at `/admin/subreddits`, accessible only to admin and ops users. Zero changes to any existing files except minimal, additive-only edits to `App.tsx` (new route) and `AppSidebar.tsx` (new nav item).

---

## 1. Database Table (SQL -- provided for manual execution)

You will receive the full `CREATE TABLE` SQL with RLS policies to run manually in the SQL Editor. The table uses `BIGSERIAL` primary key, `subreddit` (TEXT), `count` (TEXT), and auto-filled timestamps. RLS restricts all CRUD to users with `admin` or `ops` roles via the existing `has_role()` function. Realtime will be enabled on the table.

```text
CREATE TABLE public.subreddit_watch (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subreddit TEXT,
  count TEXT,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subreddit_watch ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY "Admin and Ops can view subreddit_watch"
  ON public.subreddit_watch FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

-- INSERT
CREATE POLICY "Admin and Ops can insert subreddit_watch"
  ON public.subreddit_watch FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role)
           OR has_role(auth.uid(), 'ops'::user_role));

-- UPDATE
CREATE POLICY "Admin and Ops can update subreddit_watch"
  ON public.subreddit_watch FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

-- DELETE
CREATE POLICY "Admin and Ops can delete subreddit_watch"
  ON public.subreddit_watch FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role)
      OR has_role(auth.uid(), 'ops'::user_role));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subreddit_watch;
```

---

## 2. New Files to Create

### `src/hooks/useSubredditWatch.tsx`
- Custom hook following the same pattern as `useOutreachEntries.tsx`
- Exports: `entries`, `loading`, `fetchEntries` (refetch), plus `addEntry`, `updateEntry`, `deleteEntry`
- Subscribes to Supabase realtime on `subreddit_watch` table
- Uses `supabase` client with typed queries (cast as needed since the types file auto-updates after table creation)

### `src/pages/admin/SubredditWatch.tsx`
- Full CRUD dashboard page wrapped in `MainLayout`
- Features:
  - Search bar filtering by subreddit name
  - Table view (id, subreddit, count, created_at, last_updated_at) with pagination (20 per page)
  - "Add Subreddit" dialog with form fields for subreddit and count
  - Inline edit: click row to enter edit mode, save/cancel buttons
  - Delete with confirmation `AlertDialog`
  - Refresh button (calls refetch)
  - Realtime auto-updates via the hook
- Uses existing ShadCN components: `Card`, `Table`, `Button`, `Input`, `Dialog`, `AlertDialog`, `Badge`
- Matches existing app theme exactly

---

## 3. Additive Edits to Existing Files

### `src/App.tsx` (additive only)
- Add import for `SubredditWatch` page
- Add one new `<Route>` entry: `/admin/subreddits` wrapped in `<ProtectedRoute requireOpsOrAdmin>`

### `src/components/layout/AppSidebar.tsx` (additive only)
- Add `Eye` (or `Radio`) icon import from lucide-react
- Add `{ title: "Subreddit Watch", url: "/admin/subreddits", icon: Radio }` to both `adminNavItems` and `opsNavItems` arrays

---

## 4. Regression Safety

- No existing tables, RLS policies, edge functions, webhooks, or components are modified
- No existing routes are changed
- The only two existing files touched (`App.tsx`, `AppSidebar.tsx`) receive purely additive lines (new import + new array entry + new route)
- The new table is completely independent with its own RLS policies

