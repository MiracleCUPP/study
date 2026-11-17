self.addEventListener("install", event => {
  self.skipWaiting()
})

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", event => {
  let data = {
    title: "STUDY",
    body: "Новое уведомление",
    link: "/"
  }

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    if (event.data) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: "/assets/app-icon.svg",
    badge: "/assets/app-icon.svg",
    data: {
      link: data.link || "/"
    },
    tag: data.payload?.lessonId
      ? `study-lesson-${data.payload.lessonId}-${data.title}`
      : undefined
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "STUDY", options)
  )
})

self.addEventListener("notificationclick", event => {
  event.notification.close()

  const link = event.notification.data?.link || "/"

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(windowClients => {
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(link)
          return client.focus()
        }
      }

      return clients.openWindow(link)
    })
  )
})
