# Suivi Cochon Malagasy �

Logiciel de gestion de cheptel avec suivi financier, sanitaire et de reproduction.

## 🚀 Démarrage Rapide

### 1. Lancer le Backend (Serveur)
Le serveur gère la base de données et les calculs théoriques.

```bash
cd backend
npm install
npm run start:dev
```
*Note : Le serveur écoute sur le port 3000 et accepte les connexions réseau (`0.0.0.0`).*

### 2. Initialiser les Données (Seed)
Pour remplir la base de données avec les types de vaccins (Fer, Vitamines, etc.) et les normes de croissance :

```bash
cd backend
npm run seed
```

### 3. Lancer le Frontend (Application Mobile)
Depuis la racine du projet :

```bash
npm install
npx expo start
```
*Utilisez **Expo Go** sur votre téléphone Android pour tester.*

## ⚙️ Configuration Réseau
Pour que le téléphone puisse communiquer avec l'ordinateur :
1. Les deux doivent être sur le **même Wi-Fi**.
2. L'adresse IP de l'ordinateur est configurée dans `services/api.ts`. 
   Actuellement : `http://192.168.0.104:3000`.

## 🛠️ Fonctionnalités incluses
- **Gestion Individuelle** : Ajout, Modification et Suppression de cochons.
- **Santé** : Suivi des vaccins, fer, vitamines et déparasitage.
- **Reproduction** : Enregistrement des saillies avec choix du partenaire mâle.
- **Finances** : Calcul des bénéfices, coûts alimentaires et prix de vente.
- **Comparaison Alimentaire** : Réel vs Théorique (normes de croissance).
