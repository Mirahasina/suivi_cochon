# Plan d'Implémentation : Offline-First & Gestion des Lots

Ce plan détaille l'intégration d'une architecture **Offline-First** basée sur SQLite pour l'application mobile, ainsi que l'ajout complet de la **Gestion des Lots et Bâtiments** (côté Backend et Frontend). L'objectif est que l'application puisse être utilisée sans connexion internet, et que les données se synchronisent avec le serveur central dès qu'une connexion est disponible, permettant à tous les téléphones de voir les mises à jour.

## ⚠️ User Review Required
> [!IMPORTANT]
> **Validation de l'approche Offline-First :** L'approche proposée consiste à utiliser `expo-sqlite` comme base de données locale principale pour l'application mobile. Toutes les lectures/écritures se feront localement. Un service de synchronisation enverra les modifications (sauvegardées dans une file d'attente locale) au serveur NestJS et récupérera les dernières données. Êtes-vous d'accord avec cette approche "Custom Sync" basée sur SQLite ?

## Proposed Changes

### 1. Backend: Gestion des Lots et Bâtiments
Ajout des nouvelles entités et relations dans NestJS (TypeORM).

#### [NEW] `backend/src/entities/building.entity.ts`
- Entité `Building` : `id`, `name`, `capacity`, `location`, `createdAt`, `updatedAt`.
- Relation `OneToMany` avec `Batch`.

#### [NEW] `backend/src/entities/batch.entity.ts`
- Entité `Batch` (Lot) : `id`, `name`, `startDate`, `status` (ACTIVE, CLOSED), `createdAt`, `updatedAt`.
- Relation `ManyToOne` avec `Building`.
- Relation `OneToMany` avec `Pig`.

#### [MODIFY] `backend/src/entities/pig.entity.ts`
- Ajout d'une relation `ManyToOne` vers `Batch` (un cochon appartient à un lot).

#### [NEW] `backend/src/buildings/` & `backend/src/batches/`
- Création des modules, contrôleurs et services NestJS pour gérer les opérations CRUD sur ces deux nouvelles entités.

### 2. Backend: API de Synchronisation
Pour faciliter l'approche Offline-First, nous allons créer un endpoint dédié à la synchronisation.

#### [NEW] `backend/src/sync/`
- `SyncController` avec une route `POST /sync`.
- Cette route acceptera un tableau de mutations (ex: `[{action: 'CREATE_PIG', data: {...}}, ...]`) envoyées par le téléphone hors-ligne lorsqu'il se reconnecte, et appliquera ces changements à la BDD PostgreSQL.
- Elle renverra également l'état complet actuel de la base de données (Cochons, Lots, Bâtiments) pour que le téléphone mette à jour son SQLite local.

### 3. Frontend: Architecture Offline-First (SQLite)
Remplacement des appels réseau directs par une base de données locale.

#### [MODIFY] `package.json`
- Installation de `expo-sqlite` pour la base de données locale.

#### [NEW] `services/database.ts`
- Initialisation de la base de données SQLite locale avec les tables : `pigs`, `piglets`, `buildings`, `batches`, et `sync_queue`.
- La table `sync_queue` stockera les actions de l'utilisateur (création, modification) faites sans internet.

#### [NEW] `services/syncService.ts`
- Logique de synchronisation :
  1. Envoi du contenu de `sync_queue` vers l'endpoint `/sync` du backend.
  2. Récupération des données fraîches du serveur.
  3. Mise à jour des tables SQLite locales.
  4. Vidage de la file `sync_queue`.

#### [MODIFY] `services/api.ts` -> Remplacement par des appels SQLite
- Modification des méthodes actuelles (getAll, getOne, create, update) pour qu'elles interagissent *uniquement* avec `database.ts` (SQLite) au lieu d'utiliser Axios directement.
- Lorsqu'une donnée est créée/modifiée localement, une entrée est ajoutée dans `sync_queue`.

### 4. Frontend: UI Gestion des Lots
Ajout des écrans pour gérer cette nouvelle fonctionnalité.

#### [NEW] `app/(tabs)/batches.tsx` (ou bâtiments)
- Nouvel onglet pour lister, créer et gérer les bâtiments et les lots.

#### [MODIFY] `app/(tabs)/_layout.tsx`
- Ajout de la navigation vers le nouvel onglet des lots.

#### [MODIFY] Fiche d'ajout / modification de cochon (`app/add-pig.tsx`)
- Ajout d'un sélecteur pour assigner le cochon à un "Lot" existant.

## Verification Plan

### Automated Tests
- Test de compilation du backend `npm run build`.
- Test de l'application Expo (vérifier que `expo-sqlite` compile bien).

### Manual Verification
1. Lancer l'application mobile sans backend allumé : vérifier que l'ajout d'un lot et d'un cochon fonctionne et s'enregistre localement en SQLite.
2. Allumer le backend : appuyer sur un bouton "Synchroniser" ou attendre la synchro automatique.
3. Vérifier en base de données PostgreSQL que les données insérées hors-ligne ont bien été transmises.
4. Sur un deuxième téléphone (ou simulateur), lancer l'application et vérifier qu'il récupère bien les données synchronisées.
