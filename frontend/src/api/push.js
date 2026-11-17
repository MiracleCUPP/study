import { isMockMode } from "./client"
import { api } from "./client"


function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}


export async function enablePushNotifications() {
  if (isMockMode) return { mock: true }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Этот браузер не поддерживает Web Push")
  }

  if (!("Notification" in window)) {
    throw new Error("Уведомления не поддерживаются")
  }

  const permission = await Notification.requestPermission()

  if (permission !== "granted") {
    throw new Error("Разрешение на уведомления не выдано")
  }

  const registration = await navigator.serviceWorker.ready
  const config = await api.pushPublicKey()

  if (!config.configured || !config.publicKey) {
    throw new Error("Push-уведомления ещё не настроены на сервере")
  }

  let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    })
  }

  await api.pushSubscribe(subscription.toJSON())
  return subscription
}


export async function pushStatus() {
  if (isMockMode) return { supported: false, enabled: true, permission: "mock" }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { supported: false, enabled: false }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  return {
    supported: true,
    enabled: Boolean(subscription),
    permission: "Notification" in window ? Notification.permission : "unsupported"
  }
}
