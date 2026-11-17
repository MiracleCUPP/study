export const TIMEZONE_OPTIONS = [
  ["Калининград", "Europe/Kaliningrad"],
  ["Москва / Санкт-Петербург", "Europe/Moscow"],
  ["Самара", "Europe/Samara"],
  ["Екатеринбург", "Asia/Yekaterinburg"],
  ["Омск", "Asia/Omsk"],
  ["Новосибирск / Красноярск", "Asia/Novosibirsk"],
  ["Иркутск", "Asia/Irkutsk"],
  ["Якутск", "Asia/Yakutsk"],
  ["Владивосток", "Asia/Vladivostok"],
  ["Магадан", "Asia/Magadan"],
  ["Камчатка", "Asia/Kamchatka"],
  ["Минск", "Europe/Minsk"],
  ["Вильнюс", "Europe/Vilnius"],
  ["Хельсинки", "Europe/Helsinki"],
  ["Другой — UTC", "UTC"]
]

export function formatInTimezone(value, timezone, options = {}) {
  if (!value) return "—"
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone || "Asia/Novosibirsk",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options
  }).format(new Date(value))
}

export function timeInTimezone(value, timezone) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone || "Asia/Novosibirsk",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value))
}

export function dateInTimezone(value, timezone) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone || "Asia/Novosibirsk",
    day: "2-digit",
    month: "2-digit"
  }).format(new Date(value))
}

export function weekdayInTimezone(value, timezone) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: timezone || "Asia/Novosibirsk",
    weekday: "short"
  }).format(new Date(value))
}

export function browserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Novosibirsk"
}
