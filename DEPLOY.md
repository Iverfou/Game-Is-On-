[DEPLOY.md](https://github.com/user-attachments/files/31122716/DEPLOY.md)
# Déploiement sur Vercel

## Structure du repo

```
├── public/
│   └── index.html (← le nouveau fichier)
├── api/
│   ├── veille.js
│   └── concurrents.js
├── vercel.json
├── package.json
└── .env.local (local dev only)
```

## Étapes

### 1. Créer le dossier `public/`
```bash
mkdir -p public
cp index.html public/
```

### 2. Variables d'environnement Vercel

Dans le dashboard Vercel, ajouter ces secrets :
- `AIRTABLE_TOKEN` = `patLcCvV71GyvB4sq.6da2d2692b015ffc03cbdd0bb20b8a01b74bd09c48f78cb41b3d0b513ec36522`
- `AIRTABLE_BASE_ID` = `appTrL6dyikqGxZe4`
- `AIRTABLE_TABLE_CONCURRENTS` = `tblSiGUsTuXpEwioY`
- `AIRTABLE_TABLE_VEILLE` = `tbl13Y1eW54aqPTxG`

### 3. Push et redéployer

```bash
git add public/ api/ vercel.json package.json
git commit -m "Fix: Use Vercel API routes instead of direct Airtable calls"
git push
```

Vercel redéploiera automatiquement.

## Infos

- L'`index.html` appelle `/api/veille` et `/api/concurrents` (routes Vercel)
- Le token Airtable ne passe plus en front (sécurité)
- Cache activé : 60s + stale-while-revalidate
- CORS actif sur les routes API

## Test local

```bash
npm run dev  # ou vercel dev
# Visite http://localhost:3000
```
