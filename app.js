
const app=document.querySelector("#app");
const state={
  user:JSON.parse(localStorage.getItem("mm3_user")||"null"),
  children:JSON.parse(localStorage.getItem("mm3_children")||"[]"),
  activeChildId:localStorage.getItem("mm3_active_child")||null,
  chats:JSON.parse(localStorage.getItem("mm3_chats")||"[]"),
  logs:JSON.parse(localStorage.getItem("mm3_logs")||"[]"),
  reminders:JSON.parse(localStorage.getItem("mm3_reminders")||"[]"),
  premium:localStorage.getItem("mm3_premium")==="true"
};
function save(){
  localStorage.setItem("mm3_user",JSON.stringify(state.user));
  localStorage.setItem("mm3_children",JSON.stringify(state.children));
  localStorage.setItem("mm3_active_child",state.activeChildId||"");
  localStorage.setItem("mm3_chats",JSON.stringify(state.chats));
  localStorage.setItem("mm3_logs",JSON.stringify(state.logs));
  localStorage.setItem("mm3_reminders",JSON.stringify(state.reminders));
  localStorage.setItem("mm3_premium",String(state.premium));
}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function esc(s=""){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function activeChild(){return state.children.find(c=>c.id===state.activeChildId)||state.children[0]||null}
function renderLogin(){
  app.innerHTML=`<div class="login-wrap"><form class="card login-card" id="login">
  <span class="pill">MumMate AI v3</span><h1>Parenting support in one place</h1>
  <p class="muted">Ask questions, track routines and keep simple reminders.</p>
  <label>Name<input id="n" required placeholder="Your name"></label>
  <label>Email<input id="e" type="email" required placeholder="you@example.com"></label>
  <button class="primary" style="width:100%">Continue</button>
  <p class="small">Prototype account only. Data stays in this browser unless you later connect a real database.</p>
  </form></div>`;
  document.querySelector("#login").onsubmit=e=>{
    e.preventDefault();state.user={name:n.value.trim(),email:e.target.querySelector("#e").value.trim()};save();renderApp();
  }
}
function renderApp(){
  if(!state.user)return renderLogin();
  app.innerHTML=`<main class="shell">
    <section id="home" class="page active"></section>
    <section id="children" class="page"></section>
    <section id="tracker" class="page"></section>
    <section id="history" class="page"></section>
    <section id="plus" class="page"></section>
  </main>
  <nav class="bottom-nav">
    <button class="nav-btn active" data-page="home"><span>💬</span>Ask</button>
    <button class="nav-btn" data-page="children"><span>👶</span>Children</button>
    <button class="nav-btn" data-page="tracker"><span>📊</span>Tracker</button>
    <button class="nav-btn" data-page="history"><span>🕘</span>History</button>
    <button class="nav-btn" data-page="plus"><span>✨</span>Plus</button>
  </nav>`;
  renderHome();renderChildren();renderTracker();renderHistory();renderPlus();
  document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(n=>n.classList.remove("active"));
    document.querySelector("#"+b.dataset.page).classList.add("active");b.classList.add("active");
  })
}
function renderHome(){
  const c=activeChild();
  const today=new Date().toDateString();
  const todayLogs=state.logs.filter(l=>new Date(l.at).toDateString()===today && (!c||l.childId===c.id));
  const feeds=todayLogs.filter(l=>l.type==="feed").length;
  const nappies=todayLogs.filter(l=>l.type==="nappy").length;
  const sleeps=todayLogs.filter(l=>l.type==="sleep").reduce((a,b)=>a+(Number(b.amount)||0),0);
  document.querySelector("#home").innerHTML=`
    <header class="topbar"><div class="brand"><h1>MumMate AI</h1><p>${state.premium?'<span class="badge">Plus active</span>':'UK parenting assistant'}</p></div><button class="avatar" id="menu">${esc((state.user.name||"U")[0])}</button></header>
    <div class="card hero"><span class="pill">${c?esc(c.name):"Add a child"}</span><h2>${c?`How can I help with ${esc(c.name)} today?`:"Create a child profile to personalise answers"}</h2><p>Parenting questions, daily tracking and simple reminders in one place.</p></div>
    <div class="section-title"><h3>Today</h3><button class="link-btn" id="goTracker">Open tracker</button></div>
    <div class="dashboard-grid">
      <div class="card stat"><small>Feeds</small><strong>${feeds}</strong></div>
      <div class="card stat"><small>Nappies</small><strong>${nappies}</strong></div>
      <div class="card stat"><small>Sleep logged</small><strong>${sleeps}h</strong></div>
    </div>
    <div class="section-title"><h3>Quick questions</h3></div>
    <div class="quick-grid">
      <button class="quick" data-q="My child keeps waking during the night. What can I try?"><span>🌙</span><strong>Sleep</strong><small>Night waking</small></button>
      <button class="quick" data-q="What foods are suitable for my child's age?"><span>🥣</span><strong>Feeding</strong><small>Weaning & meals</small></button>
      <button class="quick" data-q="What milestones should I expect at this age?"><span>🧸</span><strong>Development</strong><small>Milestones</small></button>
      <button class="quick" data-q="My child has a temperature. What should I look out for?"><span>🩺</span><strong>Health</strong><small>General guidance</small></button>
    </div>
    <div class="section-title"><h3>Ask MumMate</h3></div>
    <div class="card chat-card"><div class="messages" id="messages"><div class="msg assistant"><div class="bubble">Tell me what is happening. I’ll keep the answer clear, age-aware and safety-focused.</div></div></div>
    <form class="composer" id="chat"><textarea id="q" rows="2" placeholder="Ask a question…" required></textarea><button class="primary">Ask</button></form></div>
    <div class="safety"><strong>Important:</strong> MumMate AI gives general information only. It does not replace a GP, pharmacist, health visitor, NHS 111 or emergency services. Call 999 for a life-threatening emergency.</div>`;
  document.querySelector("#menu").onclick=()=>{if(confirm("Sign out?")){state.user=null;save();renderLogin()}};
  document.querySelector("#goTracker").onclick=()=>document.querySelector('[data-page="tracker"]').click();
  document.querySelectorAll(".quick").forEach(b=>b.onclick=()=>{document.querySelector("#q").value=b.dataset.q;document.querySelector("#q").focus()});
  document.querySelector("#chat").onsubmit=handleChat;
}
async function handleChat(e){
  e.preventDefault();const q=document.querySelector("#q").value.trim();if(!q)return;
  addBubble(q,"user");document.querySelector("#q").value="";const wait=addBubble("Thinking…","assistant");
  try{
    const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:q,child:activeChild()})});
    const d=await r.json();wait.remove();addBubble(d.answer||"No answer returned.","assistant");
    state.chats.unshift({id:uid(),question:q,answer:d.answer||"",childName:activeChild()?.name||"No child",createdAt:new Date().toISOString()});
    save();renderHistory();
  }catch{wait.remove();addBubble("I couldn't reach the app server.","assistant")}
}
function addBubble(t,w){const r=document.createElement("div");r.className=`msg ${w}`;const b=document.createElement("div");b.className="bubble";b.textContent=t;r.appendChild(b);messages.appendChild(r);messages.scrollTop=messages.scrollHeight;return r}

