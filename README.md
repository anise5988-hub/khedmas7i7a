This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# ProfySpace.tn

Marketplace tunisienne moderne pour trouver, réserver et suivre des cours particuliers en direct.

## Local

```bash
npm install
npm run dev
```

## Database

Le projet utilise PostgreSQL avec Prisma.

1. Crée une base PostgreSQL sur Neon ou Supabase.
2. Copie sa chaîne de connexion dans `.env` :

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/profy?sslmode=require"
```

3. Génère le client et applique le schéma :

```bash
npx prisma generate
npx prisma migrate dev --name init
```

## Vercel

Dans **Project Settings → Environment Variables**, ajoute `DATABASE_URL` pour `Production`, `Preview` et `Development`, puis redeploie.

Pour initialiser une base de production depuis un terminal avec la même variable :

```bash
npx prisma migrate deploy
```

L'endpoint `POST /api/auth/register` valide les données, vérifie l'email, hash le mot de passe et crée un élève avec son wallet ou un professeur en attente de vérification. Sans `DATABASE_URL`, il renvoie une erreur explicite au lieu de faire croire que le compte a été créé.

## Vérification

```bash
npm run lint
npm run build
```
