import {
  initialDemoRequests, initialHomework, initialLessons, initialMaterials, initialRecurring,
  initialTransfers, mockDateKey, mockStudents, mockUsers, studentNotifications, tutorNotifications
} from "./data"

const clone = value => structuredClone(value)
const state = {
  students: clone(mockStudents), lessons: clone(initialLessons), recurring: clone(initialRecurring),
  homework: clone(initialHomework), materials: clone(initialMaterials), transfers: clone(initialTransfers),
  demoRequests: clone(initialDemoRequests),
  notifications: { tutor: clone(tutorNotifications), student: clone(studentNotifications) }
}
let nextId = 2000

function currentRole(){ return localStorage.getItem("study_mock_role") || "" }
function setRole(role){ role ? localStorage.setItem("study_mock_role", role) : localStorage.removeItem("study_mock_role") }
function currentUser(){ const role=currentRole(); return role ? clone(mockUsers[role]) : null }
function normalizePath(path){ return path.split("?")[0] }
function formObject(body){
  if (!(body instanceof FormData)) return {}
  const out={}
  for(const [key,value] of body.entries()){ if(!(value instanceof File)) out[key]=value }
  return out
}
function localTutorIso(date,time){
  const [year,month,day]=date.split("-").map(Number)
  const [hour,minute]=time.split(":").map(Number)
  return new Date(Date.UTC(year,month-1,day,hour-7,minute,0)).toISOString()
}
function formatForZone(iso,timezone){
  return new Intl.DateTimeFormat("ru-RU",{timeZone:timezone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(iso))
}
function studentFor(id){ return state.students.find(x=>Number(x.id)===Number(id)) }
function lessonFor(id){ return state.lessons.find(x=>Number(x.id)===Number(id)) }
function visibleHomework(){ return currentRole()==="tutor" ? state.homework : state.homework.filter(x=>x.studentId===mockUsers.student.id) }
function visibleLessons(){ return currentRole()==="tutor" ? state.lessons : state.lessons.filter(x=>x.studentId===mockUsers.student.id).map(x=>({...x,priceRub:undefined})) }
function visibleMaterials(){
  if(currentRole()==="tutor") return state.materials
  const s=mockUsers.student
  return state.materials.filter(x=>x.audienceType==="all"||(x.audienceType==="class"&&x.grade===s.grade)||(x.audienceType==="student"&&x.studentId===s.id))
}
function visibleTransfers(){ return currentRole()==="tutor" ? state.transfers : state.transfers.filter(x=>x.studentId===mockUsers.student.id) }
function lessonPayload(data,existing=null){
  const student=studentFor(data.studentId||existing?.studentId)
  const startAt=data.localDate&&data.localTime?localTutorIso(data.localDate,data.localTime):existing?.startAt
  return {
    ...(existing||{}), id:existing?.id||nextId++, studentId:student?.id||existing?.studentId,
    studentName:student?`${student.firstName} ${student.lastName}`:existing?.studentName,
    subject:data.subject??existing?.subject??"Алгебра", topic:data.topic??existing?.topic??"",
    startAt, durationMinutes:Number(data.durationMinutes??existing?.durationMinutes??60),
    status:data.status??existing?.status??"planned",
    originalStartAt:existing&&startAt!==existing.startAt&&!existing.originalStartAt?existing.startAt:existing?.originalStartAt||null,
    recurringScheduleId:existing?.recurringScheduleId||null,
    transferNote:data.transferNote??existing?.transferNote??"",
    studentCity:student?.city||existing?.studentCity, studentTimezone:student?.timezone||existing?.studentTimezone,
    meetingLink:data.meetingLink??existing?.meetingLink??"", priceRub:student?.lessonPriceRub??existing?.priceRub??0,
    meetingAvailable:false
  }
}

export async function mockRequest(path,options={}){
  await new Promise(resolve=>setTimeout(resolve,60))
  const route=normalizePath(path), method=options.method||"GET"
  const json=typeof options.body==="string"?JSON.parse(options.body||"{}"):{}
  const form=formObject(options.body)

  if(route==="/auth/me"){ const u=currentUser(); if(!u) throw new Error("Нет активной mock-сессии"); return u }
  if(route==="/auth/login"&&method==="POST"){ const role=json.mockRole||(String(json.login||"").toLowerCase().includes("student")?"student":"tutor"); setRole(role); return clone(mockUsers[role]) }
  if(route==="/auth/logout"&&method==="POST"){ setRole(""); return {ok:true} }

  if(route==="/public/demo-request"&&method==="POST"){ state.demoRequests.unshift({id:nextId++,...json,status:"new",createdAt:new Date().toISOString()}); return {ok:true} }

  if(route==="/students"&&method==="GET") return clone(state.students)
  if(route==="/students"&&method==="POST"){
    const item={id:nextId++,role:"student",firstName:json.firstName,lastName:json.lastName,grade:Number(json.grade),login:json.login,city:json.city,timezone:json.timezone,lessonPriceRub:Number(json.lessonPriceRub||0)}
    state.students.push(item); return clone(item)
  }
  let match=route.match(/^\/students\/(\d+)$/)
  if(match&&method==="PATCH"){ const item=studentFor(match[1]); Object.assign(item,{...json,grade:json.grade!==undefined?Number(json.grade):item.grade,lessonPriceRub:json.lessonPriceRub!==undefined?Number(json.lessonPriceRub):item.lessonPriceRub}); return clone(item) }

  if(route==="/lessons"&&method==="GET") return clone(visibleLessons())
  if(route==="/lessons"&&method==="POST"){ const item=lessonPayload(json); state.lessons.push(item); return clone(item) }
  match=route.match(/^\/lessons\/(\d+)$/)
  if(match&&method==="PATCH"){ const item=lessonFor(match[1]); Object.assign(item,lessonPayload(json,item)); return clone(item) }

  if(route==="/schedule/recurring"&&method==="GET") return clone(state.recurring)
  if(route==="/schedule/recurring"&&method==="POST"){
    const s=studentFor(json.studentId)
    const item={id:nextId++,studentId:s.id,studentName:`${s.firstName} ${s.lastName}`,subject:json.subject,topic:json.topic||"",weekday:Number(json.weekday),localTime:json.localTime,timezone:"Asia/Novosibirsk",durationMinutes:Number(json.durationMinutes||60),meetingLink:json.meetingLink||"",startDate:json.startDate,endDate:json.endDate||null,isActive:true}
    state.recurring.push(item); return {id:item.id,generatedLessons:8}
  }
  match=route.match(/^\/schedule\/recurring\/(\d+)$/)
  if(match&&method==="PATCH"){ const item=state.recurring.find(x=>Number(x.id)===Number(match[1])); Object.assign(item,json,{weekday:json.weekday!==undefined?Number(json.weekday):item.weekday,durationMinutes:json.durationMinutes!==undefined?Number(json.durationMinutes):item.durationMinutes}); return clone(item) }

  if(route==="/schedule/time-preview"){
    const p=new URLSearchParams(path.split("?")[1]||""), s=studentFor(p.get("studentId")), iso=localTutorIso(p.get("date"),p.get("time"))
    return {startAt:iso,tutorTimezone:"Asia/Novosibirsk",tutorLabel:formatForZone(iso,"Asia/Novosibirsk"),studentTimezone:s?.timezone||"Europe/Moscow",studentCity:s?.city||"Москва",studentLabel:formatForZone(iso,s?.timezone||"Europe/Moscow")}
  }
  if(route==="/schedule/availability") return {available:true}
  if(route==="/schedule/free-slots"){
    const p=new URLSearchParams(path.split("?")[1]||""), date=p.get("date")||mockDateKey(1), viewer=currentRole()==="student"?mockUsers.student.timezone:mockUsers.tutor.timezone
    const slots=[15,16,18,19,21].map(hour=>{const iso=localTutorIso(date,`${String(hour).padStart(2,"0")}:00`);return{startAt:iso,viewerLabel:formatForZone(iso,viewer),tutorLabel:formatForZone(iso,"Asia/Novosibirsk")}})
    return {date,viewerTimezone:viewer,tutorTimezone:"Asia/Novosibirsk",slots}
  }

  if(route==="/transfers"&&method==="GET") return clone(visibleTransfers())
  if(route==="/transfers"&&method==="POST"){
    const l=lessonFor(json.lessonId),s=studentFor(l.studentId)
    const item={id:nextId++,lessonId:l.id,studentId:s.id,studentName:`${s.firstName} ${s.lastName}`,studentTimezone:s.timezone,reason:json.reason,originalStartAt:l.startAt,requestedStartAt:json.requestedStartAt,status:"new",tutorComment:""}
    state.transfers.unshift(item); return clone(item)
  }
  match=route.match(/^\/transfers\/(\d+)$/)
  if(match&&method==="PATCH"){
    const item=state.transfers.find(x=>Number(x.id)===Number(match[1])); Object.assign(item,json)
    if(json.status==="approved"){ const l=lessonFor(item.lessonId); if(l){l.originalStartAt=l.originalStartAt||l.startAt;l.startAt=item.requestedStartAt;l.status="transferred"} }
    return clone(item)
  }

  if(route==="/homework"&&method==="GET") return clone(visibleHomework())
  if(route==="/homework"&&method==="POST"){
    const studentId=Number(form.studentId),s=studentFor(studentId)
    const item={id:nextId++,studentId,studentName:`${s.firstName} ${s.lastName}`,title:form.title,description:form.description,deadline:form.deadline||null,status:"assigned",tutorComment:"",externalUrl:form.externalUrl||"",attachments:[],submissions:[]}
    state.homework.unshift(item); return clone(item)
  }
  match=route.match(/^\/homework\/(\d+)\/submit$/)
  if(match&&method==="POST"){ const item=state.homework.find(x=>Number(x.id)===Number(match[1])); item.status="submitted"; item.submissions.push({id:nextId++,comment:form.comment||"",externalUrl:form.externalUrl||"",attachments:[]}); return {ok:true} }
  match=route.match(/^\/homework\/(\d+)$/)
  if(match&&method==="PATCH"){ const item=state.homework.find(x=>Number(x.id)===Number(match[1])); Object.assign(item,json); return clone(item) }

  if(route==="/materials"&&method==="GET") return clone(visibleMaterials())
  if(route==="/materials"&&method==="POST"){
    const s=studentFor(form.studentId)
    const item={id:nextId++,title:form.title,description:form.description||"",audienceType:form.audienceType||"all",grade:form.audienceType==="class"?Number(form.grade):null,studentId:form.audienceType==="student"?Number(form.studentId):null,studentName:form.audienceType==="student"&&s?`${s.firstName} ${s.lastName}`:"",file:null,externalUrl:form.externalUrl||""}
    state.materials.unshift(item); return clone(item)
  }

  if(route==="/notifications"&&method==="GET") return clone(state.notifications[currentRole()||"tutor"])
  match=route.match(/^\/notifications\/(\d+)\/read$/)
  if(match&&method==="PATCH"){ const item=state.notifications[currentRole()||"tutor"].find(x=>Number(x.id)===Number(match[1])); if(item)item.isRead=true; return{ok:true} }
  if(route==="/notifications/read-all"&&method==="PATCH"){ state.notifications[currentRole()||"tutor"].forEach(x=>x.isRead=true); return{ok:true} }

  if(route==="/demo-requests"&&method==="GET") return clone(state.demoRequests)
  match=route.match(/^\/demo-requests\/(\d+)$/)
  if(match&&method==="PATCH"){ const item=state.demoRequests.find(x=>Number(x.id)===Number(match[1])); item.status=json.status; return{status:item.status} }

  if(route==="/stats") return {week:{lessons:18,revenueRub:25600},month:{lessons:74,revenueRub:104800},year:{lessons:612,revenueRub:862400},students:state.students.map(x=>({id:x.id,name:`${x.firstName} ${x.lastName}`,grade:x.grade,lessonPriceRub:x.lessonPriceRub}))}

  if(route==="/support") return {support:{title:"Поддержка сайта",description:"Срочные вопросы по работе сайта",telegram:"@myrrer",email:"gggterakova@gmail.com"},tutor:{title:"Репетитор",description:"Вопросы по обучению и занятиям, не связанные с работой сайта",telegram:"@midnightsun041",email:"alinatarabrina63@gmail.com"}}

  if(route==="/push/public-key") return {publicKey:"",configured:false}
  if(route==="/push/subscribe"||route==="/push/unsubscribe") return {ok:true}

  throw new Error(`Mock API: маршрут ${method} ${route} не реализован`)
}
