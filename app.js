"use strict";
const CRIT=[["Sem site/loja própria",20],["Pedidos por Direct/WhatsApp",25],["Produto com preço/catálogo visível",20],["Envia para todo o Brasil",15],["Postou nos últimos ~30 dias",10],["Nicho visual",10]];
const STATUS=["Novo","Verificar perfil","Abordado","Respondeu","Proposta enviada","Fechado","Perdido"];
const KEY="kauan-leads-app",SK="kauan-leads-sess";
let LEADS=[],st={status:{},notas:{},log:{},fu:{},extra:[]},ui={regiao:"brasil",view:"todos",nicho:"Todos",status:"Todos",ord:"score",aberto:""};
const $=s=>document.querySelector(s),esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const b64d=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),b64e=u=>btoa(String.fromCharCode(...new Uint8Array(u)));
const phone=s=>{const d=String(s||"").replace(/\D/g,"");if(d.startsWith("55")&&(d.length===12||d.length===13))return d;if(d.length===10||d.length===11)return"55"+d;return""};
const keyOf=l=>String(l.handle||"").startsWith("@")?l.handle.toLowerCase():"nome:"+String(l.nome).toLowerCase();
const score=c=>CRIT.reduce((s,x,i)=>s+(c[i]==="S"?x[1]:0),0);
const pad=n=>String(n).padStart(2,"0"),dia=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const agora=()=>{const d=new Date();return`${dia(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`},mais=n=>{const d=new Date();d.setDate(d.getDate()+n);return dia(d)};
const msg=l=>(l.regiao==="bahia"&&/^Oi/.test(l.nota||""))?l.nota:`Oi, tudo bem? Aqui é o Kauan. Vi o perfil da ${l.nome} e curti muito o trabalho com ${String(l.nicho).toLowerCase()}! Percebi que os pedidos são feitos pelo Direct/WhatsApp. Eu crio landing pages: uma página simples, com a cara da marca, que apresenta seus produtos e leva o cliente direto pro seu WhatsApp já sabendo o que quer. Fica ótima no link da bio e nos anúncios. Posso te mostrar uma ideia de como ficaria pra ${l.nome}, sem compromisso?`;

