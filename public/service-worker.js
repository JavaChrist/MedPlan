// Service Worker pour MedPlan - Notifications de rappel de traitement
const CACHE_NAME = "medplan-v2";
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
  scheduleNextCheck();
});

// Gestion des messages depuis l'application
self.addEventListener("message", (event) => {
  const { type, data } = event.data;

  switch (type) {
    case "schedule-notifications":
      event.waitUntil(handleScheduleNotifications(data));
      break;
    case "cancel-notifications":
      event.waitUntil(handleCancelNotifications(data.treatmentId));
      break;
    case "mark-taken":
      event.waitUntil(handleMarkTaken(data));
      break;
    default:
      console.log("Service Worker: Message non reconnu", type);
  }
});

// Gestion des clics sur les notifications
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};

  if (event.action === "mark-taken") {
    event.waitUntil(
      (async () => {
        if (notifData.notificationId) {
          await deleteNotification(notifData.notificationId);
        }
        const clientList = await clients.matchAll({ type: "window" });
        clientList.forEach((client) => {
          client.postMessage({ type: "mark-treatment-taken", data: notifData });
        });
      })()
    );
  } else {
    // Ouvrir ou focuser l'application
    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        const focused = clientList.find(c => c.focused);
        if (focused) return focused.focus();
        if (clientList.length > 0) return clientList[0].focus();
        return clients.openWindow("/");
      })
    );
  }
});

// Periodicité via setTimeout (compatible iOS PWA)
// On utilise un alarm de 60s maximum pour rester dans les limites iOS
let checkTimeout = null;

function scheduleNextCheck() {
  if (checkTimeout) clearTimeout(checkTimeout);
  // Vérifier dans 60 secondes
  checkTimeout = setTimeout(async () => {
    await checkAndShowNotifications();
    scheduleNextCheck();
  }, 60000);
}

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
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(notification);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error("Erreur sauvegarde notification:", error);
  }
}

async function getScheduledNotifications() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function deleteNotification(notificationId) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(notificationId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.error("Erreur suppression notification:", error);
  }
}

async function deleteNotificationsByTreatment(treatmentId) {
  try {
    const db = await openDB();
    const notifications = await getScheduledNotifications();
    const toDelete = notifications.filter(n => n.treatmentId === treatmentId);
    const tx = db.transaction([STORE_NAME], "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const n of toDelete) {
      store.delete(n.id);
    }
  } catch (error) {
    console.error("Erreur suppression notifications traitement:", error);
  }
}

// === GESTION DES NOTIFICATIONS ===

async function handleScheduleNotifications(treatment) {
  await deleteNotificationsByTreatment(treatment.id);

  const today = new Date();

  if (!treatment.schedules?.length) return;

  for (const schedule of treatment.schedules) {
    if (!schedule.time) continue;
    const [hours, minutes] = schedule.time.split(":").map(Number);

    const notificationTime = new Date(today);
    notificationTime.setHours(hours, minutes, 0, 0);

    // Si l'heure est déjà passée aujourd'hui, programmer pour demain
    if (notificationTime <= new Date()) {
      notificationTime.setDate(notificationTime.getDate() + 1);
    }

    const dateStr = notificationTime.toISOString().split("T")[0];

    const notification = {
      id: `${treatment.id}-${schedule.time}-${dateStr}`,
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

async function handleCancelNotifications(treatmentId) {
  await deleteNotificationsByTreatment(treatmentId);
}

async function handleMarkTaken(data) {
  if (data.notificationId) {
    await deleteNotification(data.notificationId);
  }
}

// === VÉRIFICATION ET AFFICHAGE DES NOTIFICATIONS ===

async function checkAndShowNotifications() {
  try {
    const now = Date.now();
    const notifications = await getScheduledNotifications();

    for (const notification of notifications) {
      const timeDiff = notification.timestamp - now;

      // Afficher si dans la fenêtre [-30s, +30s]
      if (Math.abs(timeDiff) <= 30000 && notification.scheduled) {
        await showNotification(notification);
        notification.scheduled = false;
        await saveNotification(notification);
      }

      // Supprimer les notifications expirées (plus de 2 heures)
      if (now - notification.timestamp > 7200000) {
        await deleteNotification(notification.id);
      }
    }
  } catch (error) {
    console.error("Erreur vérification notifications:", error);
  }
}

async function showNotification(notification) {
  try {
    // Sur iOS PWA, les actions ne sont pas supportées — on garde une notification simple
    const isIOS = /iphone|ipad|ipod/i.test(self.navigator?.userAgent || '');

    const options = {
      body: `${notification.treatmentName} — ${notification.dosage} ${notification.unit}`,
      icon: "/apple-touch-icon.png",
      badge: "/apple-touch-icon.png",
      tag: notification.id,
      renotify: true,
      data: {
        notificationId: notification.id,
        treatmentId: notification.treatmentId,
        treatmentName: notification.treatmentName,
        time: notification.time,
      },
    };

    // Les actions ne sont pas supportées sur iOS Safari
    if (!isIOS) {
      options.requireInteraction = true;
      options.actions = [
        { action: "mark-taken", title: "Pris ✅" },
        { action: "remind-later", title: "Plus tard ⏰" },
      ];
    }

    await self.registration.showNotification("💊 MedPlan — Rappel traitement", options);
  } catch (error) {
    console.error("Erreur affichage notification:", error);
  }
}

// === GESTION DU CACHE (PWA) ===

self.addEventListener("fetch", (event) => {
  if (
    event.request.destination === "image" ||
    event.request.url.includes("/static/") ||
    event.request.url.includes("/icons/")
  ) {
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});

console.log("Service Worker MedPlan v2 chargé ✅");
