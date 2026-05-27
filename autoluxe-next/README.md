# Note: app is at repository root

The Next.js project (`package.json`, `app/`, `next.config.ts`) lives in the **parent folder**, not in `autoluxe-next/`.

On Vercel, set **Root Directory** to `.` (empty / repository root).  
Do **not** use `autoluxe-next` as the root — that folder has no `package.json` and deploys will fail with “No Next.js version detected”.
