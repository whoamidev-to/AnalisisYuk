const $ = s => document.querySelector(s);
const KEY = "yukAnalisis.v1";

function defaults() {
  return { name:"Aspianto", weights:{attendance:30,program:30,target:40}, activities:[] };
}
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || defaults(); }
  catch { return defaults(); }
}
let state = load();
let filter = "all";

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
  render();
}
function esc(value="") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function dateText(date) {
  if (!date) return "Tanggal belum diatur";
  return new Date(date+"T12:00:00").toLocaleDateString("id-ID", {
    weekday:"short",day:"numeric",month:"short",year:"numeric"
  });
}
function percent(a,b) { return b ? Math.min(100,Math.round(a/b*100)) : 0; }

function stats(list=state.activities) {
  let members=0,present=0,target=0,actual=0;
  list.forEach(a=>{
    members+=a.members.length;
    present+=a.members.filter(m=>m.present).length;
    target+=Number(a.target)||0;
    actual+=Number(a.actual)||0;
  });
  const attendance=percent(present,members);
  const programs=percent(list.filter(a=>a.done).length,list.length);
  const targetPct=percent(actual,target);
  const w=state.weights;
  const available=(members?w.attendance:0)+(list.length?w.program:0)+(target?w.target:0);
  const overall=available?Math.round(
    ((members?attendance*w.attendance:0)+
    (list.length?programs*w.program:0)+
    (target?targetPct*w.target:0))/available
  ):0;
  return {attendance,programs,targetPct,overall,present,members,done:list.filter(a=>a.done).length,count:list.length};
}

function render() {
  const s=stats();
  $("#greeting").textContent=`Halo, ${state.name}! 👋`;
  $("#profileBtn").textContent=(state.name||"A")[0].toUpperCase();
  $("#settingsAvatar").textContent=(state.name||"A")[0].toUpperCase();
  $("#settingsName").textContent=state.name;
  $("#attendance").textContent=s.attendance+"%";
  $("#programs").textContent=`${s.done} dari ${s.count}`;
  $("#target").textContent=s.targetPct+"%";
  $("#overall").textContent=s.overall+"%";
  $("#grade").textContent=s.overall>=85?"Sangat Baik":s.overall>=65?"Terus berkembang":s.count?"Perlu ditingkatkan":"Mulai catat progres";
  $("#ring").style.background=`conic-gradient(#d9c8ff ${s.overall}%,#ffffff22 0)`;
  $("#recent").innerHTML=state.activities.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,2).map(a=>`
    <div class="recent"><div class="item-icon">👥</div><div class="item-main"><b>${esc(a.name)}</b><small>${dateText(a.date)}</small></div><span class="status ${a.done?"":"open"}">${a.done?"Selesai":"Berjalan"}</span></div>
  `).join("") || '<p class="muted">Belum ada kegiatan. Tambahkan kegiatan pertamamu.</p>';
  renderActivities();
  renderReport();
  drawChart($("#chart"),state.activities);
  updateWeights();
}

function renderActivities() {
  const query=$("#search").value.toLowerCase();
  const list=state.activities.filter(a=>
    (filter==="all" || (filter==="done"?a.done:!a.done)) &&
    a.name.toLowerCase().includes(query)
  ).sort((a,b)=>b.date.localeCompare(a.date));
  $("#activityList").innerHTML=list.map(a=>`
    <article class="activity">
      <div class="item-icon">${a.done?"✓":"▣"}</div>
      <div class="item-main"><b>${esc(a.name)}</b><small>${dateText(a.date)} · ${a.members.length} anggota</small></div>
      <span class="status ${a.done?"":"open"}">${a.done?"Selesai":"Berjalan"}</span>
      <button data-detail="${a.id}" aria-label="Detail">›</button>
    </article>
  `).join("") || '<p class="muted">Belum ada kegiatan yang cocok.</p>';
}

