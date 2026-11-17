const DAY = 24 * 60 * 60 * 1000

function mondayStart() {
  const now = new Date()
  const day = now.getUTCDay()
  const shift = day === 0 ? -6 : 1 - day
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  d.setUTCDate(d.getUTCDate() + shift)
  return d
}

function isoAt(dayOffset, localHour, minute = 0) {
  const d = new Date(mondayStart().getTime() + dayOffset * DAY)
  d.setUTCHours(localHour - 7, minute, 0, 0)
  return d.toISOString()
}

function dateKey(dayOffset = 0) {
  const d = new Date(mondayStart().getTime() + dayOffset * DAY)
  return d.toISOString().slice(0, 10)
}

export const mockUsers = {
  tutor: {
    id: 100,
    login: "preview-tutor",
    role: "tutor",
    firstName: "Алина",
    lastName: "Тарабрина",
    grade: null,
    city: "Новосибирск",
    timezone: "Asia/Novosibirsk",
    csrfToken: "mock-csrf"
  },
  student: {
    id: 1,
    login: "preview-student",
    role: "student",
    firstName: "Соня",
    lastName: "Иванова",
    grade: 8,
    city: "Москва",
    timezone: "Europe/Moscow",
    csrfToken: "mock-csrf"
  }
}

export const mockStudents = [
  { id: 1, login: "sonya8", role: "student", firstName: "Соня", lastName: "Иванова", grade: 8, city: "Москва", timezone: "Europe/Moscow", lessonPriceRub: 1400 },
  { id: 2, login: "anya9", role: "student", firstName: "Аня", lastName: "Соколова", grade: 9, city: "Новосибирск", timezone: "Asia/Novosibirsk", lessonPriceRub: 1200 },
  { id: 3, login: "stepan9", role: "student", firstName: "Степан", lastName: "Морозов", grade: 9, city: "Омск", timezone: "Asia/Omsk", lessonPriceRub: 1700 },
  { id: 4, login: "vika8", role: "student", firstName: "Вика", lastName: "Орлова", grade: 8, city: "Екатеринбург", timezone: "Asia/Yekaterinburg", lessonPriceRub: 1800 },
  { id: 5, login: "veronika8", role: "student", firstName: "Вероника", lastName: "Ким", grade: 8, city: "Иркутск", timezone: "Asia/Irkutsk", lessonPriceRub: 1400 }
]

const studentsById = Object.fromEntries(mockStudents.map(item => [item.id, item]))

function lesson(id, studentId, day, hour, subject, topic, status = "planned", extra = {}) {
  const student = studentsById[studentId]
  return {
    id,
    studentId,
    studentName: `${student.firstName} ${student.lastName}`,
    subject,
    topic,
    startAt: isoAt(day, hour),
    durationMinutes: 60,
    status,
    originalStartAt: extra.originalStartAt || null,
    recurringScheduleId: extra.recurringScheduleId || null,
    transferNote: extra.transferNote || "",
    studentCity: student.city,
    studentTimezone: student.timezone,
    meetingLink: extra.meetingLink || "https://telemost.yandex.ru/",
    priceRub: student.lessonPriceRub,
    meetingAvailable: false
  }
}

export const initialLessons = [
  lesson(101, 1, 0, 17, "Алгебра", "Квадратные уравнения", "planned", { recurringScheduleId: 1 }),
  lesson(102, 2, 0, 18, "Геометрия", "Трапеция", "completed", { recurringScheduleId: 2 }),
  lesson(103, 3, 1, 20, "Алгебра", "ОГЭ №6", "planned", { recurringScheduleId: 3 }),
  lesson(104, 4, 2, 16, "Геометрия", "Подобие треугольников", "transferred", {
    recurringScheduleId: 4,
    originalStartAt: isoAt(1, 16),
    transferNote: "Перенос по просьбе ученика"
  }),
  lesson(105, 5, 3, 19, "Алгебра", "Рациональные выражения", "planned", { recurringScheduleId: 5 }),
  lesson(106, 1, 3, 17, "Геометрия", "Параллелограмм", "planned", { recurringScheduleId: 6 }),
  lesson(107, 2, 4, 18, "Алгебра", "Функции", "cancelled"),
  lesson(108, 3, 5, 12, "Геометрия", "Окружность", "planned"),
  lesson(109, 1, 7, 17, "Алгебра", "Квадратные неравенства", "planned", { recurringScheduleId: 1 }),
  lesson(110, 2, 7, 18, "Геометрия", "Трапеция", "planned", { recurringScheduleId: 2 }),
  lesson(111, 3, 8, 20, "Алгебра", "ОГЭ №7", "planned", { recurringScheduleId: 3 }),
  lesson(112, 4, 9, 16, "Геометрия", "Векторы", "planned", { recurringScheduleId: 4 }),
  lesson(113, 5, 10, 19, "Алгебра", "Корни", "planned", { recurringScheduleId: 5 }),
  lesson(114, 1, 10, 17, "Геометрия", "Ромб", "planned", { recurringScheduleId: 6 })
]