async function getEnc(){const r=await fetch("data.enc.json",{cache:"no-store"});if(!r.ok)throw new Error("arquivo");return r.json()}
async function derive(pw,d){const k=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",hash:"SHA-256",salt:b64d(d.salt),iterations:d.iter},k,{name:"AES-GCM",length:256},true,["decrypt"])}
async function abrir(key,d){const pt=await crypto.subtle.decrypt({name:"AES-GCM",iv:b64d(d.iv)},key,b64d(d.ct));return JSON.parse(new TextDecoder().decode(pt))}
async function entrar(){const e=$("#erro");e.hidden=true;$("#entrar").disabled=true;$("#entrar").textContent="Abrindo…";
  try{const d=await getEnc();const key=await derive($("#pw").value,d);let data;try{data=await abrir(key,d)}catch{throw new Error("senha")}
    if($("#lembrar").checked)sessionStorage.setItem(SK,JSON.stringify({salt:d.salt,k:b64e(await crypto.subtle.exportKey("raw",key))}));
    $("#pw").value="";iniciar(data)}catch(x){e.textContent=x.message==="senha"?"Senha incorreta.":"Não foi possível carregar data.enc.json.";e.hidden=false}
  finally{$("#entrar").disabled=false;$("#entrar").textContent="Entrar"}}
async function tentarSessao(){try{const s=JSON.parse(sessionStorage.getItem(SK)||"null");if(!s)return;const d=await getEnc();if(s.salt!==d.salt)return;
  const key=await crypto.subtle.importKey("raw",b64d(s.k),"AES-GCM",false,["decrypt"]);iniciar(await abrir(key,d))}catch{sessionStorage.removeItem(SK)}}
function sair(){sessionStorage.removeItem(SK);LEADS=[];$("#app").hidden=true;$("#app").innerHTML="";$("#login").hidden=false}

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

function render(){const tudo=todos(),all=tudo.filter(l=>regOf(l)===ui.regiao),v=vencidos().filter(l=>regOf(l)===ui.regiao),h=hoje();
  const nichos=["Todos",...new Set(all.map(l=>l.nicho))];
  let lista=(ui.view==="hoje"?v:all).filter(l=>(ui.nicho==="Todos"||l.nicho===ui.nicho)&&(ui.status==="Todos"||stOf(l)===ui.status));
  lista.sort((a,b)=>ui.ord==="score"?score(b.crit)-score(a.crit):ui.ord==="followup"?(st.fu[a.id]||"9").localeCompare(st.fu[b.id]||"9"):ui.ord==="nicho"?String(a.nicho).localeCompare(b.nicho):STATUS.indexOf(stOf(a))-STATUS.indexOf(stOf(b)));
  const opt=(arr,val)=>arr.map(o=>{const[k,t]=Array.isArray(o)?o:[o,o];return`<option value="${esc(k)}"${k===val?" selected":""}>${esc(t)}</option>`}).join("");
  const porSt=STATUS.map(s=>[s,all.filter(l=>stOf(l)===s).length]).filter(x=>x[1]);
  $("#app").innerHTML=`<div class="wrap">
  <div class="row" style="justify-content:space-between"><h1>Leads</h1><button data-a="sair">Sair</button></div>
  <div class="tabs">${[["brasil","Brasil"],["bahia","Bahia"]].map(x=>`<button data-a="reg" data-v="${x[0]}" class="tab ${ui.regiao===x[0]?"on":""}">${x[1]} (${tudo.filter(l=>regOf(l)===x[0]).length})</button>`).join("")}</div>
  <p class="mut">Hoje é ${h}.</p>
  <div class="metrics"><div class="metric"><b>${all.length}</b>Leads</div><div class="metric"><b>${all.filter(l=>l.add===h).length}</b>Novos hoje</div><div class="metric"><b class="${v.length?"warn":""}">${v.length}</b>Follow-ups hoje</div></div>
  <p class="mut">${porSt.map(x=>`${esc(x[0])}: ${x[1]}`).join(" · ")}</p>
  <div class="row"><button data-a="view" data-v="todos" class="${ui.view==="todos"?"on":""}">Todos (${all.length})</button><button data-a="view" data-v="hoje" class="${ui.view==="hoje"?"on":""}">Hoje (${v.length})</button></div>
  <div class="row" style="margin:10px 0"><select data-f="nicho">${opt(nichos,ui.nicho)}</select><select data-f="status">${opt(["Todos",...STATUS],ui.status)}</select>
  <select data-f="ord">${opt([["score","Ordenar: score"],["followup","Ordenar: follow-up"],["status","Ordenar: status"],["nicho","Ordenar: nicho"]],ui.ord)}</select></div>
  ${lista.map(card).join("")}
  <details><summary>Adicionar lead</summary><div class="col" style="margin-top:10px">
   <input id="n_nome" placeholder="Nome"><input id="n_handle" placeholder="@ do Instagram"><input id="n_tel" inputmode="tel" placeholder="Telefone/WhatsApp com DDD">
   <input id="n_nicho" placeholder="Nicho"><input id="n_cidade" placeholder="Cidade/UF"><input id="n_evid" placeholder="Evidência (sem loja?)">
   ${CRIT.map((c,i)=>`<label class="mut">${esc(c[0])}<select id="n_c${i}">${opt([["?","desconhecido"],["S","sim"],["N","não"]],i===1?"S":"?")}</select></label>`).join("")}
   <button class="primary" data-a="add">Adicionar lead</button></div></details>
  <details><summary>Backup (exportar/importar)</summary><div class="col" style="margin-top:10px">
   <p class="mut">Status, notas, contatos e follow-ups ficam só neste navegador. Exporte de vez em quando.</p>
   <div class="row"><button class="primary" data-a="exp">Exportar JSON</button><button data-a="imp">Importar JSON</button><input id="arq" type="file" accept=".json,application/json" style="width:auto"></div>
   <textarea id="io" placeholder="Cole um backup JSON aqui e toque em Importar"></textarea><p id="iomsg" class="mut"></p></div></details>
  <details><summary>Como funciona o score</summary><dl style="margin-top:10px">${CRIT.map(c=>`<dt>${c[1]} pts</dt><dd>${esc(c[0])}</dd>`).join("")}</dl><p class="mut">Só soma o confirmado; desconhecido vale 0.</p></details>
  </div>`}
function card(l){const open=ui.aberto===l.id,lg=st.log[l.id]||[],s=stOf(l),fu=st.fu[l.id]||"",h=hoje(),lb=c=>c==="S"?"sim":c==="N"?"não":"desconhecido";
  return`<div class="card"><div class="row" style="justify-content:space-between"><span class="nome">${esc(l.nome)}</span><span class="score">${score(l.crit)}</span></div>
  <div class="mut">${esc(l.handle)} · ${esc(l.nicho)} · ${esc(l.cidade)} · ${esc(l.seg)} seguidores</div>
  <div class="row"><span class="pill ${s==="Perdido"?"dan":s==="Fechado"?"ok":""}">${esc(s)}</span><span class="pill ${l.fraco?"warn":"ok"}">${l.fraco?"verificação fraca":"verificado"}</span>${fu?`<span class="pill ${fu<=h?"warn":""}">follow-up ${esc(fu)}</span>`:""}</div>
  ${l.tel?`<div class="row"><a class="btn big" href="tel:+${l.tel}">Ligar</a><a class="btn big wa" target="_blank" rel="noopener" data-a="wa" data-id="${esc(l.id)}" href="https://wa.me/${l.tel}?text=${encodeURIComponent(msg(l))}">WhatsApp</a></div>`:`<div class="mut">sem telefone</div>`}
  <div class="row">${["Liguei","Não atendeu","Mandei mensagem"].map(a=>`<button data-a="log" data-id="${esc(l.id)}" data-v="${a}">${a}</button>`).join("")}</div>
  ${lg[0]?`<div class="mut">Último contato: ${esc(lg[0].a)}, ${esc(lg[0].t)}</div>`:""}
  <button data-a="toggle" data-id="${esc(l.id)}">${open?"Fechar detalhes":"Detalhes, notas e follow-up"}</button>
  ${open?`<div class="col"><label class="mut">Status<select data-a="st" data-id="${esc(l.id)}">${STATUS.map(x=>`<option${x===s?" selected":""}>${x}</option>`).join("")}</select></label>
   <label class="mut">Notas<textarea data-a="nota" data-id="${esc(l.id)}" style="min-height:70px;font-family:inherit">${esc(st.notas[l.id]??l.nota??"")}</textarea></label>
   <label class="mut">Próximo follow-up<input type="date" data-a="fu" data-id="${esc(l.id)}" value="${esc(fu)}"></label>
   <div class="row">${[["Amanhã",1],["+3 dias",3],["+7 dias",7]].map(x=>`<button data-a="fuq" data-id="${esc(l.id)}" data-v="${x[1]}">${x[0]}</button>`).join("")}<button data-a="fuq" data-id="${esc(l.id)}" data-v="">Limpar</button></div>
   <div class="msg">${esc(msg(l))}</div><button data-a="copy" data-id="${esc(l.id)}">Copiar mensagem (Direct)</button>
   ${l.url?`<a class="btn" target="_blank" rel="noopener" href="${esc(l.url)}">Abrir Instagram</a>`:""}
   <dl><dt>Contato</dt><dd>${esc(l.contato)}</dd><dt>Link na bio</dt><dd>${esc(l.bio)}</dd><dt>Último post</dt><dd>${esc(l.ult)}</dd><dt>Evidência</dt><dd>${esc(l.evid)}</dd><dt>Fonte</dt><dd>${esc(l.fonte)}</dd></dl>
   <dl>${CRIT.map((c,i)=>`<dt>${esc(c[0])} (${c[1]})</dt><dd class="${l.crit[i]==="S"?"ok":l.crit[i]==="N"?"dan":"mut"}">${lb(l.crit[i])}</dd>`).join("")}</dl>
   ${lg.length?`<dl>${lg.slice(0,10).map(x=>`<dt>${esc(x.t)}</dt><dd>${esc(x.a)}</dd>`).join("")}</dl>`:""}</div>`:""}</div>`}

document.addEventListener("click",async e=>{const b=e.target.closest("[data-a]");if(!b||!$("#app").contains(b))return;const a=b.dataset.a,id=b.dataset.id;
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
$("#entrar").addEventListener("click",entrar);$("#pw").addEventListener("keydown",e=>{if(e.key==="Enter")entrar()});tentarSessao();
