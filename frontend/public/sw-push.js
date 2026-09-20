// Plain, static service worker - only handles Web Push. Registered directly
// (not through vite-plugin-pwa) so it behaves identically in dev and prod.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = { title: "Receita Lembrete", body: "Você tem um lembrete." };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // ignore malformed payloads, fall back to the default message
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