export const initialRecurring = [
  { id: 1, studentId: 1, studentName: "Соня Иванова", subject: "Алгебра", topic: "", weekday: 0, localTime: "17:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "https://telemost.yandex.ru/", startDate: dateKey(0), endDate: null, isActive: true },
  { id: 2, studentId: 2, studentName: "Аня Соколова", subject: "Геометрия", topic: "", weekday: 0, localTime: "18:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "https://telemost.yandex.ru/", startDate: dateKey(0), endDate: null, isActive: true },
  { id: 3, studentId: 3, studentName: "Степан Морозов", subject: "Алгебра", topic: "ОГЭ", weekday: 1, localTime: "20:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "", startDate: dateKey(0), endDate: null, isActive: true },
  { id: 4, studentId: 4, studentName: "Вика Орлова", subject: "Геометрия", topic: "", weekday: 2, localTime: "16:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "", startDate: dateKey(0), endDate: null, isActive: true },
  { id: 5, studentId: 5, studentName: "Вероника Ким", subject: "Алгебра", topic: "", weekday: 3, localTime: "19:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "", startDate: dateKey(0), endDate: null, isActive: true },
  { id: 6, studentId: 1, studentName: "Соня Иванова", subject: "Геометрия", topic: "", weekday: 3, localTime: "17:00", timezone: "Asia/Novosibirsk", durationMinutes: 60, meetingLink: "", startDate: dateKey(0), endDate: null, isActive: true }
]

export const initialHomework = [
  {
    id: 201, studentId: 1, studentName: "Соня Иванова",
    title: "Квадратные уравнения",
    description: "Решить задания 1–8 и прикрепить решение.",
    deadline: isoAt(3, 21), status: "assigned", tutorComment: "",
    externalUrl: "https://drive.google.com/",
    attachments: [{ id: 9001, name: "Квадратные_уравнения.pdf", downloadUrl: "#" }],
    submissions: []
  },
  {
    id: 202, studentId: 2, studentName: "Аня Соколова",
    title: "Трапеция", description: "Задачи на среднюю линию и площадь.",
    deadline: isoAt(4, 20), status: "submitted", tutorComment: "", externalUrl: "",
    attachments: [],
    submissions: [{ id: 501, comment: "Решение прикрепила.", externalUrl: "", attachments: [{ id: 9002, name: "решение_аня.pdf", downloadUrl: "#" }] }]
  },
  {
    id: 203, studentId: 1, studentName: "Соня Иванова",
    title: "Формулы сокращённого умножения",
    description: "Повторить формулы и решить карточку.",
    deadline: isoAt(10, 21), status: "checked", tutorComment: "Хорошо. Ошибок нет.",
    externalUrl: "", attachments: [{ id: 9003, name: "карточка.docx", downloadUrl: "#" }], submissions: []
  }
]

export const initialMaterials = [
  { id: 301, title: "Формулы сокращённого умножения", description: "Краткая памятка по основным формулам.", audienceType: "class", grade: 8, studentId: null, studentName: "", file: { id: 9101, name: "формулы.pdf", downloadUrl: "#" }, externalUrl: "" },
  { id: 302, title: "ОГЭ — основные формулы", description: "Общий материал для подготовки.", audienceType: "all", grade: null, studentId: null, studentName: "", file: null, externalUrl: "https://drive.google.com/" },
  { id: 303, title: "Разбор ошибок", description: "Личный материал после занятия.", audienceType: "student", grade: null, studentId: 1, studentName: "Соня Иванова", file: { id: 9102, name: "разбор.pdf", downloadUrl: "#" }, externalUrl: "" }
]

export const initialTransfers = [
  { id: 401, lessonId: 104, studentId: 4, studentName: "Вика Орлова", studentTimezone: "Asia/Yekaterinburg", reason: "Школьное мероприятие", originalStartAt: isoAt(1, 16), requestedStartAt: isoAt(2, 16), status: "new", tutorComment: "" },
  { id: 402, lessonId: 109, studentId: 1, studentName: "Соня Иванова", studentTimezone: "Europe/Moscow", reason: "Семейные дела", originalStartAt: isoAt(7, 17), requestedStartAt: isoAt(8, 19), status: "approved", tutorComment: "Хорошо, перенос подтверждён." }
]

export const initialDemoRequests = [
  { id: 601, firstName: "Мария", lastName: "Петрова", grade: 8, contact: "@maria_parent", status: "new", createdAt: new Date().toISOString() },
  { id: 602, firstName: "Илья", lastName: "Смирнов", grade: 9, contact: "parent@example.ru", status: "contacted", createdAt: new Date(Date.now() - DAY).toISOString() }
]

export const tutorNotifications = [
  { id: 701, kind: "transfer_requested", title: "Новый запрос на перенос", body: "Вика просит перенести занятие.", link: "/tutor/transfers", payload: {}, isRead: false, createdAt: new Date().toISOString() },
  { id: 702, kind: "homework_submitted", title: "Домашняя работа сдана", body: "Аня отправила решение по теме «Трапеция».", link: "/tutor/homework", payload: {}, isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 703, kind: "demo_request", title: "Новая демо-заявка", body: "Мария Петрова, 8 класс.", link: "/tutor/requests", payload: {}, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() }
]

export const studentNotifications = [
  { id: 711, kind: "schedule_changed", title: "Расписание обновлено", body: "Следующее занятие отображается в вашем местном времени.", link: "/student/schedule", payload: {}, isRead: false, createdAt: new Date().toISOString() },
  { id: 712, kind: "homework", title: "Новое домашнее задание", body: "Квадратные уравнения — срок до конца недели.", link: "/student/homework", payload: {}, isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 713, kind: "promo", title: "Приведи друга — скидка 50%", body: "Расскажите о STUDY другу.", link: "", payload: {}, isRead: true, createdAt: new Date(Date.now() - 7200000).toISOString() }
]

export function mockDateKey(offset = 0) {
  return dateKey(offset)
}
