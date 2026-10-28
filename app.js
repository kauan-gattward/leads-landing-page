"use strict";
const CRIT=[["Sem site/loja própria",20],["Pedidos por Direct/WhatsApp",25],["Produto com preço/catálogo visível",20],["Envia para todo o Brasil",15],["Postou nos últimos ~30 dias",10],["Nicho visual",10]];
const STATUS=["Novo","Verificar perfil","Abordado","Respondeu","Proposta enviada","Fechado","Perdido"];
const KEY="kauan-leads-app",SK="kauan-leads-sess",VIS="kauan-leads-visual";
let LEADS=[],st={status:{},notas:{},log:{},fu:{},extra:[]},ui={regiao:"brasil",view:"todos",nicho:"Todos",status:"Todos",ord:"score",aberto:""};
let visual="studio",lastSig="",gliderMem={};
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),b64e=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
const phone=s=>{const d=String(s||"").replace(/\D/g,"");if(d.startsWith("55")&&(d.length===12||d.length===13))return d;if(d.length===10||d.length===11)return"55"+d;return""};
const keyOf=l=>String(l.handle||"").startsWith("@")?l.handle.toLowerCase():"nome:"+String(l.nome).toLowerCase();
const score=c=>CRIT.reduce((s,x,i)=>s+(c[i]==="S"?x[1]:0),0);
const pad=n=>String(n).padStart(2,"0"),dia=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const agora=()=>{const d=new Date();return`${dia(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`},mais=n=>{const d=new Date();d.setDate(d.getDate()+n);return dia(d)};
const msg=l=>/^Oi/.test(l.nota||"")?l.nota:`Oi, tudo bem? Aqui é o Kauan. Vi o perfil da ${l.nome} e curti muito o trabalho com ${String(l.nicho).toLowerCase()}! Percebi que os pedidos são feitos pelo Direct/WhatsApp. Eu crio landing pages: uma página simples, com a cara da marca, que apresenta seus produtos e leva o cliente direto pro seu WhatsApp já sabendo o que quer. Fica ótima no link da bio e nos anúncios. Posso te mostrar uma ideia de como ficaria pra ${l.nome}, sem compromisso?`;
const reducedMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
const ICO={
  phone:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M8 3.8h2.1c.5 0 .9.3 1 .8l.7 2.5a1 1 0 0 1-.3 1l-1.4 1.1a12.2 12.2 0 0 0 5 5l1.1-1.4a1 1 0 0 1 1-.3l2.5.7c.5.1.8.5.8 1V17a2 2 0 0 1-2 2h-.6C9.6 19 5 14.4 5 8.4V7.8a2 2 0 0 1 2-2h1Z"/></svg>',
  chat:'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6.2 16.4 4 20l3.1-1.1A8.4 8.4 0 1 0 6.2 16.4Z"/></svg>'
};

async function getEnc(){const r=await fetch("data.enc.json",{cache:"no-store"});if(!r.ok)throw new Error("arquivo");return r.json()}
async function derive(pw,d){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:b64d(d.salt),iterations:d.iter},k,{name:"AES-GCM",length:256},true,["decrypt"])}
async function abrir(key,d){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(d.iv)},key,b64d(d.ct));return JSON.parse(new TextDecoder().decode(pt))}
async function entrar(){const e=$("#erro");e.hidden=true;e.classList.remove("shake");const btn=$("#entrar");btn.disabled=true;btn.textContent="Abrindo…";btn.setAttribute("aria-busy","true");
  try{const d=await getEnc();const key=await derive($("#pw").value,d);let data;try{data=await abrir(key,d)}catch{throw new Error("senha")}
    if($("#lembrar").checked)sessionStorage.setItem(SK,JSON.stringify({salt:d.salt,k:b64e(await crypto.subtle.exportKey("raw",key))}));
    $("#pw").value="";iniciar(data)}catch(x){e.textContent=x.message==="senha"?"Senha incorreta.":"Não foi possível carregar data.enc.json.";e.hidden=false;void e.offsetWidth;e.classList.add("shake")}
  finally{btn.disabled=false;btn.textContent="Entrar";btn.removeAttribute("aria-busy")}}
async function tentarSessao(){try{const s=JSON.parse(sessionStorage.getItem(SK)||"null");if(!s)return;const d=await getEnc();if(s.salt!==d.salt)return;
  const key=await crypto.subtle.importKey("raw",b64d(s.k),"AES-GCM",false,["decrypt"]);iniciar(await abrir(key,d))}catch{sessionStorage.removeItem(SK)}}
function sair(){sessionStorage.removeItem(SK);LEADS=[];lastSig="";$("#app").hidden=true;$("#app").innerHTML="";$("#login").hidden=false}

