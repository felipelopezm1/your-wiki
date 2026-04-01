# Weeeeki

A digital keepsake library for Ceci. Friends can leave messages that appear as beautiful 3D books in an editorial-style interface.

## Tech Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- Three.js via @react-three/fiber + @react-three/drei
- @chenglou/pretext for text layout
- Framer Motion for animations
- Zustand for state management
- Upstash Redis for data storage
- Vercel Blob for image uploads

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

Required for API functionality (get these from Vercel after provisioning):

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
BLOB_READ_WRITE_TOKEN=
```

Run `vercel env pull .env.local` to pull them after linking the project.

## Deployment

Deployed on Vercel. Push to `main` to trigger a production deploy.

## Seeding Wikipedia Content

After deploying, call the seed endpoint to populate the library with Wikipedia entries:

```bash
curl -X POST https://your-domain.vercel.app/api/wiki/seed
```

## Project Structure

- `src/` - React frontend (Vite)
- `api/` - Vercel serverless functions
- `public/` - Static assets