function drawChart(svg,list) {
  const vals=Array.from({length:7},(_,i)=>{
    const d=new Date();d.setDate(d.getDate()-(6-i));
    const key=d.toISOString().slice(0,10);
    return stats(list.filter(a=>a.date<=key)).overall;
  });
  const pts=vals.map((v,i)=>`${18+i*50},${140-v*1.2}`).join(" ");
  svg.innerHTML=`
    <path d="M18 150 ${pts} L318 150 Z" fill="#8b5cf6" opacity=".12"/>
    <polyline points="${pts}" fill="none" stroke="#6d28d9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    ${vals.map((v,i)=>`<circle cx="${18+i*50}" cy="${140-v*1.2}" r="3.5" fill="#6d28d9" stroke="white" stroke-width="1.5"/>`).join("")}
    <g fill="#9990b5" font-size="9">${[0,25,50,75,100].map(v=>`<text x="0" y="${143-v*1.2}">${v}%</text>`).join("")}</g>`;
}

function renderReport() {
  const from=$("#fromDate").value,to=$("#toDate").value;
  const list=state.activities.filter(a=>(!from||a.date>=from)&&(!to||a.date<=to));
  const s=stats(list);
  $("#reportRange").textContent=`${from||"Semua"} – ${to||"tanggal"}`;
  $("#rAttendance").textContent=s.attendance+"%";
  $("#rPrograms").textContent=`${s.done}/${s.count}`;
  $("#rTarget").textContent=s.targetPct+"%";
  $("#rOverall").textContent=s.overall+"%";
  drawChart($("#reportChart"),list);
}

function updateWeights() {
  [["attendance","Attendance"],["program","Program"],["target","Target"]].forEach(([key,label])=>{
    $("#w"+label).value=state.weights[key];
    $("#"+key+"Label").textContent=state.weights[key]+"%";
  });
  const total=Object.values(state.weights).reduce((a,b)=>a+b,0);
  $("#weightTotal").textContent=`Total: ${total}%`;
  $("#weightTotal").style.color=total===100?"#187b48":"#c23b42";
}

function showPage(id) {
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));
  document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.page===id));
  window.scrollTo(0,0);
}
document.querySelectorAll(".nav,[data-page]").forEach(b=>b.onclick=()=>showPage(b.dataset.page));

function openForm(activity=null) {
  const f=$("#activityForm");f.reset();
  f.elements.date.value=activity?.date||new Date().toISOString().slice(0,10);
  f.elements.name.value=activity?.name||"";
  f.elements.time.value=activity?.time||"";
  f.elements.target.value=activity?.target||0;
  f.elements.actual.value=activity?.actual||0;
  f.elements.roster.value=(activity?.members||[]).map(m=>m.name).join(", ");
  f.elements.notes.value=activity?.notes||"";
  f.dataset.edit=activity?.id||"";
  $("#formTitle").textContent=activity?"Edit Kegiatan":"Tambah Kegiatan";
  $("#activityModal").hidden=false;
}

$("#addBtn").onclick=()=>openForm();
$("#closeForm").onclick=()=>$("#activityModal").hidden=true;
$("#activityForm").onsubmit=e=>{
  e.preventDefault();
  const f=e.target,id=f.dataset.edit;
  const old=state.activities.find(a=>a.id===id);
  const names=[...new Set(f.elements.roster.value.split(",").map(x=>x.trim()).filter(Boolean))];
  const members=names.map(name=>old?.members.find(m=>m.name===name)||{name,present:false});
  const activity={
    id:id||crypto.randomUUID(),name:f.elements.name.value.trim(),
    date:f.elements.date.value,time:f.elements.time.value,
    target:+f.elements.target.value,actual:+f.elements.actual.value,
    members,notes:f.elements.notes.value,done:old?.done||false
  };
  if(old)state.activities=state.activities.map(a=>a.id===id?activity:a);
  else state.activities.push(activity);
  $("#activityModal").hidden=true;save();toast("Kegiatan tersimpan");
};

