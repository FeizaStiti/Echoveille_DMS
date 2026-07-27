# EchoVeille — DMS · Digital Medical Systems

Plateforme de gestion des échographes et des contrats de maintenance.
Aucun Django, aucun module fournisseur/service : uniquement **Échographes** et **Contrats de maintenance**, avec génération automatique du planning et alertes 48h.

---

## 1. Fonctionnalités

- **Échographes** : ajout avec marque, type, N° de série, date d'installation, garantie, fiche de travail et bon de livraison téléchargeables. L'établissement client (hôpital / clinique / cabinet) est créé automatiquement à l'ajout, avec autocomplétion s'il existe déjà.
- **Contrats de maintenance** : préventif ou tout risque, fréquence 2, 3 ou 4 fois par an. La date de la première maintenance génère automatiquement tout le planning de l'année, avec aperçu en direct dans le formulaire.
- **Tableau de bord** : statistiques (échographes, établissements, contrats actifs) + alertes automatiques 48h avant une maintenance à venir, et liste des maintenances en retard.
- **Connexion** : accès protégé par mot de passe partagé (pas de comptes individuels), adapté à une petite équipe.
- **Design** : identité dédiée autour du logo DMS (bleu clinique + rouge de marque), avec motif d'onde d'écho en signature.

---

## 2. Architecture technique

Le site est pensé pour un déploiement **Netlify** :

| Élément | Techno |
|---|---|
| Frontend | HTML / CSS / JS statiques (`public/`) |
| API | Netlify Functions (`netlify/functions/`, Node.js) |
| Base de données | PostgreSQL hébergé sur **Supabase** (gratuit) |
| Fichiers (fiches, bons de livraison) | **Netlify Blobs** (stockage intégré, aucune config) |
| Session | Cookie signé (JWT), mot de passe unique partagé |

> Netlify héberge du contenu statique et des fonctions serverless, mais pas de base de données persistante ni de serveur permanent — d'où le choix de Supabase (Postgres) pour les données, qui reste gratuit pour ce volume d'usage et fonctionne parfaitement avec des fonctions serverless.

---

## 3. Déploiement — étape par étape

### A. Créer la base de données (Supabase)

1. Créez un compte gratuit sur [supabase.com](https://supabase.com) et un nouveau projet.
2. Dans l'éditeur SQL du projet, collez et exécutez le contenu de [`db/schema.sql`](db/schema.sql).
3. Allez dans **Project Settings → Database → Connection string** (mode *URI*, onglet *Connection pooling* recommandé) et copiez l'URL — vous en aurez besoin à l'étape C.

### B. Déployer sur Netlify

1. Poussez ce dossier sur un dépôt GitHub (ou GitLab/Bitbucket).
2. Sur [app.netlify.com](https://app.netlify.com), cliquez **Add new site → Import an existing project**, connectez le dépôt.
3. Netlify détecte automatiquement `netlify.toml` (dossier publié : `public`, fonctions : `netlify/functions`). Laissez les réglages par défaut et cliquez **Deploy**.

### C. Configurer les variables d'environnement

Dans Netlify : **Site configuration → Environment variables**, ajoutez :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | L'URL de connexion Supabase copiée à l'étape A |
| `APP_PASSWORD` | Le mot de passe d'accès à la plateforme (choisissez-en un fort) |
| `APP_SECRET` | Une chaîne aléatoire longue (ex. générée via `openssl rand -hex 32`) pour signer les sessions |

Puis **redéployez** le site (Deploys → Trigger deploy) pour que les variables soient prises en compte.

### D. Activer Netlify Blobs

Aucune configuration nécessaire : dès que le site est déployé sur Netlify, `@netlify/blobs` fonctionne automatiquement pour stocker les fiches de travail et bons de livraison.

---

## 4. Développement local (optionnel)

```bash
npm install -g netlify-cli
cd echoveille
npm install
netlify dev
```

Créez un fichier `.env` à la racine avec les mêmes variables que ci-dessus (`DATABASE_URL`, `APP_PASSWORD`, `APP_SECRET`) — `netlify dev` les charge automatiquement. Le site sera disponible sur `http://localhost:8888`.

---

## 5. Structure du projet

```
echoveille/
├── netlify.toml                 # config Netlify (build, redirections, headers)
├── package.json
├── db/
│   └── schema.sql                # schéma Postgres à exécuter sur Supabase
├── netlify/functions/
│   ├── login.js / logout.js      # authentification par mot de passe partagé
│   ├── dashboard.js               # stats + alertes 48h + retards
│   ├── etablissements.js          # autocomplétion clients
│   ├── echographes.js             # liste, détail, création (+ upload fichiers)
│   ├── contrats.js                # liste, détail, création, marquer fait, renouveler
│   ├── download.js                # téléchargement des fichiers (Netlify Blobs)
│   └── utils/                     # db.js, auth.js, schedule.js (logique partagée)
└── public/
    ├── login.html
    ├── dashboard.html
    ├── echographes.html
    ├── contrats.html
    ├── css/styles.css
    ├── js/app.js, schedule-preview.js
    └── img/logo.png, favicon.png
```

---

## 6. Remplacer le logo

Le logo est utilisé à trois endroits : `public/img/logo.png` (sidebar + page de connexion) et `public/img/favicon.png` (onglet du navigateur). Remplacez ces deux fichiers par vos propres images (même noms) pour mettre à jour l'identité visuelle sans toucher au code.

---

## 7. Notes

- La fréquence de maintenance (2/3/4 fois par an) répartit les visites à intervalles réguliers sur 12 mois à partir de la date de première maintenance.
- Les maintenances passées non marquées « effectuées » basculent automatiquement en **retard** à chaque chargement du tableau de bord.
- Le mot de passe est unique et partagé par toute l'équipe (pas de comptes individuels) — adapté à un usage en petite structure. Pour une gestion multi-comptes plus fine, une évolution future pourrait ajouter une table `utilisateurs` avec Supabase Auth.
