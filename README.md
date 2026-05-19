# Mazy Admin

Read-only Supabase dashboard for the Mazy student-app dataset. Дипломын ажлын
тестийн самбар. Reads the same Supabase project as the Mazy student app — schema
unchanged, SELECT only.

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

`.env.local` must contain three values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

No auth guard — anyone with the URL can read. Keep the deploy URL private (or
re-add `middleware.ts` later if you need to lock it down).

## Production build

```bash
npm run build        # must exit 0 before deploy
```

## Deploy to Vercel

```bash
npm install -g vercel        # хэрэв install хийгээгүй бол
vercel login
vercel link                  # repo-г Vercel project-той холбоно
```

Set the three env vars on Vercel — through the dashboard
(Project → Settings → Environment Variables) or via CLI:

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

Then deploy:

```bash
vercel deploy --prod
```

Vercel-ийн URL-аа Supabase Auth → URL Configuration → "Site URL" + "Redirect
URLs"-д нэмж magic link зөв ажиллахаар тохируулна.

## Routes

- `/` — Dashboard: 5 stat cards, completion funnel chart, participant table, CSV
  export.
- `/participant/[id]` — One participant: stat row + screen_views, quiz_answers,
  sus_responses tables.