function renderChildren(){
  document.querySelector("#children").innerHTML=`<header class="topbar"><div class="brand"><h1>Children</h1><p>Profiles used to personalise answers and logs</p></div></header>
  <div class="card form-card"><form id="childForm"><input type="hidden" id="cid">
  <label>Name<input id="cname" required placeholder="e.g. Adam"></label><div class="two"><label>Age<input id="cage" type="number" min="0" max="216" required></label><label>Unit<select id="cunit"><option>months</option><option>years</option></select></label></div>
  <label>Notes<textarea id="cnotes" rows="3" placeholder="Optional, e.g. allergies"></textarea></label><button class="primary">Save child</button></form></div>
  <div class="section-title"><h3>Your children</h3></div><div class="card" id="childList"></div>`;
  childForm.onsubmit=e=>{
    e.preventDefault();const id=cid.value||uid();const obj={id,name:cname.value.trim(),age:cage.value,unit:cunit.value,notes:cnotes.value.trim()};
    const i=state.children.findIndex(x=>x.id===id);if(i>=0)state.children[i]=obj;else state.children.push(obj);
    if(!state.activeChildId)state.activeChildId=id;save();renderChildren();renderHome();renderTracker();
  };renderChildList();
}
function renderChildList(){
  const el=document.querySelector("#childList");
  if(!state.children.length){el.innerHTML=`<div class="item muted">No child profiles yet.</div>`;return}
  el.innerHTML=state.children.map(c=>`<div class="item"><strong>${esc(c.name)}</strong><small>${esc(c.age)} ${esc(c.unit)}${c.notes?` • ${esc(c.notes)}`:""}</small><div class="toolbar" style="margin-top:9px">
  <button class="secondary set" data-id="${c.id}">${c.id===activeChild()?.id?"Selected":"Select"}</button><button class="secondary edit" data-id="${c.id}">Edit</button><button class="danger del" data-id="${c.id}">Delete</button></div></div>`).join("");
  el.querySelectorAll(".set").forEach(b=>b.onclick=()=>{state.activeChildId=b.dataset.id;save();renderChildList();renderHome();renderTracker()});
  el.querySelectorAll(".edit").forEach(b=>b.onclick=()=>{const c=state.children.find(x=>x.id===b.dataset.id);cid.value=c.id;cname.value=c.name;cage.value=c.age;cunit.value=c.unit;cnotes.value=c.notes||"";scrollTo({top:0,behavior:"smooth"})});
  el.querySelectorAll(".del").forEach(b=>b.onclick=()=>{if(!confirm("Delete this child?"))return;state.children=state.children.filter(c=>c.id!==b.dataset.id);if(state.activeChildId===b.dataset.id)state.activeChildId=state.children[0]?.id||null;save();renderChildren();renderHome();renderTracker()});
}
function renderTracker(){
  const c=activeChild();
  const logs=state.logs.filter(l=>!c||l.childId===c.id).slice(0,30);
  const rem=state.reminders.filter(r=>!c||r.childId===c.id).slice(0,20);
  document.querySelector("#tracker").innerHTML=`<header class="topbar"><div class="brand"><h1>Tracker</h1><p>${c?`Logging for ${esc(c.name)}`:"Select a child first"}</p></div></header>
  <div class="track-grid">
   <div class="card track-card"><h3>🍼 Feed</h3><p>Log a feed quickly.</p><button class="primary log" data-type="feed">Log feed</button></div>
   <div class="card track-card"><h3>🧷 Nappy</h3><p>Wet or dirty nappy count.</p><button class="primary log" data-type="nappy">Log nappy</button></div>
   <div class="card track-card"><h3>😴 Sleep</h3><p>Log sleep duration in hours.</p><button class="primary log" data-type="sleep">Log sleep</button></div>
   <div class="card track-card"><h3>💉 Reminder</h3><p>Add a vaccination or appointment reminder.</p><button class="primary" id="addReminder">Add reminder</button></div>
  </div>
  <div class="section-title"><h3>Upcoming reminders</h3></div><div class="card" id="reminders"></div>
  <div class="section-title"><h3>Recent logs</h3></div><div class="card" id="logs"></div>`;
  document.querySelectorAll(".log").forEach(b=>b.onclick=()=>{
    if(!c)return alert("Please add or select a child first.");
    let amount=1;if(b.dataset.type==="sleep"){const v=prompt("How many hours of sleep?","1");if(v===null)return;amount=Number(v)||0}
    state.logs.unshift({id:uid(),childId:c.id,type:b.dataset.type,amount,at:new Date().toISOString()});save();renderTracker();renderHome();
  });
  addReminder.onclick=()=>{
    if(!c)return alert("Please add or select a child first.");
    const title=prompt("Reminder title, e.g. 12-month vaccination");if(!title)return;
    const date=prompt("Date (YYYY-MM-DD)");if(!date)return;
    state.reminders.push({id:uid(),childId:c.id,title,date});save();renderTracker();
  };
  const rr=document.querySelector("#reminders");
  rr.innerHTML=rem.length?rem.map(r=>`<div class="item reminder"><strong>${esc(r.title)}</strong><small>${esc(r.date)}</small><div style="margin-top:8px"><button class="danger rdel" data-id="${r.id}">Remove</button></div></div>`).join(""):`<div class="item muted">No reminders yet.</div>`;
  rr.querySelectorAll(".rdel").forEach(b=>b.onclick=()=>{state.reminders=state.reminders.filter(r=>r.id!==b.dataset.id);save();renderTracker()});
  const ll=document.querySelector("#logs");
  ll.innerHTML=logs.length?logs.map(l=>`<div class="item"><strong>${l.type==="feed"?"🍼 Feed":l.type==="nappy"?"🧷 Nappy":"😴 Sleep"}</strong><small>${new Date(l.at).toLocaleString()}${l.type==="sleep"?` • ${l.amount}h`:""}</small></div>`).join(""):`<div class="item muted">No logs yet.</div>`;
}
function renderHistory(){
  document.querySelector("#history").innerHTML=`<header class="topbar"><div class="brand"><h1>History</h1><p>Recent questions on this device</p></div><button class="danger" id="clear">Clear</button></header><div class="card" id="historyList"></div>`;
  historyList.innerHTML=state.chats.length?state.chats.map(h=>`<div class="item"><strong>${esc(h.question)}</strong><small>${esc(h.childName)} • ${new Date(h.createdAt).toLocaleString()}</small><p style="line-height:1.5;margin-bottom:0">${esc(h.answer)}</p></div>`).join(""):`<div class="item muted">No saved questions yet.</div>`;
  clear.onclick=()=>{if(confirm("Clear question history?")){state.chats=[];save();renderHistory()}}
}
async function refreshStatus(){
  try{
    const r=await fetch("/api/status");
    return await r.json();
  }catch{return {aiConfigured:false,paymentsConfigured:false}}
}
function renderPlus(){
  document.querySelector("#plus").innerHTML=`<header class="topbar"><div class="brand"><h1>MumMate Plus</h1><p>Subscription</p></div></header>
  <div class="card form-card"><span class="pill">Optional upgrade</span><h2>MumMate Plus</h2>
  <div class="price">£4.99<span style="font-size:15px;font-weight:600">/month</span></div>
  <p class="muted">Example launch price. The checkout button becomes live when Stripe keys and a recurring Price ID are configured on the server.</p>
  <ul class="feature-list"><li>Unlimited AI conversations</li><li>Multiple children</li><li>Sleep, feeding and nappy tracking</li><li>Vaccination and appointment reminders</li><li>Saved chat history</li></ul>
  <button class="primary" id="subscribeBtn">Subscribe with Stripe</button>
  <p class="small" id="serviceStatus" style="margin-top:12px">Checking live services…</p></div>
  <div class="safety">Payments are created on the server. Secret API keys are never placed in the browser app.</div>`;
  const btn=document.querySelector("#subscribeBtn");
  const statusEl=document.querySelector("#serviceStatus");
  refreshStatus().then(s=>{
    statusEl.textContent=`AI: ${s.aiConfigured?"ready":"needs API key"} • Payments: ${s.paymentsConfigured?"ready":"needs Stripe setup"}`;
    if(!s.paymentsConfigured) btn.textContent="Stripe setup required";
  });
  btn.onclick=async()=>{
    btn.disabled=true;
    try{
      const r=await fetch("/api/create-checkout-session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:state.user?.email||""})});
      const d=await r.json();
      if(d.url){location.href=d.url;return}
      alert(d.error||"Checkout is not configured yet.");
    }catch{alert("Could not start checkout.");}
    finally{btn.disabled=false}
  };
}
renderApp();

if("serviceWorker" in navigator){navigator.serviceWorker.register("/service-worker.js").catch(()=>{});}
