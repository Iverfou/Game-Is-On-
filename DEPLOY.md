# Déploiement Vercel — Dashboard Kenzel Veille
## Guide en 5 minutes

---

## Option A — Déploiement via GitHub (recommandé)

### 1. Créer un dépôt GitHub

1. Sur [github.com](https://github.com) → **New repository**
2. Nom : `kenzel-veille-alicante`
3. Visibilité : **Private** (données sensibles)
4. Cliquer **Create repository**

### 2. Pousser les fichiers

Dans un terminal, depuis le dossier `vercel_dashboard/` :
```bash
git init
git add .
git commit -m "feat: dashboard veille concurrentielle Kenzel"
git branch -M main
git remote add origin https://github.com/VOTRE_USERNAME/kenzel-veille-alicante.git
git push -u origin main
```

### 3. Importer sur Vercel

1. [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → sélectionner `kenzel-veille-alicante`
3. Framework : **Other** (pas de framework)
4. **Root Directory** : laisser vide (ou `/`)
5. **Build Command** : laisser vide
6. **Output Directory** : `public`
7. Cliquer **Deploy**

### 4. Configurer les variables d'environnement

Après le premier déploiement :
1. Dashboard Vercel → votre projet → **Settings → Environment Variables**
2. Ajouter ces 4 variables (une par une) :

| Nom | Valeur |
|-----|--------|
| `AIRTABLE_TOKEN` | `patXXXXXXXXXXXXXXXXXX` |
| `AIRTABLE_BASE_ID` | `appXXXXXXXXXXXXXX` |
| `AIRTABLE_TABLE_VEILLE` | `tblXXXXXXXXXXXXXX` |
| `AIRTABLE_TABLE_CONCURRENTS` | `tblXXXXXXXXXXXXXX` |

3. **Sauvegarder** → **Redeploy** (bouton en haut à droite du dernier déploiement)

### 5. Tester

Ouvrir l'URL Vercel fournie (ex: `kenzel-veille-alicante.vercel.app`)
→ Le dashboard doit charger et afficher vos données Airtable.

---

## Option B — Déploiement via CLI Vercel

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter
vercel login

# Depuis le dossier vercel_dashboard/
cd vercel_dashboard
vercel

# Suivre les prompts :
# - Set up and deploy? Y
# - Which scope? → votre compte
# - Link to existing project? N
# - Project name: kenzel-veille-alicante
# - Directory: ./
# - Override settings? N

# Ajouter les variables d'environnement
vercel env add AIRTABLE_TOKEN
vercel env add AIRTABLE_BASE_ID
vercel env add AIRTABLE_TABLE_VEILLE
vercel env add AIRTABLE_TABLE_CONCURRENTS

# Redéployer avec les variables
vercel --prod
```

---

## Personnaliser le domaine (optionnel)

1. Vercel → Settings → Domains
2. Ajouter `veille.kenzel.fr` (si vous avez le domaine)
3. Configurer le CNAME chez votre registrar :
   - `veille` → `cname.vercel-dns.com`

---

## Mettre à jour le dashboard

Chaque fois que vous modifiez les fichiers et poussez sur GitHub, Vercel redéploie automatiquement en moins de 30 secondes.

```bash
git add .
git commit -m "update: amélioration dashboard"
git push
```

---

## Structure des fichiers déployés

```
kenzel-veille-alicante/
├── vercel.json          ← Configuration Vercel
├── package.json         ← Métadonnées projet
├── .env.example         ← Template variables (ne pas committer .env.local)
├── api/
│   ├── veille.js        ← Serverless function → /api/veille
│   └── concurrents.js   ← Serverless function → /api/concurrents
└── public/
    └── index.html       ← Dashboard UI (servi en statique)
```

---

## Dépannage

**Erreur 500 au chargement :**
→ Variables d'environnement non configurées ou mal copiées. Vérifier dans Vercel → Settings → Environment Variables.

**Dashboard vide (0 résultats) :**
→ Airtable contient peut-être des enregistrements mais les IDs de tables sont incorrects. Vérifier les `tblXXXX` dans vos variables.

**Erreur CORS :**
→ Le `vercel.json` inclut les headers CORS. Si persistant, vérifier que le fichier `vercel.json` est bien à la racine du projet.

**Logs Vercel :**
→ Vercel Dashboard → Functions → Voir les logs des fonctions serverless pour diagnostiquer les erreurs API.
