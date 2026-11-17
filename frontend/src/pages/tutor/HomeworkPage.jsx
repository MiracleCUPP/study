import React,{useEffect,useState}from"react"
import{ExternalLink,Paperclip}from"lucide-react"
import{api}from"../../api/client"
import Modal from"../../components/Modal"
const emptyForm={studentId:"",title:"",description:"",deadline:"",externalUrl:""}
export default function HomeworkPage(){
 const[items,setItems]=useState([]),[students,setStudents]=useState([]),[open,setOpen]=useState(false),[form,setForm]=useState(emptyForm),[files,setFiles]=useState([]),[error,setError]=useState("")
 async function load(){try{const[h,s]=await Promise.all([api.homework(),api.students()]);setItems(h);setStudents(s);if(!form.studentId&&s[0])setForm(c=>({...c,studentId:String(s[0].id)}))}catch(e){setError(e.message)}}
 useEffect(()=>{load()},[])
 async function submit(e){e.preventDefault();setError("");const d=new FormData();d.append("studentId",form.studentId);d.append("title",form.title);d.append("description",form.description);d.append("externalUrl",form.externalUrl.trim());if(form.deadline)d.append("deadline",new Date(form.deadline).toISOString());files.forEach(f=>d.append("files",f));try{await api.createHomework(d);setOpen(false);setFiles([]);setForm({...emptyForm,studentId:students[0]?String(students[0].id):""});await load()}catch(err){setError(err.message)}}
 async function review(item,status){const tutorComment=prompt("Комментарий ученику (необязательно)")||"";await api.reviewHomework(item.id,{status,tutorComment});await load()}
 return <>
  <div className="page-heading split-heading"><div><h1>Домашние задания</h1><p>Задание можно выдать файлами, HTTPS-ссылкой на Google Drive/Яндекс Диск или использовать оба варианта.</p></div><button className="primary-button" onClick={()=>setOpen(true)}>+ Выдать ДЗ</button></div>
  {error&&<p className="form-error">{error}</p>}
  <div className="records-grid">{items.map(item=><article className="record-card" key={item.id}>
   <span className={`badge ${item.status}`}>{item.status}</span><h3>{item.title}</h3><p>{item.studentName}</p><p>{item.description}</p>{item.deadline&&<p>Срок: {new Date(item.deadline).toLocaleString("ru-RU")}</p>}
   {item.externalUrl&&<a className="resource-link" href={item.externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={16}/>Открыть ссылку к заданию</a>}
   {!!item.attachments.length&&<div className="file-list"><strong>Файлы задания</strong>{item.attachments.map(f=><a key={f.id} href={f.downloadUrl}><Paperclip size={14}/>{f.name}</a>)}</div>}
   {!!item.submissions.length&&<div className="submission-box"><strong>Сдано учеником</strong>{item.submissions.map(s=><div className="submission-entry" key={s.id}>{s.comment&&<p>{s.comment}</p>}{s.externalUrl&&<a className="resource-link" href={s.externalUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/>Ссылка ученика</a>}{s.attachments.map(f=><a key={f.id} href={f.downloadUrl}><Paperclip size={14}/>{f.name}</a>)}</div>)}</div>}
   {item.status==="submitted"&&<div className="card-actions"><button className="primary-button small-button" onClick={()=>review(item,"checked")}>Принять</button><button className="outline-button small-button" onClick={()=>review(item,"revision")}>На доработку</button></div>}
  </article>)}{!items.length&&<div className="empty-state">Домашних заданий пока нет.</div>}</div>
  {open&&<Modal title="Новое домашнее задание" onClose={()=>setOpen(false)}><form className="form" onSubmit={submit}>
   <label>Ученик<select value={form.studentId} onChange={e=>setForm({...form,studentId:e.target.value})} required><option value="">Выберите ученика</option>{students.map(s=><option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></label>
   <label>Название<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required/></label><label>Задание<textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required/></label><label>Срок сдачи<input type="datetime-local" value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})}/></label>
   <label>Ссылка на материалы или задание<input type="url" placeholder="https://drive.google.com/..." value={form.externalUrl} onChange={e=>setForm({...form,externalUrl:e.target.value})}/></label><label>Файлы<input type="file" multiple onChange={e=>setFiles([...e.target.files])}/></label><p className="hint">Можно использовать файлы, ссылку или оба варианта. Исполняемые файлы и скрипты не принимаются.</p>{error&&<p className="form-error">{error}</p>}<button className="primary-button">Отправить ученику</button>
  </form></Modal>}
 </>
}
