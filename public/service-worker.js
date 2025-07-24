// Service Worker pour MedPlan - Notifications de rappel de traitement
const CACHE_NAME = "medplan-v1";
const DB_NAME = "MedPlanNotifications";
const DB_VERSION = 1;
const STORE_NAME = "notifications";

// Installation du Service Worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Installation");
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activation");
  event.waitUntil(clients.claim());

  // Démarrer la vérification périodique des notifications
  startNotificationChecker();
});

// Gestion des messages depuis l'application
self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "schedule-notifications":
      handleScheduleNotifications(data);
      break;
    case "cancel-notifications":
      handleCancelNotifications(data.treatmentId);
      break;
    case "mark-taken":
      handleMarkTaken(data);
      break;
    default:
      console.log("Service Worker: Message non reconnu", type);
  }
});

// Gestion des clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const { action, data } = event.notification;

  if (action === "mark-taken") {
    // Envoyer un message à tous les clients pour marquer comme pris
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: "mark-treatment-taken",
            data: data,
          });
        });
      })
    );
  } else {
    // Ouvrir ou focuser l'application
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow("/");
      })
    );
  }
});

// === GESTION INDEXEDDB ===

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
        store.createIndex("treatmentId", "treatmentId", { unique: false });
      }
    };
  });
}

async function saveNotification(notification) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.put(notification);
    console.log("Notification sauvegardée:", notification);
  } catch (error) {
    console.error("Erreur sauvegarde notification:", error);
  }
}

async function getScheduledNotifications() {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    return [];
  }
}

async function deleteNotification(notificationId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    await store.delete(notificationId);
    console.log("Notification supprimée:", notificationId);
  } catch (error) {
    console.error("Erreur suppression notification:", error);
  }
}

async function deleteNotificationsByTreatment(treatmentId) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index("treatmentId");

    const request = index.openCursor(IDBKeyRange.only(treatmentId));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  } catch (error) {
    console.error("Erreur suppression notifications traitement:", error);
  }
}

// === GESTION DES NOTIFICATIONS ===

async function handleScheduleNotifications(treatment) {
  console.log("Planification notifications pour:", treatment.name);

  // Supprimer les anciennes notifications de ce traitement
  await deleteNotificationsByTreatment(treatment.id);

  // Obtenir la date d'aujourd'hui
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Planifier les nouvelles notifications
  if (treatment.schedules && treatment.schedules.length > 0) {
    for (const schedule of treatment.schedules) {
      const [hours, minutes] = schedule.time.split(":").map(Number);

      // Créer le timestamp pour aujourd'hui à cette heure
      const notificationTime = new Date(today);
      notificationTime.setHours(hours, minutes, 0, 0);

      // Si l'heure est déjà passée aujourd'hui, programmer pour demain
      if (notificationTime <= new Date()) {
        notificationTime.setDate(notificationTime.getDate() + 1);
      }

      const notification = {
        id: `${treatment.id}-${schedule.time}-${todayStr}`,
        treatmentId: treatment.id,
        treatmentName: treatment.name,
        dosage: treatment.dosage,
        unit: treatment.unit,
        time: schedule.time,
        timestamp: notificationTime.getTime(),
        scheduled: true,
      };

      await saveNotification(notification);
    }
  }
}

async function handleCancelNotifications(treatmentId) {
  console.log("Annulation notifications pour:", treatmentId);
  await deleteNotificationsByTreatment(treatmentId);
}

async function handleMarkTaken(data) {
  // Supprimer la notification car elle a été traitée
  if (data.notificationId) {
    await deleteNotification(data.notificationId);
  }
}

// === VÉRIFICATION PÉRIODIQUE ===

let notificationChecker = null;

function startNotificationChecker() {
  // Arrêter l'ancien checker s'il existe
  if (notificationChecker) {
    clearInterval(notificationChecker);
  }

  // Vérifier toutes les minutes
  notificationChecker = setInterval(checkAndShowNotifications, 60000);

  // Vérification immédiate
  checkAndShowNotifications();

  console.log("Vérificateur de notifications démarré");
}

async function checkAndShowNotifications() {
  try {
    const now = new Date();
    const currentTime = now.getTime();

    // Récupérer toutes les notifications programmées
    const notifications = await getScheduledNotifications();

    for (const notification of notifications) {
      // Vérifier si il est temps d'afficher cette notification (±30 secondes)
      const timeDiff = Math.abs(currentTime - notification.timestamp);

      if (timeDiff <= 30000 && notification.scheduled) {
        await showNotification(notification);

        // Marquer comme affichée pour éviter les doublons
        notification.scheduled = false;
        await saveNotification(notification);
      }

      // Supprimer les notifications expirées (plus de 1 heure)
      if (currentTime - notification.timestamp > 3600000) {
        await deleteNotification(notification.id);
      }
    }
  } catch (error) {
    console.error("Erreur vérification notifications:", error);
  }
}

async function showNotification(notification) {
  try {
    const options = {
      body: `${notification.treatmentName} - ${notification.dosage} ${notification.unit}\nIl est temps de prendre votre traitement !`,
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: notification.id,
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: "mark-taken",
          title: "Pris ✅",
        },
        {
          action: "remind-later",
          title: "Plus tard ⏰",
        },
      ],
      data: {
        notificationId: notification.id,
        treatmentId: notification.treatmentId,
        treatmentName: notification.treatmentName,
        time: notification.time,
      },
    };

    await self.registration.showNotification(
      `💊 Prendre votre traitement`,
      options
    );

    console.log("Notification affichée:", notification.treatmentName);
  } catch (error) {
    console.error("Erreur affichage notification:", error);
  }
}

// === GESTION DU CACHE (PWA) ===

self.addEventListener("fetch", (event) => {
  // Stratégie cache-first pour les ressources statiques
  if (
    event.request.destination === "image" ||
    event.request.url.includes("/static/") ||
    event.request.url.includes("/icons/")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

console.log("Service Worker MedPlan chargé ✅");
