# MedPlan

MedPlan est une application web pour suivre des traitements médicamenteux. Une personne crée un compte, enregistre ses médicaments, consulte le planning du jour et indique si une prise a été faite ou non. Elle peut aussi suivre les traitements d’un proche ou d’un animal depuis le même compte.

L’interface est en français, sur fond sombre, et pensée d’abord pour un téléphone. Elle peut être ajoutée à l’écran d’accueil grâce au manifeste d’application web (PWA).

## Public

MedPlan s’adresse aux personnes qui veulent se souvenir de leurs prises, et à celles qui gèrent aussi les traitements d’un enfant, d’un conjoint, d’un animal ou d’une autre personne.

Aucun rôle de professionnel de santé n’est prévu dans l’application.

## Fonctionnalités

### Opérationnelles

Ces parcours sont reliés aux écrans utilisés et enregistrent les données dans Firebase.

- **Compte.** Inscription et connexion par e-mail et mot de passe. Le mot de passe doit contenir au moins 6 caractères. La déconnexion est disponible.
- **Fiche du compte.** Nom affiché et numéro de téléphone, enregistrés avec le compte. L’e-mail reste celui de la connexion. La date de création du compte et celle de la dernière connexion sont affichées.
- **Ajout d’un traitement**, en 5 étapes :
  - nom libre ;
  - type (comprimé, gélule, sirop, crème, collyre, inhalateur, et d’autres formes) ;
  - icône de forme, que l’on peut passer ;
  - dose (mg, mcg, g, ml, %, UI ou dose) et, pour les comprimés, gélules et suppositoires, quantité par prise (quart, demi, trois quarts, 1, 1,5, 2 ou 3) ;
  - fréquence : tous les jours, certains jours de la semaine, tous les X jours, cycle (période active puis pause), ou au besoin ;
  - plusieurs horaires dans la journée, sauf pour « au besoin » ;
  - date de début, date de fin, raccourcis de durée (1 à 8 semaines, 3 mois) ou traitement sans date de fin ;
  - association facultative à un profil (enfant, conjoint, animal, autre). Sans profil choisi, le traitement est celui de « Moi ».
- **Planning.** L’accueil montre une frise d’environ 30 jours avant et après aujourd’hui. Pour le jour choisi, les prises prévues sont groupées par heure. On peut les marquer « Pris » ou « Non pris ». Les traitements du profil sélectionné sont listés en dessous.
- **Gestion des traitements.** Liste de tous les traitements, avec modification, activation, désactivation et suppression. La suppression demande une confirmation dans l’application.
- **Profils.** Création et suppression de profils (nom, lien, couleur). L’accueil permet de basculer entre « Moi » et ces profils. L’offre par défaut, MedPlan Basic, autorise 2 profils en plus de « Moi ».

### Partielles

Le code existe, mais le parcours n’est pas fiable ou n’est pas branché à l’écran principal.

- **Rappels automatiques.** L’accueil peut demander l’autorisation des notifications et en envoyer une de test. Sur iPhone, l’application indique qu’il faut d’abord l’installer sur l’écran d’accueil (iOS 16.4 ou plus récent). Le service worker sait stocker des rappels et les afficher, avec les actions « Pris » et « Plus tard » hors iPhone. Cet enchaînement n’est pas appelé par l’accueil : il n’est branché que dans une page `Home` qui n’est pas accessible. Un rappel programmé ne tient pas compte des jours de la semaine ni des cycles. L’action « Plus tard » ouvre l’application sans créer un nouveau rappel.
- **Suivi des prises.** « Pris » et « Non pris » sont enregistrés par date sur le traitement, pas prise par prise. Après un rechargement de la page, la liste du jour est recalculée et les prises reviennent en attente, même si la date a déjà été enregistrée. La frise, elle, peut encore montrer qu’au moins une prise a été cochée ce jour-là.
- **Traitements au besoin.** On peut les créer, sans horaire. Ils apparaissent dans la liste, mais le bouton « Traitements au besoin » de l’accueil ouvre seulement le formulaire d’ajout. Il ne permet pas d’enregistrer une prise ponctuelle.
- **Profils.** On peut en ajouter et en supprimer. Il n’y a pas d’écran pour modifier un profil déjà créé. L’offre Basic bloque l’ajout au-delà de 2 profils.
- **Paiement.** Quand la limite de profils est atteinte, l’écran propose MedPlan Family (2,99 €, 5 profils) et MedPlan Premium (4,99 €, profils sans limite). Ces montants sont ceux écrits dans le code. Le paiement passe par Mollie, avec la banque de test iDEAL `ideal_TESTNL99`. Un bouton permet aussi de forcer l’offre si le paiement n’est pas confirmé. Le webhook qui doit mettre à jour l’offre utilise Firebase Admin, qui n’est pas déclaré dans les dépendances du projet.
- **Installation sur l’écran d’accueil.** Le manifeste, les icônes et un service worker sont présents. Le cache hors ligne ne couvre que certaines images, pas l’ensemble de l’application.
- **Ancienne page d’accueil.** Le fichier `src/pages/Home.tsx` reprend une autre version du planning et des rappels. Aucune adresse ne l’affiche.