function iniciar(data){LEADS=(data.leads||[]).map(l=>({...l,id:keyOf(l),tel:l.tel||phone(l.contato),fraco:!l.verificado}));
  try{st={...st,...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{}
  $("#login").hidden=true;$("#app").hidden=false;render()}
const salvar=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch{alert("Não foi possível salvar neste navegador. Faça backup.")}};
const todos=()=>{const ids=new Set(LEADS.map(l=>l.id));return[...LEADS,...st.extra.filter(l=>!ids.has(l.id))]};
const regOf=l=>l.regiao||"brasil";
const stOf=l=>st.status[l.id]||l.st0||"Novo";
const hoje=()=>dia(new Date());
const vencidos=()=>todos().filter(l=>st.fu[l.id]&&st.fu[l.id]<=hoje()&&!["Fechado","Perdido"].includes(stOf(l)));
function registrar(id,a){const l=todos().find(x=>x.id===id);(st.log[id]=st.log[id]||[]).unshift({t:agora(),a});
  if(["Novo","Verificar perfil"].includes(stOf(l)))st.status[id]="Abordado";salvar();render()}

function syncThemeColor(){document.querySelectorAll('meta[name="theme-color"]').forEach(m=>{const dark=(m.getAttribute("media")||"").includes("dark");m.setAttribute("content",visual==="3d"||dark?"#07080c":"#efeae2")})}
function syncVisualControls(){document.querySelectorAll("[data-a='visual']").forEach(btn=>{const on=btn.dataset.v===visual;btn.classList.toggle("on",on);btn.setAttribute("aria-pressed",on?"true":"false")});
  document.querySelectorAll(".seg").forEach(seg=>{if(!seg.querySelector("[data-a='visual']"))return;const i=visual==="3d"?1:0;seg.style.setProperty("--i",String(i));const g=seg.querySelector("[data-glider]");if(g)g.dataset.i=String(i)})}
function setVisual(mode,persist=true){visual=mode==="3d"?"3d":"studio";document.body.classList.toggle("mode-3d",visual==="3d");document.documentElement.classList.toggle("want-3d",visual==="3d");
  document.documentElement.style.colorScheme=visual==="3d"?"dark":"";if(persist){try{localStorage.setItem(VIS,visual)}catch(e){}}syncVisualControls();syncThemeColor();
  try{if(window.Bg3d){if(visual==="3d")Bg3d.start();else Bg3d.stop()}}catch(e){}}
function initialVisual(){try{const q=new URLSearchParams(location.search).get("bg");if(q==="3d"||q==="studio"){history.replaceState(null,"",location.pathname+location.hash);return q}return localStorage.getItem(VIS)==="3d"?"3d":"studio"}catch(e){return"studio"}}
function animateGliders(){document.querySelectorAll("[data-glider]").forEach(el=>{const key=el.dataset.glider;const i=Number(el.dataset.i);const prev=gliderMem[key];gliderMem[key]=i;
  if(prev==null||prev===i||reducedMotion())return;el.animate([{left:`calc(4px + ${prev} * (50% - 2px))`},{left:`calc(4px + ${i} * (50% - 2px))`}],{duration:460,easing:"cubic-bezier(.22,.8,.28,1)"})})}

function render(){const tudo=todos(),all=tudo.filter(l=>regOf(l)===ui.regiao),v=vencidos().filter(l=>regOf(l)===ui.regiao),h=hoje();
  const nichos=["Todos",...new Set(all.map(l=>l.nicho))];
  let lista=(ui.view==="hoje"?v:all).filter(l=>(ui.nicho==="Todos"||l.nicho===ui.nicho)&&(ui.status==="Todos"||stOf(l)===ui.status));
  lista.sort((a,b)=>ui.ord==="score"?score(b.crit)-score(a.crit):ui.ord==="followup"?(st.fu[a.id]||"9").localeCompare(st.fu[b.id]||"9"):ui.ord==="nicho"?String(a.nicho).localeCompare(b.nicho):STATUS.indexOf(stOf(a))-STATUS.indexOf(stOf(b)));
  const sig=[ui.regiao,ui.view,ui.nicho,ui.status,ui.ord].join("|");
  const enter=lastSig!==sig,jump=lastSig!==""&&enter,y=jump?0:window.scrollY;lastSig=sig;
  const opt=(arr,val)=>arr.map(o=>{const[k,t]=Array.isArray(o)?o:[o,o];return`<option value="${esc(k)}"${k===val?" selected":""}>${esc(t)}</option>`}).join("");
  const porSt=STATUS.map(s=>[s,all.filter(l=>stOf(l)===s).length]).filter(x=>x[1]);
  const ri=ui.regiao==="bahia"?1:0,vi=ui.view==="hoje"?1:0,bi=visual==="3d"?1:0;
  const note=(window.Bg3d&&Bg3d.message)||"";
  const seg=(key,i,label,inner)=>`<div class="seg${key==="vis"?" tiny":""}" style="--i:${i}" role="group" aria-label="${label}"><span class="seg-glider" data-glider="${key}" data-i="${i}"></span>${inner}</div>`;
  $("#app").innerHTML=`<div class="wrap">
  <header class="top">
    <div class="brand"><h1>Leads</h1><p class="mut">Hoje é ${h}.</p></div>
    <button type="button" class="ghost" data-a="sair">Sair</button>
    ${seg("vis",bi,"Visual do fundo",`<button type="button" data-a="visual" data-v="studio" class="${visual==="studio"?"on":""}" aria-pressed="${visual==="studio"}">Estúdio</button><button type="button" data-a="visual" data-v="3d" class="${visual==="3d"?"on":""}" aria-pressed="${visual==="3d"}">3D</button>`)}
    <p class="bg-msg fine"${note?"":" hidden"}>${esc(note)}</p>
  </header>
  ${seg("reg",ri,"Região",[["brasil","Brasil"],["bahia","Bahia"]].map(x=>`<button type="button" data-a="reg" data-v="${x[0]}" class="${ui.regiao===x[0]?"on":""}" aria-pressed="${ui.regiao===x[0]}">${x[1]} <em>(${tudo.filter(l=>regOf(l)===x[0]).length})</em></button>`).join(""))}
  <section class="metrics" aria-label="Resumo">
    <article class="metric"><span>Leads</span><b>${all.length}</b></article>
    <article class="metric"><span>Novos hoje</span><b>${all.filter(l=>l.add===h).length}</b></article>
    <article class="metric${v.length?" hot":""}"><span>Follow-ups hoje</span><b class="${v.length?"warn":""}">${v.length}</b></article>
  </section>
  ${porSt.length?`<div class="pipeline">${porSt.map(x=>`<span class="pill">${esc(x[0])}: ${x[1]}</span>`).join("")}</div>`:""}
  ${seg("view",vi,"Lista",`<button type="button" data-a="view" data-v="todos" class="${ui.view==="todos"?"on":""}" aria-pressed="${ui.view==="todos"}">Todos <em>(${all.length})</em></button><button type="button" data-a="view" data-v="hoje" class="${ui.view==="hoje"?"on":""}" aria-pressed="${ui.view==="hoje"}">Hoje <em>(${v.length})</em></button>`)}
  <div class="filters"><select data-f="nicho" aria-label="Nicho">${opt(nichos,ui.nicho)}</select><select data-f="status" aria-label="Status">${opt(["Todos",...STATUS],ui.status)}</select>
  <select data-f="ord" aria-label="Ordenação">${opt([["score","Ordenar: score"],["followup","Ordenar: follow-up"],["status","Ordenar: status"],["nicho","Ordenar: nicho"]],ui.ord)}</select></div>
  <div class="list" id="lista">${lista.length?lista.map((l,i)=>card(l,i,enter)).join(""):`<div class="empty"><p>Nenhum lead com esses filtros.</p></div>`}</div>
  <details class="sheet"><summary>Adicionar lead</summary><div class="sheet-body">
   <input id="n_nome" placeholder="Nome"><input id="n_handle" placeholder="@ do Instagram"><input id="n_tel" inputmode="tel" placeholder="Telefone/WhatsApp com DDD">
   <input id="n_nicho" placeholder="Nicho"><input id="n_cidade" placeholder="Cidade/UF"><input id="n_evid" placeholder="Evidência (sem loja?)">
   ${CRIT.map((c,i)=>`<label class="stack">${esc(c[0])}<select id="n_c${i}">${opt([["?","desconhecido"],["S","sim"],["N","não"]],i===1?"S":"?")}</select></label>`).join("")}
   <button type="button" class="primary" data-a="add">Adicionar lead</button></div></details>
  <details class="sheet"><summary>Backup (exportar/importar)</summary><div class="sheet-body">
   <p class="mut">Status, notas, contatos e follow-ups ficam só neste navegador. Exporte de vez em quando.</p>
   <div class="row"><button type="button" class="primary" data-a="exp">Exportar JSON</button><button type="button" data-a="imp">Importar JSON</button></div>
   <input id="arq" type="file" accept=".json,application/json">
   <textarea id="io" placeholder="Cole um backup JSON aqui e toque em Importar"></textarea><p id="iomsg" class="mut"></p></div></details>
  <details class="sheet"><summary>Como funciona o score</summary><div class="sheet-body"><dl>${CRIT.map(c=>`<dt>${c[1]} pts</dt><dd>${esc(c[0])}</dd>`).join("")}</dl><p class="mut">Só soma o confirmado; desconhecido vale 0.</p></div></details>
  </div>`;
  window.scrollTo(0,y);animateGliders()}

function card(l,i,enter){const open=ui.aberto===l.id,lg=st.log[l.id]||[],s=stOf(l),fu=st.fu[l.id]||"",h=hoje(),lb=c=>c==="S"?"sim":c==="N"?"não":"desconhecido";
  const sc=score(l.crit),tier=sc>=70?"high":sc>=40?"mid":"low",due=fu&&fu<=h&&!["Fechado","Perdido"].includes(s);
  const tone=s==="Perdido"?"dan":s==="Fechado"?"ok":s==="Respondeu"||s==="Proposta enviada"?"hot":"";
  return`<article class="card${open?" open":""}${due?" due":""}${enter?" in":""}" style="--i:${Math.min(i,8)}">
  <div class="card-h"><div class="who"><h2 class="nome">${esc(l.nome)}</h2><p class="mut">${esc(l.handle)} · ${esc(l.nicho)} · ${esc(l.cidade)} · ${esc(l.seg)} seguidores</p></div>
  <div class="ring ${tier}" style="--p:${sc}" title="Score ${sc}"><svg viewBox="0 0 36 36" aria-hidden="true"><circle class="track" cx="18" cy="18" r="15.5" pathLength="100"></circle><circle class="prog" cx="18" cy="18" r="15.5" pathLength="100"></circle></svg><b>${sc}</b></div></div>
  <div class="pills"><span class="pill ${tone}">${esc(s)}</span><span class="pill ${l.fraco?"warn":"ok"}">${l.fraco?"verificação fraca":"verificado"}</span>${fu?`<span class="pill ${due?"warn":""}">follow-up ${esc(fu)}</span>`:""}</div>
  ${l.tel?`<div class="actions"><a class="btn big call" href="tel:+${l.tel}">${ICO.phone}<span>Ligar</span></a><a class="btn big wa" target="_blank" rel="noopener" data-a="wa" data-id="${esc(l.id)}" href="https://wa.me/${l.tel}?text=${encodeURIComponent(msg(l))}">${ICO.chat}<span>WhatsApp</span></a></div>`:`<p class="mut none">sem telefone</p>`}
  <div class="quick">${["Liguei","Não atendeu","Mandei mensagem"].map(a=>`<button type="button" data-a="log" data-id="${esc(l.id)}" data-v="${a}">${a}</button>`).join("")}</div>
  ${lg[0]?`<p class="mut last">Último contato: ${esc(lg[0].a)}, ${esc(lg[0].t)}</p>`:""}
  <button type="button" class="expand" data-a="toggle" data-id="${esc(l.id)}" aria-expanded="${open?"true":"false"}"><span>${open?"Fechar detalhes":"Detalhes, notas e follow-up"}</span><svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
  ${open?`<div class="more"><label class="stack">Status<select data-a="st" data-id="${esc(l.id)}">${STATUS.map(x=>`<option${x===s?" selected":""}>${x}</option>`).join("")}</select></label>
   <label class="stack">Notas<textarea data-a="nota" data-id="${esc(l.id)}">${esc(st.notas[l.id]??l.nota??"")}</textarea></label>
   <label class="stack">Próximo follow-up<input type="date" data-a="fu" data-id="${esc(l.id)}" value="${esc(fu)}"></label>
   <div class="quick">${[["Amanhã",1],["+3 dias",3],["+7 dias",7]].map(x=>`<button type="button" data-a="fuq" data-id="${esc(l.id)}" data-v="${x[1]}">${x[0]}</button>`).join("")}<button type="button" data-a="fuq" data-id="${esc(l.id)}" data-v="">Limpar</button></div>
   <div class="msg">${esc(msg(l))}</div><button type="button" class="wide" data-a="copy" data-id="${esc(l.id)}">Copiar mensagem (Direct)</button>
   ${l.url?`<a class="btn" target="_blank" rel="noopener" href="${esc(l.url)}">Abrir Instagram</a>`:""}
   <dl><dt>Contato</dt><dd>${esc(l.contato)}</dd><dt>Link na bio</dt><dd>${esc(l.bio)}</dd><dt>Último post</dt><dd>${esc(l.ult)}</dd><dt>Evidência</dt><dd>${esc(l.evid)}</dd><dt>Fonte</dt><dd>${esc(l.fonte)}</dd></dl>
   <dl>${CRIT.map((c,i)=>`<dt>${esc(c[0])} (${c[1]})</dt><dd class="${l.crit[i]==="S"?"ok":l.crit[i]==="N"?"dan":"mut"}">${lb(l.crit[i])}</dd>`).join("")}</dl>
   ${lg.length?`<dl>${lg.slice(0,10).map(x=>`<dt>${esc(x.t)}</dt><dd>${esc(x.a)}</dd>`).join("")}</dl>`:""}</div>`:""}</article>`}

document.addEventListener("click",async e=>{const b=e.target.closest("[data-a]");if(!b)return;const a=b.dataset.a,id=b.dataset.id;
  if(a==="visual"){setVisual(b.dataset.v);if(!$("#app").hidden)render();else animateGliders();return}
  if(!$("#app").contains(b))return;
  if(a==="sair")sair();else if(a==="reg"){ui.regiao=b.dataset.v;ui.nicho="Todos";ui.aberto="";render()}else if(a==="view"){ui.view=b.dataset.v;render()}else if(a==="toggle"){ui.aberto=ui.aberto===id?"":id;render()}
  else if(a==="log")registrar(id,b.dataset.v);else if(a==="wa")setTimeout(()=>registrar(id,"Mandei mensagem"),300);
  else if(a==="fuq"){st.fu[id]=b.dataset.v?mais(+b.dataset.v):"";salvar();render()}
  else if(a==="copy"){const l=todos().find(x=>x.id===id);try{await navigator.clipboard.writeText(msg(l));b.textContent="Copiado!"}catch{b.textContent="Selecione o texto e copie"}}
  else if(a==="add"){const g=k=>$("#n_"+k).value.trim();if(!g("nome"))return alert("Informe o nome.");const h=g("handle")?g("handle").replace(/^@?/,"@"):"n/d";
    const l={nome:g("nome"),handle:h,url:h!=="n/d"?`https://www.instagram.com/${h.slice(1)}/`:"",nicho:g("nicho")||"n/d",cidade:g("cidade")||"n/d",seg:"n/d",contato:g("tel")?"Tel "+g("tel"):"n/d",evid:g("evid")||"n/d",fonte:"adicionado manualmente",crit:CRIT.map((c,i)=>$("#n_c"+i).value).join(""),verificado:false,fraco:true,bio:"n/d",ult:"n/d",st0:"Novo",nota:"",tel:phone(g("tel")),add:hoje(),regiao:ui.regiao};
    l.id=keyOf(l);st.extra=st.extra.filter(x=>x.id!==l.id).concat(l);ui.aberto=l.id;salvar();render()}
  else if(a==="exp"){const s=JSON.stringify({app:KEY,exportado:agora(),dados:st},null,1);$("#io").value=s;
    try{const u=URL.createObjectURL(new Blob([s],{type:"application/json"}));const x=document.createElement("a");x.href=u;x.download=`leads-backup-${hoje()}.json`;x.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}catch{}
    $("#iomsg").textContent="Backup baixado (e também mostrado acima). Atenção: o backup não é criptografado."}
  else if(a==="imp"){const f=$("#arq").files[0];const txt=f?await f.text():$("#io").value;try{const o=JSON.parse(txt),d=o.dados||o;if(!d.status)throw 0;st={status:{},notas:{},log:{},fu:{},extra:[],...d};salvar();render()}catch{$("#iomsg").textContent="Backup inválido."}}});
document.addEventListener("change",e=>{const t=e.target;if(t.dataset.f){ui[t.dataset.f]=t.value;render();return}const id=t.dataset.id;
  if(t.dataset.a==="st"){st.status[id]=t.value;salvar();render()}else if(t.dataset.a==="fu"){st.fu[id]=t.value;salvar();render()}else if(t.dataset.a==="nota"){st.notas[id]=t.value;salvar()}});
document.addEventListener("input",e=>{const t=e.target;if(t.dataset&&t.dataset.a==="nota"){st.notas[t.dataset.id]=t.value;salvar()}});
$("#gate-form").addEventListener("submit",e=>{e.preventDefault();entrar()});
$("#ver-senha").addEventListener("click",()=>{const i=$("#pw"),show=i.type==="password";i.type=show?"text":"password";$("#ver-senha").textContent=show?"Ocultar":"Mostrar";$("#ver-senha").setAttribute("aria-pressed",show?"true":"false")});
matchMedia("(prefers-color-scheme: dark)").addEventListener("change",syncThemeColor);
setVisual(initialVisual(),true);
animateGliders();
tentarSessao();
