import { mockRequest } from "../mock/api"

export const isMockMode = import.meta.env.VITE_MOCK_MODE === "true"

let csrfToken = ""

export function setCsrfToken(value) {
  csrfToken = value || ""
}

async function request(path, options = {}) {
  if (isMockMode) return mockRequest(path, options)

  const isForm = options.body instanceof FormData
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(isForm ? {} : { "Content-Type": "application/json" }),
      ...(csrfToken && options.method && options.method !== "GET" ? { "X-CSRF-Token": csrfToken } : {}),
      ...(options.headers || {})
    }
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Ошибка запроса")
  }

  return data
}

export const api = {
  login: data => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  demoRequest: data => request("/public/demo-request", { method: "POST", body: JSON.stringify(data) }),
  demoRequests: () => request("/demo-requests"),
  updateDemoRequest: (id, status) => request(`/demo-requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  }),

  students: () => request("/students"),
  createStudent: data => request("/students", { method: "POST", body: JSON.stringify(data) }),
  updateStudent: (id, data) => request(`/students/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  lessons: () => request("/lessons"),
  createLesson: data => request("/lessons", { method: "POST", body: JSON.stringify(data) }),
  updateLesson: (id, data) => request(`/lessons/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  recurringSchedules: () => request("/schedule/recurring"),
  createRecurringSchedule: data => request("/schedule/recurring", { method: "POST", body: JSON.stringify(data) }),
  updateRecurringSchedule: (id, data) => request(`/schedule/recurring/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  timePreview: (studentId, date, time) => {
    const params = new URLSearchParams({ studentId: String(studentId), date, time })
    return request(`/schedule/time-preview?${params.toString()}`)
  },
  freeSlots: (date, durationMinutes = 60, excludeLessonId = "") => {
    const params = new URLSearchParams({ date, durationMinutes: String(durationMinutes) })
    if (excludeLessonId) params.set("excludeLessonId", String(excludeLessonId))
    return request(`/schedule/free-slots?${params.toString()}`)
  },
  availability: (startAt, durationMinutes = 60, excludeLessonId = "") => {
    const params = new URLSearchParams({ startAt, durationMinutes: String(durationMinutes) })
    if (excludeLessonId) params.set("excludeLessonId", String(excludeLessonId))
    return request(`/schedule/availability?${params.toString()}`)
  },

  transfers: () => request("/transfers"),
  createTransfer: data => request("/transfers", { method: "POST", body: JSON.stringify(data) }),
  resolveTransfer: (id, data) => request(`/transfers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  homework: () => request("/homework"),
  createHomework: form => request("/homework", { method: "POST", body: form }),
  submitHomework: (id, form) => request(`/homework/${id}/submit`, { method: "POST", body: form }),
  reviewHomework: (id, data) => request(`/homework/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  materials: () => request("/materials"),
  createMaterial: form => request("/materials", { method: "POST", body: form }),

  notifications: () => request("/notifications"),
  readNotification: id => request(`/notifications/${id}/read`, { method: "PATCH" }),
  readAllNotifications: () => request("/notifications/read-all", { method: "PATCH" }),

  stats: () => request("/stats"),
  support: () => request("/support"),

  pushPublicKey: () => request("/push/public-key"),
  pushSubscribe: data => request("/push/subscribe", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  pushUnsubscribe: data => request("/push/unsubscribe", {
    method: "POST",
    body: JSON.stringify(data)
  })
}