### Simulées

- Le paiement Mollie est lancé avec un émetteur iDEAL de test, pas avec un parcours bancaire réel.
- Le bouton « Forcer » applique l’offre Family ou Premium sans paiement confirmé.
- La notification « Test » de l’ancienne page, et la notification envoyée après accord sur l’accueil, vérifient seulement que le navigateur sait afficher un message. Elles ne rappellent pas une prise à l’heure prévue.

### Prévues, absentes du fonctionnement actuel

L’ancien descriptif du dépôt annonçait des éléments qui ne sont pas en place :

- un mode clair (l’application affichée est sombre) ;
- une photo du médicament (seules des icônes sont utilisées ; le stockage de fichiers Firebase est initialisé mais n’est branché à aucun écran) ;
- une page d’historique dédiée, avec le détail des oublis ;
- le marquage « pris » depuis une notification, sur l’écran réellement utilisé ;
- les pages « Projets » et « Paramètres » présentes dans un ancien menu, qui ne correspondent à aucune route.

## Parcours dans l’application

| Adresse | Accès | Rôle |
| --- | --- | --- |
| `/login` | Public | Connexion et création de compte |
| `/dashboard` | Compte requis | Planning du jour, prises, liste des traitements |
| `/add-treatment` | Compte requis | Ajout ou modification d’un traitement |
| `/manage-treatments` | Compte requis | Activer, modifier, supprimer |
| `/subjects` | Compte requis | Profils et limite d’offre |
| `/profile` | Compte requis | Nom, téléphone, déconnexion |

L’adresse `/` et toute adresse inconnue renvoient vers `/login`. La barre du bas relie l’accueil, les profils, les traitements et le compte.

## Stack

- Interface : React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide
- Compte et données : Firebase Authentication et Cloud Firestore
- Rappels : notifications du navigateur et service worker
- Paiement, côté serveur : routes Vercel et client Mollie
- Déploiement prévu : Vercel (`vercel.json`, build Vite, dossier `dist`)

Les données d’un compte sont rangées ainsi dans Firestore :

- `users/{identifiant}` : nom, téléphone, offre éventuelle
- `users/{identifiant}/treatments` : traitements
- `users/{identifiant}/subjects` : profils (proche ou animal)

## Installation

1. Installer Node.js et npm.
2. À la racine du projet, installer les dépendances :

```bash
npm install
```

3. Créer un fichier local `.env.local` avec les variables listées plus bas. Ne pas y placer ce fichier dans un dépôt public.
4. Lancer l’application :

```bash
npm run dev
```

Vite affiche alors l’adresse locale, en général `http://localhost:5173`.

## Configuration

Aucune valeur secrète ne doit être recopiée dans la documentation ni dans un dépôt. Indiquer seulement les noms des variables.

Variables lues par l’interface (fichier `.env.local`) :

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Variables lues par les routes de paiement, côté serveur :

- `MOLLIE_API_KEY`
- `APP_URL` (adresse utilisée pour le retour après paiement et pour le webhook ; en local, une adresse de développement)

Le webhook Mollie initialise Firebase Admin sans clé nommée dans le code. Son fonctionnement en ligne reste à confirmer : la bibliothèque `firebase-admin` n’est pas dans `package.json`.

## Commandes

| Commande | Effet |
| --- | --- |
| `npm install` | Installe les dépendances |
| `npm run dev` | Lance le serveur de développement |
| `npm run build` | Produit le site dans `dist` |
| `npm run preview` | Affiche localement le résultat du build |

Il n’y a pas de commande de test ni de lint dans le projet.

## Déploiement

`vercel.json` décrit un build Vite (`npm run build`, dossier `dist`) et renvoie toutes les adresses vers l’application, pour que la navigation interne fonctionne. Les fichiers `api/billing/mollie/` sont des fonctions prévues pour Vercel.

Ce fichier prépare un déploiement. Il ne prouve pas qu’un site public est en ligne. Aucune adresse publique n’est écrite dans le projet.

## Limites à connaître

- Les rappels à l’heure prévue ne partent pas depuis l’écran d’accueil actuel.
- Une journée n’a qu’un seul marquage « pris » ou « non pris » par traitement, même s’il y a plusieurs horaires.
- Recharger la page réaffiche les prises du jour comme encore à enregistrer.
- Les montants Family et Premium sont codés pour un paiement de test.
- L’application ne donne pas de conseil médical et ne lit pas une ordonnance.