function openDetail(id) {
  const a=state.activities.find(x=>x.id===id);if(!a)return;
  $("#detailTitle").textContent=a.name;
  $("#detailBody").innerHTML=`
    <div class="detail-summary"><b>${dateText(a.date)} ${a.time?"· "+esc(a.time):""}</b>
      <p>${a.members.filter(m=>m.present).length} / ${a.members.length} anggota hadir</p>
      <p>Target: ${a.target} · Realisasi: ${a.actual}</p><p>${esc(a.notes)}</p>
    </div>
    <h3>Daftar Kehadiran Anggota</h3>
    ${a.members.map((m,i)=>`<div class="member-row"><label><input type="checkbox" data-member="${i}" ${m.present?"checked":""}> ${esc(m.name)}</label><small>${m.present?"Hadir":"Tidak hadir"}</small></div>`).join("")||'<p class="muted">Belum ada daftar anggota.</p>'}
    <div class="form-row" style="margin-top:14px">
      <button class="primary" id="toggleDone">${a.done?"Belum selesai":"Tandai selesai"}</button>
      <button class="primary" id="editActivity" style="background:#eee7ff;color:#5123b9">Edit</button>
    </div>
    <button class="link" id="deleteActivity" style="color:#d52d40;margin-top:12px">Hapus kegiatan</button>`;
  $("#detailModal").hidden=false;
  document.querySelectorAll("[data-member]").forEach(el=>el.onchange=()=>{
    a.members[+el.dataset.member].present=el.checked;save();openDetail(id);
  });
  $("#toggleDone").onclick=()=>{a.done=!a.done;save();openDetail(id)};
  $("#editActivity").onclick=()=>{$("#detailModal").hidden=true;openForm(a)};
  $("#deleteActivity").onclick=()=>{
    if(confirm("Hapus kegiatan ini?")){
      state.activities=state.activities.filter(x=>x.id!==id);save();$("#detailModal").hidden=true;
    }
  };
}
$("#closeDetail").onclick=()=>$("#detailModal").hidden=true;
$("#activityList").onclick=e=>{const b=e.target.closest("[data-detail]");if(b)openDetail(b.dataset.detail)};
$("#search").oninput=renderActivities;
document.querySelectorAll("[data-filter]").forEach(b=>b.onclick=()=>{
  filter=b.dataset.filter;document.querySelectorAll("[data-filter]").forEach(x=>x.classList.toggle("selected",x===b));renderActivities();
});
["fromDate","toDate"].forEach(id=>$("#"+id).onchange=renderReport);

function toast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function changeName(){
  const name=prompt("Nama tampilan:",state.name);
  if(name&&name.trim()){state.name=name.trim().slice(0,50);save();}
}
$("#profileBtn").onclick=changeName;$("#renameBtn").onclick=changeName;

$("#saveWeights").onclick=()=>{
  const vals=[+$("#wAttendance").value,+$("#wProgram").value,+$("#wTarget").value];
  if(vals.reduce((a,b)=>a+b,0)!==100){toast("Total bobot harus 100%");return;}
  state.weights={attendance:vals[0],program:vals[1],target:vals[2]};save();toast("Bobot disimpan");
};

$("#backup").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="cadangan-yuk-analisis.json";a.click();URL.revokeObjectURL(url);
};
$("#clearData").onclick=()=>{
  if(confirm("Hapus semua data? Tindakan ini tidak bisa dibatalkan.")){state=defaults();save();toast("Data dihapus");}
};

$("#saveImage").onclick=()=>{
  const canvas=document.createElement("canvas");canvas.width=900;canvas.height=1000;
  const c=canvas.getContext("2d");c.fillStyle="#fff";c.fillRect(0,0,900,1000);
  c.fillStyle="#24164d";c.font="bold 38px sans-serif";c.fillText("Yuk Analisis — Laporan Progres",45,65);
  c.font="22px sans-serif";c.fillText($("#reportRange").textContent,45,110);
  c.font="bold 28px sans-serif";
  c.fillText("Kehadiran: "+$("#rAttendance").textContent,45,190);
  c.fillText("Program: "+$("#rPrograms").textContent,45,250);
  c.fillText("Target: "+$("#rTarget").textContent,45,310);
  c.fillText("Progres keseluruhan: "+$("#rOverall").textContent,45,370);
  const svg=new XMLSerializer().serializeToString($("#reportChart"));
  const img=new Image(),url=URL.createObjectURL(new Blob([svg],{type:"image/svg+xml"}));
  img.onload=()=>{
    c.drawImage(img,45,420,810,360);c.font="18px sans-serif";c.fillStyle="#777";
    c.fillText("Dibuat dengan Yuk Analisis",45,950);
    canvas.toBlob(blob=>{
      const link=document.createElement("a"),imageUrl=URL.createObjectURL(blob);
      link.href=imageUrl;link.download="laporan-yuk-analisis.png";link.click();
      URL.revokeObjectURL(imageUrl);URL.revokeObjectURL(url);toast("Gambar laporan diunduh");
    });
  };
  img.src=url;
};

render();
if("serviceWorker" in navigator && location.protocol!=="file:"){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}