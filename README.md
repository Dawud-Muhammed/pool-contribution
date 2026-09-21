This is a Next.js pool contribution app using Neon/Postgres, Drizzle, Better Auth, and Links.et receipt verification.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy

Copy `.env.example` into your hosting provider's environment settings. Set `BETTER_AUTH_URL` to the exact public HTTPS URL, generate a new `BETTER_AUTH_SECRET`, and use a production Links.et key. Never commit `.env.local` or production secrets.

Run the database migration against the production database:

```bash
npx drizzle-kit migrate
```

Validate and run the production app:

```bash
npm run build
npm run start
```

After the first Better Auth signup, promote the administrator in the production database:

```sql
UPDATE "user" SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

The public routes are `/pools`, `/pools/[id]`, and `/deposit`. Admin routes are `/admin/login` and `/admin/pools/[id]`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
