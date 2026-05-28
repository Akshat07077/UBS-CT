# Cloudinary setup (car photos)

Images are **not** stored in PostgreSQL. Flow:

1. Browser uploads file → `/api/upload/listing-photo` or `/api/upload/image`
2. Server sends file to **Cloudinary** → gets `https://res.cloudinary.com/...`
3. URL is saved in Neon → `cars.image_url` + `car_images.url`

## 1. Create a Cloudinary account

1. Sign up at [cloudinary.com](https://cloudinary.com/users/register/free)
2. Open **Dashboard**
3. Copy:
   - **Cloud name**
   - **API Key**
   - **API Secret** (click “reveal”)

## 2. Add to `.env`

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret
```

Restart the dev server after saving:

```bash
npm run dev
```

## 3. Add on Vercel (production)

**Project → Settings → Environment Variables** — same three keys for Production (and Preview if you use it).

Redeploy after adding them.

## 4. Test upload

1. Open `/list-your-car`
2. Add a photo slot → click thumbnail → choose a JPEG/PNG (max 5 MB)
3. URL should look like: `https://res.cloudinary.com/<cloud_name>/image/upload/...`
4. Submit listing → after admin approval, photos appear in the car slider

Admin fleet uploads use `/api/upload/image` (login required); files go to folder `ubs-car-rental/admin`.

## Folders in Cloudinary Media Library

| Folder | Used by |
|--------|---------|
| `ubs-car-rental/listings` | List your car (guest) |
| `ubs-car-rental/admin` | Admin fleet gallery |

## Without Cloudinary keys

Uploads return a **placeholder** image so the app still works locally. Production should always have all three env vars set.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Upload works but image broken on site | Ensure `res.cloudinary.com` is in `next.config.ts` `images.remotePatterns` (already added) |
| “Cloudinary is partially configured” | Set all three env vars, not just cloud name |
| 401 on upload | Wrong API key/secret; copy again from dashboard |
| Works locally, not on Vercel | Add env vars on Vercel and redeploy |
