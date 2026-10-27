# 🔔 Système de Notifications MedPlan

## Vue d'ensemble

MedPlan utilise les **Service Workers** et les **notifications natives** du navigateur pour rappeler automatiquement les prises de traitement.

## Fonctionnement

### 1. Demande de permission

- Au premier lancement, l'app demande la permission d'afficher des notifications
- L'utilisateur peut réactiver via le bouton en haut à droite

### 2. Planification automatique

- Chaque traitement avec horaires fixes génère des notifications
- Les notifications sont stockées dans **IndexedDB** (base locale)
- Le service worker vérifie **toutes les minutes** s'il faut afficher une notification

### 3. Notification à l'heure prévue

```
💊 Prendre votre traitement
Paracétamol - 500 mg
Il est temps de prendre votre traitement !

[Pris ✅] [Plus tard ⏰]
```

### 4. Actions possibles

- **Pris ✅** : Marque automatiquement le traitement comme pris dans Firestore
- **Plus tard ⏰** : Ferme la notification (possibilité de rappel manuel)
- **Clic sur la notification** : Ouvre/focus l'application

## Architecture technique

### Service Worker (`/public/service-worker.js`)

- **Installation/Activation** : Démarrage automatique du checker
- **IndexedDB** : Stockage local des notifications programmées
- **Vérification périodique** : `setInterval` toutes les 60 secondes
- **Communication** : Messages bi-directionnels avec l'app React

### Service React (`/src/services/notificationService.ts`)

- **Singleton** : Une seule instance pour toute l'app
- **Permissions** : Gestion de `Notification.requestPermission()`
- **Planification** : Communication avec le service worker
- **Événements** : Écoute des retours du service worker

### Intégration (`/src/pages/Home.tsx`)

- **Permissions** : Demande au montage de l'app
- **Planification** : Auto-planification quand les traitements changent
- **Marquage** : Écoute des événements "pris depuis notification"

## Types de traitements supportés

✅ **Supportés :**

- Tous les jours à heure fixe
- Jours spécifiques (L, M, M, J, V, S, D)
- Tous les X jours
- Programme cyclique (21 jours on, 7 jours off)

❌ **Non supportés :**

- Traitements "au besoin" (pas d'horaire fixe)
- Traitements inactifs

## Fonctionnalités avancées

### Gestion automatique

- **Nettoyage** : Suppression des notifications expirées (> 1 heure)
- **Déduplication** : Une notification par horaire par traitement
- **Persistence** : Fonctionne même app fermée (service worker actif)

### Offline/PWA

- **Fonctionne hors ligne** : Notifications stockées localement
- **Cache intelligent** : Ressources statiques mises en cache
- **Installation** : Peut être installée comme app native

## Debug/Test

### Console du navigateur

```js
// Tester une notification
navigator.serviceWorker.controller.postMessage({
  type: "schedule-notifications",
  data: {
    /* données traitement */
  },
});
```

### Bouton Test

- Bouton "Test" dans l'en-tête quand notifications actives
- Affiche une notification de test immédiate

### DevTools

- **Application** > **Service Workers** : Voir l'état du SW
- **Application** > **Storage** > **IndexedDB** : Voir les notifications programmées
- **Console** : Logs détaillés du système

## Dépannage

### Notifications n'apparaissent pas

1. Vérifier les permissions dans les paramètres du navigateur
2. Vérifier que le service worker est enregistré
3. Regarder les logs dans la console DevTools

### "Service Worker non disponible"

- Le service worker s'enregistre uniquement en **production** (`VITE_PROD=true`)
- En développement, les notifications utiliseront l'API native directement

### IndexedDB

- Base locale : `MedPlanNotifications`
- Store : `notifications`
- Clés : `{treatmentId}-{time}-{date}`

## Sécurité

- **Permissions explicites** : L'utilisateur doit approuver
- **Données locales** : Aucune donnée sensible envoyée à des serveurs tiers
- **HTTPS requis** : Service workers nécessitent HTTPS en production
