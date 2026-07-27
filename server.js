// EchoVeille — serveur Express pour Render
// Ce fichier ne remplace PAS vos fonctions dans netlify/functions/ : il les fait
// simplement tourner telles quelles, sans aucune modification, en traduisant
// les requêtes Express au format que vos fonctions attendent déjà (event / statusCode).
// Résultat : zéro réécriture de contrats.js, dashboard.js, echographes.js, etc.

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const FUNCTIONS_DIR = path.join(__dirname, 'netlify', 'functions');
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.json({ limit: '20mb' }));

// En-têtes de sécurité (équivalent de la section [[headers]] de netlify.toml)
app.use((req, res, next) => {
  res.set('X-Frame-Options', 'DENY');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Sert le front-end (dashboard.html, css, js, images…)
app.use(express.static(PUBLIC_DIR));

// La page d'accueil redirige vers le tableau de bord (équivalent du redirect Netlify)
app.get('/', (req, res) => res.redirect('/dashboard.html'));

// Un seul point d'entrée générique qui appelle la bonne fonction, comme le faisait Netlify
app.all('/.netlify/functions/:fn', async (req, res) => {
  const fnName = req.params.fn;
  const fnPath = path.join(FUNCTIONS_DIR, `${fnName}.js`);

  if (!fs.existsSync(fnPath)) {
    return res.status(404).json({ error: `Fonction "${fnName}" introuvable.` });
  }

  let fnModule;
  try {
    fnModule = require(fnPath);
  } catch (e) {
    console.error(`Erreur de chargement de la fonction ${fnName} :`, e);
    return res.status(500).json({ error: 'Erreur serveur au chargement de la fonction.' });
  }

  const event = {
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters: req.query,
    body: ['GET', 'DELETE'].includes(req.method) ? undefined : JSON.stringify(req.body || {}),
  };

  try {
    const result = await fnModule.handler(event);
    res.status(result.statusCode || 200);
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => res.set(key, value));
    }
    if (result.isBase64Encoded) {
      res.send(Buffer.from(result.body, 'base64'));
    } else {
      res.send(result.body === undefined ? '' : result.body);
    }
  } catch (e) {
    console.error(`ERREUR FONCTION (${fnName}):`, e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`EchoVeille est en ligne sur le port ${PORT}`);
});
