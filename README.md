# Suivi Cochon Malagasy

Application mobile de gestion de cheptel porcin avec suivi financier, sanitaire et de reproduction — adaptée au contexte malgache.

## Démarrage rapide

### Backend (API sur Render ou local)

```bash
cd backend
npm install
npm run start:dev
```

Le seed (vaccins, normes par race, 52 semaines) s'exécute **automatiquement** au démarrage.

### Application mobile

```bash
npm install
npx expo start
```

Pour un build APK : `eas build --profile preview`

L'API de production est configurée dans `eas.json` : `https://suivi-cochon1.onrender.com`

## Fonctionnalités

- **Cheptel** : ajout, suivi, import CSV, lots et bâtiments
- **Croissance auto** : poids et repas calculés selon l'âge et la race (modifiables)
- **8 races** : Large White, Landrace, Piétrain, Duroc, Hampshire, Croisé, Local (Gasy), Autre
- **Vaccins** : 11 types + planning automatique selon l'âge
- **PPA** : alertes biosécurité (pas de vaccin — prévention uniquement)
- **Finances** : prix provende par phase, estimation vente vivant, mode simple
- **Hors-ligne** : cache + file d'attente + synchronisation

## Paramètres recommandés (Madagascar)

| Paramètre | Valeur indicative |
|-----------|-------------------|
| Provende démarrage | 2 200 Ar/kg |
| Provende croissance | 2 000 Ar/kg |
| Provende finition | 1 800 Ar/kg |
| Porc vivant | 10 000 – 14 000 Ar/kg (selon région) |

À ajuster dans l'onglet **Réglages** selon votre fournisseur (LFL, Farmshop, aliment local).
