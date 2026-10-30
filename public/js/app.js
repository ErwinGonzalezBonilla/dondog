"use strict";
const LOGO="/img/logo.webp";
const MASCOT="/img/el-don.webp",MASCOT_SM="/img/el-don-mini.webp";
const IG='<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 4.8a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.2-9.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4z"/></svg>';
const CATS=[
 {id:"alimentos",name:"Alimentos",d:"M7 3h10l1 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zM6 7h12M10 12h4"},
 {id:"snacks",name:"Snacks",d:"M6.5 9.5a2.5 2.5 0 1 1 3-3l5 5a2.5 2.5 0 1 1 3 3 2.5 2.5 0 1 1-3 3l-5-5a2.5 2.5 0 1 1-3-3z"},
 {id:"juguetes",name:"Juguetes",d:"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM4 9c4 2 12 2 16 0M4 15c4-2 12-2 16 0"},
 {id:"accesorios",name:"Accesorios",d:"M4 12a8 4 0 1 0 16 0 8 4 0 1 0-16 0M12 16v5M10 21h4"},
 {id:"cosmetica",name:"Cosmética e higiene",d:"M9 3h6v3H9zM8 6h8l1 3v11a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9zM10 13h4"},
 {id:"salud",name:"Salud y bienestar",d:"M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"},
 {id:"ropa",name:"Ropa",d:"M8 3l-5 3 2 4 3-1v12h8V9l3 1 2-4-5-3c0 2-1.5 3-4 3S8 5 8 3z"}
];
const PETS=[{id:"perro",name:"Perros"},{id:"gato",name:"Gatos"},{id:"otros",name:"Otros"}];
const catById=Object.fromEntries(CATS.map(c=>[c.id,c]));
const clp=n=>new Intl.NumberFormat("es-CL",{style:"currency",currency:"CLP",maximumFractionDigits:0}).format(Math.round(n||0));
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const icon=(d,sw=1.8)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"><path d="${d}"/></svg>`;
const PAW='<svg class="paw" viewBox="0 0 64 64" fill="currentColor"><ellipse cx="32" cy="43" rx="15" ry="13"/><ellipse cx="13" cy="27" rx="6.5" ry="8.5" transform="rotate(-20 13 27)"/><ellipse cx="25" cy="15" rx="6.5" ry="9"/><ellipse cx="39" cy="15" rx="6.5" ry="9"/><ellipse cx="51" cy="27" rx="6.5" ry="8.5" transform="rotate(20 51 27)"/></svg>';
const paws=n=>PAW.repeat(n);
const lsGet=(k,d)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const fecha=ms=>new Date(ms).toLocaleString("es-CL",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});
const PAY_NAMES={webpay:"Webpay",mercadopago:"Mercado Pago",transferencia:"Transferencia",efectivo:"Efectivo",debito:"Débito",credito:"Crédito"};
const STATUS_NAMES={pendiente_pago:"Esperando pago",nuevo:"Pagado · por preparar",preparando:"Preparando",listo:"Listo",enviado:"En camino",retirado:"Retirado",entregado:"Entregado",cancelado:"Cancelado"};

const S={products:[],config:{slaHours:24,lowStock:5,freeShip:40000,shipCost:3990,shipComunas:""},payments:{},store:{},ai:false,orders:[],
  cart:lsGet("dd_cart",{}),view:"home",cat:null,pet:null,q:"",sort:"featured",
  admin:null,sysStatus:null,adminProducts:[],loaded:false,loadError:false,adminTab:"pedidos",orderFilter:"activos"};

/* ---------- API ---------- */
async function api(path,{method="GET",body,form}={}){
  const opts={method,headers:{"X-Requested-With":"fetch"},credentials:"same-origin"};
  if(form){opts.body=form}else if(body!==undefined){opts.headers["Content-Type"]="application/json";opts.body=JSON.stringify(body)}
  let r;try{r=await fetch(path,opts)}catch(e){throw new Error("Sin conexión. Revisa tu internet e intenta de nuevo.")}
  const data=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(data.error||"Ocurrió un error. Intenta de nuevo."),{status:r.status});
  return data;
}

function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600)}
function imgSrc(p){return p.image||""}
function phHTML(p){const s=imgSrc(p);if(s)return `<img src="${esc(s)}" alt="${esc(p.name)}" loading="lazy">`;const c=catById[p.category]||CATS[0];return `<div class="ph-blank">${icon(c.d,1.4)}</div>`}
function prod(id){return S.products.find(x=>x.id===id)}
function stockOf(id){const p=prod(id);return p?p.stock:0}
function availHTML(id){const n=stockOf(id);if(n<=0)return `<span class="avail out">Sin stock</span>`;if(n<=S.config.lowStock)return `<span class="avail low">Últimas ${n} unidades</span>`;return `<span class="avail ok">Disponible · ${n} en stock</span>`}
function active(){return S.products}

/* ---------- STORE VIEWS ---------- */
const NAV=[
 {id:"perros",name:"Perros",pet:"perro",items:["alimentos","snacks","juguetes","accesorios","ropa","cosmetica","salud"]},
 {id:"gatos",name:"Gatos",pet:"gato",items:["alimentos","snacks","juguetes","accesorios","cosmetica","salud"]},
 {id:"alim",name:"Alimentación",items:["alimentos","snacks"]},
 {id:"acc",name:"Accesorios y juguetes",items:["accesorios","juguetes","ropa"]},
 {id:"cuid",name:"Cuidado y salud",items:["cosmetica","salud"]},
 {id:"ofertas",name:"Ofertas",deals:true}];
const groupById=Object.fromEntries(NAV.map(g=>[g.id,g]));
let navOpen=null;
function navOn(g){if(S.view!=="catalog")return false;if(g.deals)return !!S.deals;if(g.pet)return S.pet===g.pet;return S.cat==="g:"+g.id||(!S.pet&&g.items.includes(S.cat))}
function renderNav(){
  const cnt=(c,pet)=>active().filter(p=>p.category===c&&(!pet||p.pet===pet||p.pet==="todos")).length;
  $("#catNav").innerHTML=NAV.map(g=>g.deals
    ?`<button class="navtop deals ${navOn(g)?"on":""}" data-nav="todo||1">${esc(g.name)}</button>`
    :`<div class="navgrp"><button class="navtop ${navOn(g)?"on":""}" data-grp="${g.id}" aria-expanded="${navOpen===g.id}">${esc(g.name)}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="navpanel" ${navOpen===g.id?"":"hidden"}>
        <button class="navall" data-nav="${g.pet?"todo|"+g.pet:"g:"+g.id+"|"}">Ver todo ${esc(g.name.toLowerCase())} →</button>
        ${g.items.map((c,i)=>`<button class="navitem" data-nav="${c}|${g.pet||""}"><span class="navico c${i%4}">${icon(catById[c].d,1.8)}</span><span>${esc(catById[c].name)}<small class="num">${cnt(c,g.pet)} productos</small></span></button>`).join("")}
      </div></div>`).join("");
  const open=$("#catNav .navgrp [aria-expanded=true]");
  if(open){const panel=open.nextElementSibling,nav=$("nav.cats").getBoundingClientRect(),b=open.getBoundingClientRect(),w=Math.min(panel.offsetWidth,nav.width-32);panel.style.left=Math.max(16,Math.min(b.left-nav.left,nav.width-w-16))+"px"}
}
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-grp]");
  if(g){navOpen=navOpen===g.dataset.grp?null:g.dataset.grp;renderNav();return}
  if(navOpen&&!e.target.closest(".navpanel")){navOpen=null;renderNav()}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&navOpen){navOpen=null;renderNav()}});
function card(p){
  const n=p.stock,sale=p.oldPrice&&p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  return `<article class="card">
   <a class="ph" href="/producto/${esc(p.slug)}" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">${phHTML(p)}${p.featured?'<span class="tag">Destacado</span>':""}${sale?`<span class="tag sale">-${sale}%</span>`:""}</a>
   <div class="body"><span class="brandl">${esc(p.brand||catById[p.category]?.name||"")}</span>
   <h3>${esc(p.name)}</h3>
   <div class="price"><b>${clp(p.price)}</b>${sale?`<s>${clp(p.oldPrice)}</s>`:""}</div>
   ${availHTML(p.id)}
   <button class="add" data-add="${p.id}" ${n<=0?"disabled":""}>${n<=0?"Agotado":"Agregar al carrito"}</button></div></article>`;
}
function emptyCatalog(){return `<div class="empty"><b>Todavía no hay productos publicados</b>${S.admin?"Abre <b style='display:inline'>Admin → Productos</b> para cargar el primero.":S.loadError?"No pudimos cargar el catálogo. Revisa tu conexión y recarga la página.":"Vuelve pronto: estamos cargando el catálogo."}</div>`}
function renderHome(){
  const ps=active(),feat=ps.filter(p=>p.featured).slice(0,8),deals=ps.filter(p=>p.oldPrice>p.price).slice(0,4);
  const counts=Object.fromEntries(CATS.map(c=>[c.id,ps.filter(p=>p.category===c.id).length]));
  const blurbs={alimentos:"Pienso seco y húmedo de marcas premium para cada etapa.",snacks:"Premios naturales, dentales y de entrenamiento.",juguetes:"Pelotas, mordedores y juegos para gatos activos.",accesorios:"Correas, arneses, camas y collares de recuperación.",cosmetica:"Shampoo, colonias y cuidado del pelaje.",salud:"Calmantes, antiparasitarios y bienestar diario.",ropa:"Chalecos, botas y abrigo para el invierno."};
  const payTxt=[S.payments.webpay&&"Webpay",S.payments.mercadopago&&"Mercado Pago",S.payments.transferencia&&"transferencia"].filter(Boolean);
  $("#main").innerHTML=`
  <section class="hero2"><div class="wrap hero2__in">
    <div class="hero2__txt">
      <span class="pill-dark">Nuevo · <b>Compra online</b> y retira en tienda</span>
      <p class="kicker">Pet shop · Vitacura</p>
      <h1 class="display">Consentir a tu mascota es cosa de Dones</h1>
      <p class="hero2__eslogan">Todo para perros y gatos, <span>listo en ${S.config.slaHours} horas.</span></p>
      <div class="cta-row"><button class="btn-pill acc" data-cat="todo">Ver productos</button><button class="btn-pill line" data-cat="alimentos">Alimentos</button></div>
      <div class="hero2__redes"><span>Síguenos</span><a class="redes1 light" href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener" aria-label="Instagram">${IG}</a><span class="mono">@dondog.cl</span></div>
    </div>
    <figure class="hero2__foto"><img src="/img/tienda.webp" alt="Interior de la tienda Don Dog con huellas de colores en el piso"></figure>
  </div></section>
  <section class="oscura sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Categorías</p><h2 class="display h-xl">Todo para tu mascota</h2></div><p>Elige una categoría y mira lo que tenemos en stock ahora mismo en la tienda.</p></div>
    <div class="cats-grid">${CATS.map((c,i)=>`<button class="catcard" data-cat="${c.id}"><span class="catcard__img"><img src="/img/categorias/${c.id}.svg" alt="" loading="lazy"></span><span class="catcard__txt"><small class="num">${counts[c.id]} productos</small><h3><span class="catcard__mini c${i%4}" aria-hidden="true">${icon(c.d,2)}</span>${esc(c.name)}</h3><p>${blurbs[c.id]}</p><span class="flecha">Ver ${esc(c.name.split(" ")[0].toLowerCase())} →</span></span></button>`).join("")}
      <button class="catcard catcard--all" data-cat="todo"><span class="catcard__txt"><small>Catálogo completo</small><h3>Ver todo</h3><p>${ps.length?ps.length+" productos con stock en vivo.":"Todo el catálogo con stock en vivo."}</p><span class="flecha">Entrar a la tienda →</span></span></button></div>
  </div></section>
  <section class="sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Lo más pedido</p><h2 class="display h-xl">Destacados</h2></div><button class="flecha" data-cat="todo">Ver todo →</button></div>
    ${!S.loaded?`<div class="empty">Cargando catálogo…</div>`:feat.length?`<div class="grid">${feat.map(card).join("")}</div>`:ps.length?`<div class="grid">${ps.slice(0,8).map(card).join("")}</div>`:emptyCatalog()}
  </div></section>
  <section class="oscura sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Cómo comprar</p><h2 class="display h-xl">Tu pedido en 3 pasos</h2></div><p>Compras desde el celular y nosotros preparamos todo en la tienda.</p></div>
    <ol class="pasos"><li class="paso"><span class="paso__num c0">1</span><h3>Elige</h3><p>Busca por categoría${S.ai?" o pregúntale al Don qué le conviene a tu mascota":""}.</p></li>
    <li class="paso"><span class="paso__num c1">2</span><h3>Paga seguro</h3><p>${payTxt.length?esc(payTxt.join(", ").replace(/, ([^,]*)$/," o $1").replace(/^./,c=>c.toUpperCase()))+".":"Pago seguro."} Ves el stock real antes de pagar.</p></li>
    <li class="paso"><span class="paso__num c2">3</span><h3>Recibe en ${S.config.slaHours} h</h3><p>Preparamos tu pedido en menos de ${S.config.slaHours} horas para despacho o retiro en tienda.</p></li></ol>
  </div><div class="paws" aria-hidden="true">${paws(12)}</div></section>
  ${deals.length?`<section class="sec"><div class="wrap"><div class="cabecera"><div><p class="kicker">Precios especiales</p><h2 class="display h-xl">Ofertas del Don</h2></div></div><div class="grid">${deals.map(card).join("")}</div></div></section>`:""}
  <section class="sec madera"><div class="wrap bio">
    <img src="/img/muro.webp" alt="Muro negro con el logo de Don Dog y el mesón de la tienda" loading="lazy">
    <div class="bio__txt"><p class="kicker">Nosotros</p><h2 class="display h-xl">Un pet shop de barrio con estilo</h2>
      <p class="destacado">En Don Dog elegimos cada producto como si fuera para nuestros propios perros y gatos.</p>
      <p>Estamos en el centro comercial Lo Castillo, en Vitacura. Pasa a conocer la tienda, pide consejo o retira tu compra online sin costo.</p>
      <ul class="chips-l"><li>Alimentos premium</li><li>Accesorios</li><li>Cosmética</li><li>Retiro en tienda</li><li>Despacho ${S.config.slaHours} h</li></ul>
      <p class="firma display">Don Dog<small>Candelaria Goyenechea 3820, local 165</small></p></div>
  </div></section>
  <section class="redes-panel"><div class="wrap">
    <a href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener">${IG}<strong>Instagram</strong><span>@dondog.cl</span></a>
    <button data-cat="todo">${icon("M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2")}<strong>Tienda online</strong><span>Stock en vivo</span></button>
    <div>${icon("M4 10l8-6 8 6v10H4zM10 20v-6h4v6")}<strong>Retiro gratis</strong><span>Lo Castillo, Vitacura</span></div>
    <div>${icon("M3 7h11v9H3zM14 10h4l3 3v3h-7")}<strong>Despacho ${S.config.slaHours} h</strong><span>Gratis sobre ${clp(S.config.freeShip)}</span></div>
  </div></section>
  <section class="oscura sec"><div class="wrap contacto">
    <div><p class="kicker">${S.ai?"Asesor con IA":"El Don te asesora"}</p><h2 class="display h-xl">¿No sabes qué elegir? Pregúntale al Don</h2>
      <p class="contacto__p">${S.ai?"Cuéntale la edad, el tamaño o lo que necesita tu mascota y te recomienda productos que tenemos en stock.":"Cuéntanos la edad, el tamaño o lo que necesita tu mascota y te recomendamos lo mejor que tenemos en la tienda."}</p>
      <div class="cta-row"><button class="btn-pill acc" id="openChat2">${S.ai?"Hablar con el Don":"Escríbele al Don"}</button><a class="btn-pill line" href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener">Escríbenos por Instagram</a></div></div>
    <div class="donbox"><img class="donbox__img" src="${MASCOT}" alt="El Don, la mascota de Don Dog, en skate con sombrero y lentes" loading="lazy"><div class="chatprev"><div class="chatprev__cab"><img src="${MASCOT_SM}" alt="">El Don · asesor</div>
      <div class="msgp u">Mi bulldog francés se pone nervioso con los fuegos artificiales</div>
      <div class="msgp b">Para esas noches te sirve el collar calmante con feromonas. Póntelo unos días antes y dura hasta 4 semanas.</div>
      <div class="chipsp"><span>Cachorros</span><span>Gatos</span><span>Piel sensible</span></div></div></div>
  </div></section>
  <section class="sec" id="contacto"><div class="wrap contacto">
    <div><p class="kicker">Contacto</p><h2 class="display h-xl">¿Tienes una duda? Escríbenos</h2>
      <p class="contacto__p">Te respondemos por correo dentro del día hábil. También puedes visitarnos en Candelaria Goyenechea 3820, local 165, Lo Castillo, Vitacura${S.store.hours?` (${esc(S.store.hours)})`:""}.</p>
      <div class="cta-row"><button class="btn-pill line" data-goto="seguimiento">Seguir mi pedido</button><a class="btn-pill line" href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener">Instagram</a></div></div>
    <form class="panel" id="contactForm" novalidate>
      <div class="form">
        <label>Nombre<input name="name" type="text" required autocomplete="name"></label>
        <label>Correo<input name="email" type="email" required autocomplete="email"></label>
        <label class="full">Teléfono (opcional)<input name="phone" type="tel" autocomplete="tel"></label>
        <label class="full">Mensaje<textarea name="message" rows="4" required></textarea></label>
        <input name="website" type="text" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px" aria-hidden="true">
      </div>
      <div class="err" id="ctErr"></div>
      <button class="cta wide" id="ctSend">Enviar mensaje</button>
    </form>
  </div></section>`;
  $("#openChat2").onclick=openDon;
  $("#contactForm").onsubmit=sendContact;
}
async function sendContact(e){
  e.preventDefault();const f=e.target,btn=$("#ctSend"),err=$("#ctErr");err.textContent="";
  const body=Object.fromEntries(new FormData(f));
  if(!body.name.trim()||!/\S+@\S+\.\S+/.test(body.email)||body.message.trim().length<5){err.textContent="Completa nombre, correo y mensaje.";return}
  btn.disabled=true;btn.textContent="Enviando…";
  try{await api("/api/contact",{method:"POST",body});f.outerHTML=`<div class="ok-box"><b>¡Mensaje enviado!</b><br>Te respondemos a ${esc(body.email)} a la brevedad.</div>`}
  catch(ex){err.textContent=ex.message;btn.disabled=false;btn.textContent="Enviar mensaje"}
}
function filtered(){
  let ps=active();
  if(S.cat&&S.cat.startsWith("g:")){const it=groupById[S.cat.slice(2)].items;ps=ps.filter(p=>it.includes(p.category))}
  else if(S.cat&&S.cat!=="todo")ps=ps.filter(p=>p.category===S.cat);
  if(S.deals)ps=ps.filter(p=>p.oldPrice>p.price);
  if(S.pet)ps=ps.filter(p=>p.pet===S.pet||p.pet==="todos");
  if(S.q){const t=S.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");ps=ps.filter(p=>(p.name+" "+(p.brand||"")+" "+(p.tags||[]).join(" ")+" "+(catById[p.category]?.name||"")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(t))}
  const by={featured:(a,b)=>(b.featured?1:0)-(a.featured?1:0)||a.name.localeCompare(b.name),asc:(a,b)=>a.price-b.price,desc:(a,b)=>b.price-a.price,stock:(a,b)=>b.stock-a.stock};
  return ps.slice().sort(by[S.sort]);
}
function renderCatalog(){
  const ps=filtered(),title=S.q?`“${S.q}”`:S.deals?"Ofertas":S.cat&&S.cat.startsWith("g:")?groupById[S.cat.slice(2)].name:((S.cat&&S.cat!=="todo"?catById[S.cat].name:"")+(S.pet?(S.cat&&S.cat!=="todo"?" para ":"")+PETS.find(p=>p.id===S.pet).name.toLowerCase():"")||"Todos los productos").replace(/^./,c=>c.toUpperCase());
  $("#main").innerHTML=`<section class="block wrap">
   <div class="shead"><div><p class="eyebrow">${S.q?"Resultados de búsqueda":"Catálogo"}</p><h2 class="display">${esc(title)}</h2></div></div>
   <div class="catalog"><aside class="filters">
     <div class="fgroup"><span class="eyebrow">Categoría</span><div class="chips">${[["todo","Todo"],...CATS.map(c=>[c.id,c.name])].map(([id,n])=>`<button class="chip ${(S.cat||"todo")===id?"on":""}" data-fcat="${id}">${esc(n)}</button>`).join("")}</div></div>
     <div class="fgroup"><span class="eyebrow">Mascota</span><div class="chips"><button class="chip ${!S.pet?"on":""}" data-fpet="">Todas</button>${PETS.map(p=>`<button class="chip ${S.pet===p.id?"on":""}" data-fpet="${p.id}">${p.name}</button>`).join("")}</div></div>
   </aside><div style="min-width:0">
     <div class="toolbar"><span class="note num">${ps.length} producto${ps.length===1?"":"s"}</span>
     <label class="note" style="display:flex;gap:8px;align-items:center">Ordenar <select id="sort" style="width:auto"><option value="featured">Destacados</option><option value="asc">Menor precio</option><option value="desc">Mayor precio</option><option value="stock">Más stock</option></select></label></div>
     ${ps.length?`<div class="grid">${ps.map(card).join("")}</div>`:S.products.length?`<div class="empty"><b>Sin resultados</b>Prueba otra palabra${S.ai?" o pregúntale al Don":""}.</div>`:emptyCatalog()}
   </div></div></section>`;
  $("#sort").value=S.sort;
}
function render(){renderNav();if(S.view==="catalog")renderCatalog();else renderHome();updateCartBadge()}
function go(view,opts={}){Object.assign(S,{view},opts);render();window.scrollTo({top:0})}

document.addEventListener("click",e=>{
  const t=e.target.closest("[data-nav],[data-cat],[data-pet],[data-fcat],[data-fpet],[data-add],[data-open],[data-goto]");if(!t)return;
  if(t.dataset.nav!==undefined){const [c,p,d]=t.dataset.nav.split("|");navOpen=null;S.q="";$("#q").value="";go("catalog",{cat:c||"todo",pet:p||null,deals:!!d});return}
  if(t.dataset.goto!==undefined){e.preventDefault();openPage(t.dataset.goto);return}
  if(t.dataset.cat!==undefined){S.q="";$("#q").value="";closeLayer();go("catalog",{cat:t.dataset.cat,pet:null,deals:false})}
  else if(t.dataset.pet!==undefined){S.q="";$("#q").value="";go("catalog",{pet:t.dataset.pet,cat:"todo",deals:false})}
  else if(t.dataset.fcat!==undefined){S.cat=t.dataset.fcat;S.deals=false;render()}
  else if(t.dataset.fpet!==undefined){S.pet=t.dataset.fpet||null;render()}
  else if(t.dataset.add!==undefined){addToCart(t.dataset.add,1)}
  else if(t.dataset.open!==undefined){e.preventDefault();openProduct(t.dataset.open)}
});
document.addEventListener("change",e=>{if(e.target.id==="sort"){S.sort=e.target.value;render()}});
$("#goHome").onclick=()=>{S.q="";$("#q").value="";closeLayer();go("home",{cat:null,pet:null,deals:false})};
$("#searchForm").onsubmit=e=>{e.preventDefault();S.q=$("#q").value.trim();go("catalog",{cat:"todo",pet:null,deals:false})};

/* ---------- LAYER (modales y cajones) ---------- */
function setPath(p){if(location.pathname+location.search!==p)history.replaceState(null,"",p)}
function closeLayer(){$("#layer").innerHTML="";if(location.pathname!=="/"||location.search)setPath("/")}
$("#layer").addEventListener("click",e=>{if(e.target.closest("[data-close]"))closeLayer()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#layer").innerHTML)closeLayer()});
function drawer(title,body,label){$("#layer").innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="${esc(label||title)}"><div class="dhead"><h2 class="display">${title}</h2><button class="x" data-close aria-label="Cerrar">✕</button></div>${body}</aside>`}

/* ---------- PRODUCT MODAL ---------- */
function openProduct(id){
  const p=prod(id);if(!p)return;const n=p.stock;
  setPath("/producto/"+p.slug);document.title=`${p.name} | Don Dog`;
  $("#layer").innerHTML=`<div class="scrim" data-close></div><div class="modal"><div class="box" role="dialog" aria-label="${esc(p.name)}">
   <div class="ph">${phHTML(p)}</div>
   <div class="info"><div class="row"><span class="eyebrow">${esc(p.brand||"")} · ${esc(catById[p.category]?.name||"")}</span><button class="x" data-close aria-label="Cerrar">✕</button></div>
   <h2>${esc(p.name)}</h2>
   <div class="price"><b style="font-size:26px">${clp(p.price)}</b>${p.oldPrice>p.price?`<s>${clp(p.oldPrice)}</s>`:""}</div>
   ${availHTML(id)}
   <p style="margin:0;white-space:pre-line">${esc(p.description||"")}</p>
   ${(p.tags||[]).length?`<div class="chips">${p.tags.map(t=>`<span class="pill mut">${esc(t)}</span>`).join("")}</div>`:""}
   <div class="bar" style="margin-top:auto"><div class="qty"><button id="mMinus" aria-label="Menos">−</button><span id="mQ" class="num">1</span><button id="mPlus" aria-label="Más">+</button></div>
   <button class="cta" id="mAdd" ${n<=0?"disabled":""}>${n<=0?"Agotado":"Agregar al carrito"}</button></div>
   <p class="note" style="margin:0">Pedido preparado y despachado dentro de ${S.config.slaHours} h.</p></div></div></div>`;
  let q=1;const upd=()=>$("#mQ").textContent=q;
  $("#mMinus").onclick=()=>{q=Math.max(1,q-1);upd()};$("#mPlus").onclick=()=>{q=Math.min(Math.max(1,n),q+1);upd()};
  $("#mAdd").onclick=()=>{addToCart(id,q);closeLayer()};
}

/* ---------- CART ---------- */
function cartItems(){return Object.entries(S.cart).map(([id,q])=>({p:prod(id),q})).filter(x=>x.p)}
function cartTotals(delivery){const sub=cartItems().reduce((s,x)=>s+x.p.price*x.q,0);const ship=delivery==="retiro"||sub>=S.config.freeShip||sub===0?0:S.config.shipCost;return{sub,ship,total:sub+ship}}
function saveCart(){lsSet("dd_cart",S.cart);updateCartBadge()}
function updateCartBadge(){const n=cartItems().reduce((a,x)=>a+x.q,0);const b=$("#cartCount");b.textContent=n;b.hidden=!n}
function addToCart(id,q){const have=S.cart[id]||0,max=stockOf(id);if(have+q>max){toast(max?`Solo quedan ${max} unidades`:"Producto sin stock");S.cart[id]=Math.min(max,have+q)||undefined;if(!S.cart[id])delete S.cart[id];saveCart();return}S.cart[id]=have+q;saveCart();toast("Agregado al carrito")}
// Ajusta el carrito si el stock bajó desde la última visita.
function fitCart(){let changed=false;for(const [id,q] of Object.entries(S.cart)){const p=prod(id);if(!p||p.stock<=0){delete S.cart[id];changed=true}else if(q>p.stock){S.cart[id]=p.stock;changed=true}}if(changed)saveCart();return changed}
$("#cartBtn").onclick=()=>openCart();
function openCart(){
  const items=cartItems(),t=cartTotals("despacho");
  drawer("Tu carrito",`<div class="dbody">${items.length?items.map(({p,q})=>`<div class="line"><div class="thumb">${phHTML(p)}</div>
     <div style="min-width:0"><div style="font-weight:600;line-height:1.3">${esc(p.name)}</div><div class="note num">${clp(p.price)} c/u · stock ${p.stock}</div>
     <div class="qty" style="margin-top:6px"><button data-cq="${p.id}" data-d="-1" aria-label="Menos">−</button><span class="num">${q}</span><button data-cq="${p.id}" data-d="1" aria-label="Más">+</button></div></div>
     <b class="num">${clp(p.price*q)}</b></div>`).join(""):`<div class="empty"><img class="empty__don" src="${MASCOT}" alt=""><b>Tu carrito está vacío</b>El Don te espera en el catálogo.</div>`}</div>
   ${items.length?`<div class="dfoot"><div class="row"><span>Subtotal</span><b class="num">${clp(t.sub)}</b></div>
     <div class="note">${t.sub>=S.config.freeShip?"Tienes despacho gratis.":`Te faltan ${clp(S.config.freeShip-t.sub)} para despacho gratis.`}</div>
     <button class="cta wide" id="toCheckout">Ir a pagar</button></div>`:""}`,"Carrito");
  $("#layer").querySelectorAll("[data-cq]").forEach(b=>b.onclick=()=>{const id=b.dataset.cq,q=(S.cart[id]||0)+ +b.dataset.d;if(q<=0)delete S.cart[id];else if(q>stockOf(id)){toast("No hay más stock");return}else S.cart[id]=q;saveCart();openCart()});
  const c=$("#toCheckout");if(c)c.onclick=openCheckout;
}
function openCheckout(){
  const saved=lsGet("dd_customer",{}),pm=S.payments;
  const opts=[pm.webpay&&["webpay","Webpay · débito, crédito y prepago"],pm.mercadopago&&["mercadopago","Mercado Pago"],pm.transferencia&&["transferencia","Transferencia bancaria"]].filter(Boolean);
  if(!opts.length){toast("Los pagos online no están disponibles en este momento.");return}
  drawer("Finalizar compra",`<form class="dbody" id="coForm" novalidate>
    <div class="form">
     <label class="full">Nombre y apellido<input id="cName" type="text" required autocomplete="name" value="${esc(saved.name||"")}"></label>
     <label>Correo<input id="cEmail" type="email" required autocomplete="email" value="${esc(saved.email||"")}"></label>
     <label>Teléfono<input id="cPhone" type="tel" required autocomplete="tel" placeholder="+56 9…" value="${esc(saved.phone||"")}"></label>
     <label class="full">RUT (opcional, para boleta)<input id="cRut" type="text" placeholder="12.345.678-9" value="${esc(saved.rut||"")}"></label>
    </div>
    <span class="eyebrow">Entrega</span>
    <div class="pay"><label><input type="radio" name="dlv" value="despacho" checked> Despacho a domicilio (${S.config.slaHours} h)</label><label><input type="radio" name="dlv" value="retiro"> Retiro en tienda, Lo Castillo · gratis</label></div>
    <div class="form" id="addrBox"><label class="full">Dirección (calle, número, depto)<input id="cAddr" type="text" autocomplete="street-address" value="${esc(saved.addr||"")}"></label><label class="full">Comuna<input id="cComuna" type="text" autocomplete="address-level2" value="${esc(saved.comuna||"")}"></label>
      ${S.config.shipComunas?`<p class="note full" style="margin:0">Despachamos a: ${esc(S.config.shipComunas)}.</p>`:""}
      <label class="full">Indicaciones (opcional)<input id="cNotes" type="text" placeholder="Conserjería, horario, referencia…"></label></div>
    <span class="eyebrow">Medio de pago</span>
    <div class="pay">${opts.map(([v,n],i)=>`<label><input type="radio" name="pay" value="${v}" ${i?"":"checked"}> ${n}</label>`).join("")}</div>
    <div id="coTot"></div>
    <label class="check" style="font-weight:500;font-size:13px"><input id="cTerms" type="checkbox"> <span>Acepto los <a href="/terminos" data-goto="terminos" target="_blank">términos y condiciones</a> y la <a href="/privacidad" data-goto="privacidad" target="_blank">política de privacidad</a>.</span></label>
    ${pm.testMode?`<p class="note" style="margin:0">Webpay está en <b>modo de pruebas</b>: no se cobra dinero real.</p>`:""}
    <div class="err" id="coErr" role="alert"></div>
    <button class="cta wide" id="coPay">Pagar</button>
   </form>`,"Pago");
  const tot=()=>{const d=document.querySelector("input[name=dlv]:checked").value,pay=document.querySelector("input[name=pay]:checked").value,t=cartTotals(d);$("#addrBox").hidden=d==="retiro";$("#coTot").innerHTML=`<div class="row"><span>Subtotal</span><span class="num">${clp(t.sub)}</span></div><div class="row"><span>Despacho</span><span class="num">${t.ship?clp(t.ship):"Gratis"}</span></div><div class="row total"><span>Total</span><span class="num">${clp(t.total)}</span></div>`;$("#coPay").textContent=(pay==="transferencia"?"Reservar pedido ":"Pagar ")+clp(t.total)};
  $("#coForm").addEventListener("change",tot);tot();
  $("#coForm").onsubmit=async e=>{e.preventDefault();await placeOrder()};
}
async function placeOrder(){
  const err=$("#coErr"),btn=$("#coPay");err.textContent="";
  const dlv=document.querySelector("input[name=dlv]:checked").value,pay=document.querySelector("input[name=pay]:checked").value;
  const c={name:$("#cName").value.trim(),email:$("#cEmail").value.trim(),phone:$("#cPhone").value.trim(),rut:$("#cRut").value.trim(),addr:$("#cAddr").value.trim(),comuna:$("#cComuna").value.trim(),notes:$("#cNotes").value.trim()};
  if(!c.name||!/\S+@\S+\.\S+/.test(c.email)||!c.phone){err.textContent="Completa nombre, un correo válido y teléfono.";return}
  if(dlv==="despacho"&&(!c.addr||!c.comuna)){err.textContent="Para despacho necesitamos dirección y comuna.";return}
  if(!$("#cTerms").checked){err.textContent="Debes aceptar los términos y condiciones.";return}
  const items=cartItems().map(({p,q})=>({id:p.id,qty:q}));
  btn.disabled=true;btn.textContent=pay==="transferencia"?"Reservando…":"Conectando con el pago…";
  const {notes,...keep}=c;lsSet("dd_customer",keep);
  try{
    const r=await api("/api/orders",{method:"POST",body:{items,customer:c,delivery:dlv,payment:pay}});
    rememberOrder(r.order.id,r.key);
    S.cart={};saveCart();
    if(r.pay.type==="form"){const f=document.createElement("form");f.method="POST";f.action=r.pay.url;for(const [k,v] of Object.entries(r.pay.fields)){const i=document.createElement("input");i.type="hidden";i.name=k;i.value=v;f.appendChild(i)}document.body.appendChild(f);f.submit();return}
    if(r.pay.type==="redirect"){location.href=r.pay.url;return}
    showOrder(r.order,r.key,"transferencia");loadCatalog();
  }catch(ex){err.textContent=ex.message;btn.disabled=false;btn.textContent="Reintentar";if(ex.status===409)loadCatalog().then(()=>{if(fitCart())toast("Ajustamos tu carrito al stock disponible")})}
}
function rememberOrder(id,key){const l=lsGet("dd_orders",[]).filter(o=>o.id!==id);l.unshift({id,key,at:Date.now()});lsSet("dd_orders",l.slice(0,10))}

/* ---------- ESTADO DEL PEDIDO ---------- */
function transferHTML(o){const t=o.transfer;if(!t)return "";
  return `<div class="panel" style="background:var(--accent-soft);border-color:transparent"><b>Transfiere ${clp(o.total)} para confirmar</b>
   <div class="note" style="color:var(--ink);line-height:1.7">Titular: <b>${esc(t.holder)}</b><br>RUT: <b>${esc(t.rut)}</b><br>Banco: <b>${esc(t.bank)}</b><br>Cuenta: <b>${esc(t.accountType)} N° ${esc(t.accountNumber)}</b>${t.email?`<br>Comprobante a: <b>${esc(t.email)}</b>`:""}<br>Comentario: <b class="mono">${esc(o.id)}</b></div>
   <span class="note" style="color:var(--ink)">Reservamos tus productos por ${t.hoursToPay} horas${o.holdUntil?` (hasta el ${esc(fecha(o.holdUntil))})`:""}. Te enviamos estos datos por correo.</span></div>`}
function stepsHTML(o){
  if(o.status==="cancelado")return `<div class="panel" style="background:var(--bad-soft);border-color:transparent"><b>Pedido cancelado</b><span class="note" style="color:var(--ink)">${o.paymentStatus==="expirado"?"La reserva venció sin pago.":o.paymentStatus==="rechazado"?"El pago no se completó.":"Si tienes dudas, escríbenos."}</span></div>`;
  const flow=["pendiente_pago","nuevo","preparando","listo",o.delivery==="retiro"?"retirado":"enviado"].concat(o.delivery==="retiro"?[]:["entregado"]);
  const idx=flow.indexOf(o.status);
  return `<ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px">${flow.map((s,i)=>`<li style="display:flex;gap:10px;align-items:center;${i>idx?"opacity:.45":""}"><span class="pill ${i<idx?"ok":i===idx?"warn":"mut"}" style="min-width:26px;text-align:center">${i<idx?"✓":i+1}</span>${esc(s==="listo"&&o.delivery==="retiro"?"Listo para retirar":STATUS_NAMES[s])}</li>`).join("")}</ol>`;
}
function showOrder(o,key,banner){
  const head={ok:`<div class="ok-box"><b>¡Pago aprobado!</b><br>Te enviamos la confirmación a ${esc(o.customer.email)}.</div>`,
    rechazado:`<div class="panel" style="background:var(--bad-soft);border-color:transparent"><b>El pago no se completó</b><span class="note" style="color:var(--ink)">No se hizo ningún cargo. Tus productos volvieron al catálogo; puedes intentar de nuevo.</span></div>`,
    pendiente:`<div class="panel" style="background:var(--warn-soft);border-color:transparent"><b>Pago en revisión</b><span class="note" style="color:var(--ink)">Mercado Pago está procesando tu pago. Te avisamos por correo apenas se confirme.</span></div>`,
    transferencia:`<div class="ok-box"><b>¡Pedido reservado!</b><br>Solo falta tu transferencia.</div>`}[banner]||"";
  setPath(`/?pedido=${encodeURIComponent(o.id)}&k=${encodeURIComponent(key)}`);
  drawer(`Pedido <span class="mono" style="font-size:.8em">${esc(o.id)}</span>`,`<div class="dbody">
    ${banner==="ok"||banner==="transferencia"?`<img class="empty__don" style="align-self:center" src="${MASCOT}" alt="">`:""}${head}
    ${transferHTML(o)}
    ${o.paymentStatus==="pagado"&&o.status!=="cancelado"?`<div class="note">Lo preparamos antes del <b>${esc(fecha(o.deadline))}</b>.${o.tracking?`<br>Seguimiento: <b>${esc(o.tracking)}</b>`:""}</div>`:""}
    ${stepsHTML(o)}
    <span class="eyebrow">Detalle</span>
    ${o.items.map(i=>`<div class="row"><span>${i.qty} × ${esc(i.name)}</span><span class="num">${clp(i.qty*i.price)}</span></div>`).join("")}
    <div class="row"><span>${o.delivery==="retiro"?"Retiro en tienda":"Despacho"}</span><span class="num">${o.shipping?clp(o.shipping):"Gratis"}</span></div>
    <div class="row total"><span>Total</span><span class="num">${clp(o.total)}</span></div>
    <div class="note">${o.delivery==="retiro"?"Retiro en Candelaria Goyenechea 3820, local 165, Vitacura.":`Despacho a ${esc(o.customer.addr)}, ${esc(o.customer.comuna)}.`}<br>Pago: ${esc(PAY_NAMES[o.payment]||o.payment)}${o.cardLast4?` · tarjeta terminada en ${esc(o.cardLast4)}`:""}${o.authorizationCode?` · autorización ${esc(o.authorizationCode)}`:""}</div>
    <button class="cta wide" data-close>Seguir comprando</button></div>`,"Pedido");
}
async function openOrder(id,key,banner){try{const r=await api(`/api/orders/${encodeURIComponent(id)}?k=${encodeURIComponent(key)}`);showOrder(r.order,key,banner)}catch(e){toast(e.message)}}
function openTracking(){
  const mine=lsGet("dd_orders",[]);
  setPath("/seguimiento");
  drawer("Seguir mi pedido",`<form class="dbody" id="trkForm" novalidate>
    <p class="note" style="margin:0">Ingresa el número de pedido (DD-…) y el correo con que compraste.</p>
    <div class="form"><label class="full">N° de pedido<input id="tId" type="text" placeholder="DD-ABC123" autocapitalize="characters"></label><label class="full">Correo<input id="tEmail" type="email" autocomplete="email" value="${esc(lsGet("dd_customer",{}).email||"")}"></label></div>
    <div class="err" id="tErr"></div><button class="cta wide">Buscar pedido</button>
    ${mine.length?`<span class="eyebrow" style="margin-top:12px">Pedidos en este dispositivo</span>${mine.map(o=>`<button type="button" class="btn" data-mine="${esc(o.id)}|${esc(o.key)}" style="justify-content:space-between;display:flex"><span class="mono">${esc(o.id)}</span><span class="note">${new Date(o.at).toLocaleDateString("es-CL")}</span></button>`).join("")}`:""}
  </form>`);
  $("#trkForm").onsubmit=async e=>{e.preventDefault();$("#tErr").textContent="";try{const r=await api("/api/orders/lookup",{method:"POST",body:{id:$("#tId").value,email:$("#tEmail").value}});rememberOrder(r.order.id,r.key);showOrder(r.order,r.key)}catch(ex){$("#tErr").textContent=ex.message}};
  document.querySelectorAll("[data-mine]").forEach(b=>b.onclick=()=>{const [id,k]=b.dataset.mine.split("|");openOrder(id,k)});
}

/* ---------- PÁGINAS LEGALES ---------- */
const LEGAL={
 terminos:["Términos y condiciones",()=>`
  <p>Estos términos regulan las compras en la tienda online de Don Dog (en adelante, “la tienda”), ubicada en Candelaria Goyenechea 3820, local 165, Vitacura, Santiago. Al comprar aceptas estas condiciones, que se rigen por la Ley N° 19.496 sobre Protección de los Derechos de los Consumidores.</p>
  <h3>Precios y stock</h3><p>Los precios están en pesos chilenos e incluyen IVA. El stock que ves es el disponible en tienda en ese momento; al pagar reservamos tus productos. Si por un error excepcional no pudiéramos entregar un producto, te devolvemos el 100% de lo pagado por él.</p>
  <h3>Medios de pago</h3><p>Aceptamos ${[S.payments.webpay&&"Webpay (tarjetas de débito, crédito y prepago)",S.payments.mercadopago&&"Mercado Pago",S.payments.transferencia&&"transferencia bancaria"].filter(Boolean).join(", ")}. Los pagos con tarjeta se procesan en las plataformas de cada proveedor; la tienda no almacena datos de tarjetas. Las transferencias deben realizarse dentro del plazo indicado o el pedido se anula automáticamente.</p>
  <h3>Despacho y retiro</h3><p>Preparamos los pedidos dentro de ${S.config.slaHours} horas desde la confirmación del pago. El despacho tiene un costo de ${clp(S.config.shipCost)} y es gratis en compras desde ${clp(S.config.freeShip)}${S.config.shipComunas?`; por ahora despachamos a ${esc(S.config.shipComunas)}`:""}. El retiro en tienda es gratuito; te avisamos por correo cuando tu pedido esté listo.</p>
  <h3>Derecho a retracto, cambios y devoluciones</h3><p>Revisa nuestra <a href="/devoluciones" data-goto="devoluciones">política de cambios y devoluciones</a>.</p>
  <h3>Contacto</h3><p>Para cualquier consulta o reclamo escríbenos desde el <a href="/#contacto" data-close>formulario de contacto</a> o por Instagram @dondog.cl.</p>`],
 devoluciones:["Cambios y devoluciones",()=>`
  <p><b>Derecho a retracto:</b> según el artículo 3 bis de la Ley N° 19.496, tienes 10 días desde que recibes el producto para retractarte de una compra online, siempre que el producto esté sin uso, con su embalaje original y sellos intactos. Te devolvemos el dinero dentro de 10 días por el mismo medio de pago.</p>
  <p><b>Excepciones:</b> por razones de higiene y seguridad no aplican retracto los alimentos, snacks, productos de higiene y cosmética abiertos o sin sello, ni los productos hechos a medida.</p>
  <p><b>Garantía legal:</b> si un producto presenta fallas de fabricación, puedes elegir cambio, reparación o devolución del dinero dentro de los 6 meses siguientes a la compra.</p>
  <p><b>Cómo hacerlo:</b> escríbenos por el formulario de contacto con tu número de pedido. Puedes llevar el producto a la tienda en Lo Castillo, Vitacura; si fue por falla, el retiro a domicilio corre por nuestra cuenta.</p>`],
 privacidad:["Política de privacidad",()=>`
  <p>En Don Dog tratamos tus datos personales conforme a la Ley N° 19.628 sobre Protección de la Vida Privada.</p>
  <h3>Qué datos usamos</h3><p>Nombre, correo, teléfono, RUT (opcional) y dirección de despacho, solo para procesar y entregar tu pedido, emitir tu boleta y responder tus consultas.</p>
  <h3>Con quién los compartimos</h3><p>Únicamente con quienes son necesarios para tu compra: el procesador de pago que elijas (Transbank o Mercado Pago) y, si corresponde, el servicio de despacho. No vendemos ni cedemos tus datos.</p>
  <h3>Datos de pago</h3><p>No almacenamos datos de tarjetas. El pago se realiza en las plataformas seguras de Transbank o Mercado Pago.</p>
  <h3>Tus derechos</h3><p>Puedes pedir acceso, corrección o eliminación de tus datos escribiéndonos por el formulario de contacto.</p>
  <h3>Navegador</h3><p>Guardamos tu carrito y tus datos de compra en tu propio navegador (almacenamiento local) para que no tengas que escribirlos de nuevo. No usamos cookies de publicidad.</p>`]
};
function openLegal(k){const [t,f]=LEGAL[k];setPath("/"+k);drawer(esc(t),`<div class="dbody legal">${f()}<p class="note">Última actualización: ${new Date().getFullYear()}.</p></div>`)}
function openPage(k){if(k==="seguimiento")openTracking();else if(LEGAL[k])openLegal(k);else if(k==="admin")openAdmin();else if(k==="contacto"){closeLayer();go("home");setTimeout(()=>$("#contacto")?.scrollIntoView({behavior:"smooth"}),50)}}

/* ---------- AI ASSISTANT (cliente) ---------- */
// El Don siempre está visible: con IA abre el chat; sin IA lleva al formulario de contacto.
function openDon(){if(!S.ai){openPage("contacto");return}$("#chat").hidden=false;$("#chatIn").focus()}
$("#fab").onclick=()=>{if(S.ai&&!$("#chat").hidden){$("#chat").hidden=true;return}openDon()};
$("#chatX").onclick=()=>$("#chat").hidden=true;
const chatHist=[];
$("#chatForm").onsubmit=async e=>{
  e.preventDefault();const q=$("#chatIn").value.trim();if(!q)return;$("#chatIn").value="";
  const msgs=$("#msgs");msgs.insertAdjacentHTML("beforeend",`<div class="bubble me">${esc(q)}</div>`);
  const b=document.createElement("div");b.className="bubble don";b.textContent="Pensando…";msgs.appendChild(b);msgs.scrollTop=msgs.scrollHeight;
  chatHist.push({role:"user",text:q});
  try{
    const r=await api("/api/ai/chat",{method:"POST",body:{history:chatHist.slice(-8)}});
    b.textContent=r.reply||"";chatHist.push({role:"assistant",text:r.reply||""});
    (r.ids||[]).map(prod).filter(Boolean).forEach(p=>{const m=document.createElement("button");m.className="mini";m.innerHTML=`${phHTML(p)}<span style="flex:1;min-width:0"><b style="display:block;font-size:13px">${esc(p.name)}</b><span class="note num">${clp(p.price)}</span></span>`;m.onclick=()=>openProduct(p.id);msgs.appendChild(m)});
  }catch(ex){chatHist.pop();b.textContent=ex.message}
  msgs.scrollTop=msgs.scrollHeight;
};

/* ---------- ADMIN ---------- */
$("#adminBtn").onclick=()=>openAdmin();
async function openAdmin(){
  if(!S.admin){
    try{const r=await api("/api/admin/me");S.admin=r.admin;S.sysStatus=r.status}catch(e){return openLogin()}
  }
  $("#adminBtn").hidden=false;closeLayer();setPath("/admin");
  let a=$("#admin");if(!a){a=document.createElement("div");a.id="admin";a.className="admin";document.body.appendChild(a)}a.hidden=false;
  await refreshAdmin();
}
async function openLogin(){
  setPath("/admin");
  let st={};try{st=await api("/api/admin/setup")}catch(e){}
  if(st.needed)return openSetup(st.enabled);
  drawer("Acceso dueño",`<form class="dbody" id="loginForm" novalidate>
    <img src="${LOGO}" alt="" style="width:72px;align-self:center">
    <div class="form"><label class="full">Correo<input id="lEmail" type="email" autocomplete="username" required></label><label class="full">Contraseña<input id="lPass" type="password" autocomplete="current-password" required></label></div>
    <div class="err" id="lErr" role="alert"></div><button class="cta wide" id="lBtn">Entrar al panel</button></form>`);
  $("#lEmail").focus();
  $("#loginForm").onsubmit=async e=>{e.preventDefault();const btn=$("#lBtn");btn.disabled=true;$("#lErr").textContent="";
    try{const r=await api("/api/admin/login",{method:"POST",body:{email:$("#lEmail").value,password:$("#lPass").value}});S.admin=r.admin;openAdmin()}
    catch(ex){$("#lErr").textContent=ex.message;btn.disabled=false}};
}
// Primer ingreso: crear la cuenta del dueño (solo funciona si aún no hay administradores).
function openSetup(enabled){
  drawer("Crear cuenta del dueño",enabled?`<form class="dbody" id="setupForm" novalidate>
    <img src="${LOGO}" alt="" style="width:72px;align-self:center">
    <p class="note" style="margin:0">Es el primer ingreso al panel. Crea tu cuenta de administrador. La <b>clave de activación</b> es la que pusiste en Vercel como <span class="mono">ADMIN_SETUP_KEY</span>.</p>
    <div class="form"><label class="full">Clave de activación<input id="sKey" type="password" autocomplete="off"></label>
    <label class="full">Tu nombre<input id="sName" type="text" autocomplete="name"></label>
    <label class="full">Correo<input id="sEmail" type="email" autocomplete="username"></label>
    <label class="full">Contraseña (mín. 10 caracteres)<input id="sPass" type="password" autocomplete="new-password"></label>
    <label class="full">Repite la contraseña<input id="sPass2" type="password" autocomplete="new-password"></label></div>
    <div class="err" id="sErr" role="alert"></div><button class="cta wide" id="sBtn">Crear cuenta y entrar</button></form>`
   :`<div class="dbody"><p style="margin:0">Todavía no hay una cuenta de administrador.</p><p class="note" style="margin:0">Para crearla, agrega la variable <span class="mono">ADMIN_SETUP_KEY</span> en Vercel (Settings → Environment Variables) con una clave de al menos 8 caracteres, vuelve a publicar y recarga esta página.</p></div>`);
  const f=$("#setupForm");if(!f)return;$("#sKey").focus();
  f.onsubmit=async e=>{e.preventDefault();const err=$("#sErr"),btn=$("#sBtn");err.textContent="";
    if($("#sPass").value!==$("#sPass2").value){err.textContent="Las contraseñas no coinciden.";return}
    btn.disabled=true;
    try{const r=await api("/api/admin/setup",{method:"POST",body:{key:$("#sKey").value,name:$("#sName").value,email:$("#sEmail").value,password:$("#sPass").value}});S.admin=r.admin;toast("Cuenta creada");openAdmin()}
    catch(ex){err.textContent=ex.message;btn.disabled=false}};
}
function closeAdmin(){const a=$("#admin");if(a)a.hidden=true;setPath("/");loadCatalog()}
async function refreshAdmin(){
  try{
    const [o,p]=await Promise.all([api("/api/admin/orders?days=365"),api("/api/admin/products")]);
    S.orders=o.orders;S.adminProducts=p.products;
  }catch(e){if(e.status===401){S.admin=null;const a=$("#admin");if(a)a.hidden=true;return openLogin()}toast(e.message)}
  renderAdmin();
}
function sevOf(o){if(["enviado","entregado","retirado","cancelado"].includes(o.status))return"done";if(o.status==="pendiente_pago")return"pay";const left=o.deadline-Date.now();if(left<0)return"bad";if(left<6*3600e3)return"warn";return"ok"}
function leftTxt(ms){const neg=ms<0;ms=Math.abs(ms);const h=Math.floor(ms/3600e3),m=Math.floor(ms%3600e3/60e3);return (neg?"Atrasado ":"")+`${h} h ${String(m).padStart(2,"0")} min`}
function renderAdmin(){
  const a=$("#admin");if(!a||a.hidden)return;
  const tabs=[["vender","Vender"],["pedidos","Pedidos"],["productos","Productos"],["stock","Stock"],["ajustes","Ajustes"]];
  a.innerHTML=`<div class="abar"><img src="${LOGO}" alt=""><h2 class="display">Panel Don Dog</h2>
   <div class="tabs">${tabs.map(([id,n])=>`<button data-tab="${id}" class="${S.adminTab===id?"on":""}">${n}</button>`).join("")}</div>
   <button class="x" id="admX" aria-label="Volver a la tienda" title="Volver a la tienda">✕</button></div><div class="abody"><div class="wrap" id="abody"></div></div>`;
  a.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{S.adminTab=b.dataset.tab;renderAdmin()});
  $("#admX").onclick=closeAdmin;
  ({vender:admSell,pedidos:admOrders,productos:admProducts,stock:admStock,ajustes:admSettings})[S.adminTab]();
}
function admOrders(){
  const os=S.orders.slice().sort((a,b)=>{const order={bad:0,warn:1,ok:2,pay:3,done:4};return order[sevOf(a)]-order[sevOf(b)]||(sevOf(a)==="done"?b.createdAt-a.createdAt:a.deadline-b.deadline)});
  const open=os.filter(o=>["ok","warn","bad"].includes(sevOf(o))),late=open.filter(o=>sevOf(o)==="bad").length,soon=open.filter(o=>sevOf(o)==="warn").length,toPay=os.filter(o=>o.status==="pendiente_pago");
  const today=os.filter(o=>o.paymentStatus==="pagado"&&new Date(o.paidAt||o.createdAt).toDateString()===new Date().toDateString());
  const filt={activos:o=>sevOf(o)!=="done"&&sevOf(o)!=="pay",porpagar:o=>o.status==="pendiente_pago",tienda:o=>o.channel==="tienda",cerrados:o=>sevOf(o)==="done",todos:()=>true}[S.orderFilter];
  const sumOf=l=>l.reduce((s,o)=>s+o.total,0),todayWeb=today.filter(o=>o.channel!=="tienda"),todayStore=today.filter(o=>o.channel==="tienda");
  const list=os.filter(filt);
  $("#abody").innerHTML=`<div class="kpis">
    <div class="kpi"><span class="eyebrow">Por preparar</span><b>${open.length}</b></div>
    <div class="kpi ${late?"alert":""}"><span class="eyebrow">Atrasados (+${S.config.slaHours} h)</span><b>${late}</b></div>
    <div class="kpi"><span class="eyebrow">Vencen en &lt; 6 h</span><b>${soon}</b></div>
    <div class="kpi"><span class="eyebrow">Ventas de hoy</span><b>${clp(sumOf(today))}</b><span class="note">Web ${clp(sumOf(todayWeb))} · Tienda ${clp(sumOf(todayStore))}</span></div></div>
   <div class="bar"><div class="chips">${[["activos","Por preparar"],["porpagar",`Esperando pago (${toPay.length})`],["tienda","Ventas en tienda"],["cerrados","Cerrados"],["todos","Todos"]].map(([k,n])=>`<button class="chip ${S.orderFilter===k?"on":""}" data-of="${k}">${n}</button>`).join("")}</div>
   <a class="btn" href="/api/admin/orders.csv" style="margin-left:auto">Descargar Excel (CSV)</a><button class="btn" id="reloadO">Actualizar</button></div>
   ${list.length?list.map(o=>{const sv=sevOf(o);return `<div class="order sev-${sv==="pay"?"warn":sv}"><div style="min-width:0">
     <div class="bar"><b class="mono">${esc(o.id)}</b><span class="pill ${sv==="done"?"mut":sv==="pay"?"warn":sv}">${esc(STATUS_NAMES[o.status]||o.status)}</span><span class="pill mut">${o.channel==="tienda"?"Venta en tienda":o.delivery==="retiro"?"Retiro en tienda":"Despacho"}</span><span class="note">${new Date(o.createdAt).toLocaleString("es-CL")}</span></div>
     <div style="margin-top:6px"><b>${esc(o.customer?.name)}</b> · <a class="mono" href="tel:${esc(o.customer?.phone)}">${esc(o.customer?.phone)}</a> · <a href="mailto:${esc(o.customer?.email)}">${esc(o.customer?.email)}</a>${o.customer?.rut?` · RUT ${esc(o.customer.rut)}`:""}${o.delivery==="despacho"?`<br>${esc(o.customer?.addr)}, ${esc(o.customer?.comuna)}`:""}${o.customer?.notes?`<br><i>${esc(o.customer.notes)}</i>`:""}</div>
     <ul>${o.items.map(i=>`<li><b class="num">${i.qty}×</b> ${esc(i.name)} <span class="note num">${clp(i.price*i.qty)}</span></li>`).join("")}</ul>
     <div class="note num" style="margin-top:6px">Total ${clp(o.total)}${o.shipping?` (despacho ${clp(o.shipping)})`:""} · ${esc(PAY_NAMES[o.payment]||o.payment)} · pago ${esc(o.paymentStatus)}${o.paymentDetail?.authorizationCode?` · aut. ${esc(o.paymentDetail.authorizationCode)}`:""}${o.tracking?` · seguimiento ${esc(o.tracking)}`:""}</div>
     ${o.paymentDetail?.stockWarning?`<div class="err">${esc(o.paymentDetail.stockWarning)}</div>`:""}</div>
     <div class="side">${sv==="pay"?`<span class="eyebrow">Reserva vence</span><span class="note">${o.holdUntil?esc(new Date(o.holdUntil).toLocaleString("es-CL")):"—"}</span>${o.payment==="transferencia"?`<button class="btn acc sm" data-paid="${esc(o.id)}">Confirmar transferencia</button>`:""}<button class="btn sm" data-cancel="${esc(o.id)}">Cancelar</button>`
      :sv==="done"?`<span class="note">${o.status==="cancelado"?"Cancelado":"Cerrado"}</span>`
      :`<span class="eyebrow">Plazo de preparación</span><span class="clock" style="color:var(--${sv==="ok"?"ok":sv})">${leftTxt(o.deadline-Date.now())}</span>`}
     ${sv!=="pay"&&o.status!=="cancelado"?`<select data-status="${esc(o.id)}" style="width:auto">${["nuevo","preparando","listo",o.delivery==="retiro"?"retirado":"enviado",...(o.delivery==="retiro"?[]:["entregado"]),"cancelado"].map(s=>`<option value="${s}" ${s===o.status?"selected":""}>${esc(s==="listo"&&o.delivery==="retiro"?"Listo para retirar":STATUS_NAMES[s])}</option>`).join("")}</select>`:""}
     ${o.paymentStatus==="pagado"||o.status==="pendiente_pago"&&o.payment==="transferencia"?`<button class="btn sm" data-resend="${esc(o.id)}">Reenviar correo</button>`:""}</div></div>`}).join(""):`<div class="empty"><b>Sin pedidos aquí</b>Cuando un cliente pague, el pedido aparece con su cuenta regresiva de ${S.config.slaHours} horas y te llega un correo.</div>`}`;
  document.querySelectorAll("[data-of]").forEach(b=>b.onclick=()=>{S.orderFilter=b.dataset.of;admOrders()});
  $("#reloadO").onclick=refreshAdmin;
  document.querySelectorAll("[data-status]").forEach(s=>s.onchange=async()=>{
    const id=s.dataset.status,st=s.value;let tracking;
    if(st==="cancelado"&&!confirm(`¿Cancelar el pedido ${id}? El stock vuelve al catálogo y se avisa al cliente.`)){admOrders();return}
    if(st==="enviado")tracking=prompt("N° de seguimiento o nombre del courier (opcional):","")??undefined;
    try{const r=await api(`/api/admin/orders/${encodeURIComponent(id)}`,{method:"PATCH",body:{status:st,tracking}});replaceOrder(r.order);toast(["listo","enviado","retirado","entregado","cancelado"].includes(st)?"Estado actualizado · cliente avisado por correo":"Estado actualizado")}catch(e){toast(e.message);admOrders()}});
  document.querySelectorAll("[data-paid]").forEach(b=>b.onclick=async()=>{if(!confirm(`¿Confirmas que recibiste la transferencia del pedido ${b.dataset.paid}?`))return;b.disabled=true;try{const r=await api(`/api/admin/orders/${encodeURIComponent(b.dataset.paid)}/confirmar-pago`,{method:"POST"});replaceOrder(r.order);toast("Pago confirmado · cliente avisado")}catch(e){toast(e.message);b.disabled=false}});
  document.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=async()=>{if(!confirm(`¿Cancelar el pedido ${b.dataset.cancel}? El stock vuelve al catálogo.`))return;try{const r=await api(`/api/admin/orders/${encodeURIComponent(b.dataset.cancel)}`,{method:"PATCH",body:{status:"cancelado"}});replaceOrder(r.order);toast("Pedido cancelado")}catch(e){toast(e.message)}});
  document.querySelectorAll("[data-resend]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api(`/api/admin/orders/${encodeURIComponent(b.dataset.resend)}/reenviar-correo`,{method:"POST"});toast("Correo reenviado")}catch(e){toast(e.message)}b.disabled=false});
}
function replaceOrder(o){S.orders=S.orders.map(x=>x.id===o.id?o:x);admOrders()}

function admProducts(){
  const ps=S.adminProducts.slice().sort((a,b)=>a.name.localeCompare(b.name));
  $("#abody").innerHTML=`<div class="bar"><button class="btn acc" id="newP">+ Nuevo producto</button><span class="note">${ps.length} productos · los marcados como destacados salen en la portada.</span></div>
  <div id="pform"></div>
  <div class="tablewrap"><table><thead><tr><th></th><th>Producto</th><th>Categoría</th><th class="r">Precio</th><th class="r">Stock</th><th>Portada</th><th></th></tr></thead><tbody>
  ${ps.map(p=>`<tr><td><div class="thumb" style="width:44px;height:44px;border-radius:8px;overflow:hidden">${phHTML(p)}</div></td><td><b>${esc(p.name)}</b><br><span class="note">${esc(p.brand||"")}${p.active===false?" · oculto":""}</span></td><td>${esc(catById[p.category]?.name||"")}<br><span class="note">${esc(PETS.find(x=>x.id===p.pet)?.name||"Todos")}</span></td><td class="r num">${clp(p.price)}</td><td class="r num">${p.stock}</td><td>${p.featured?'<span class="pill ok">Destacado</span>':""}</td><td><button class="btn sm" data-edit="${p.id}">Editar</button></td></tr>`).join("")||`<tr><td colspan="7" class="note">Aún no hay productos.</td></tr>`}
  </tbody></table></div>`;
  $("#newP").onclick=()=>productForm(null);
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>productForm(b.dataset.edit));
}
function productForm(id){
  const p=id?S.adminProducts.find(x=>x.id===id):{name:"",brand:"",category:"alimentos",pet:"perro",price:"",oldPrice:"",featured:false,active:true,description:"",tags:[],image:"",stock:0};
  let image=p.image||"",imgFile=null;
  $("#pform").innerHTML=`<div class="panel"><h3>${id?"Editar producto":"Nuevo producto"}</h3>
   ${S.ai?`<div class="ai"><b>Completar con IA</b><span class="note" style="color:var(--ink)">Escribe el nombre (y si quieres sube la foto). La IA propone categoría, descripción, etiquetas y precio de referencia; tú revisas y guardas.</span><div class="bar"><button class="btn dark" id="aiFill" type="button">Completar ficha con IA</button><span class="note" id="aiMsg"></span></div></div>`:""}
   <div class="split"><div class="form">
    <label class="full">Nombre<input id="pName" type="text" value="${esc(p.name)}"></label>
    <label>Marca<input id="pBrand" type="text" value="${esc(p.brand)}"></label>
    <label>Categoría<select id="pCat">${CATS.map(c=>`<option value="${c.id}" ${c.id===p.category?"selected":""}>${c.name}</option>`).join("")}</select></label>
    <label>Mascota<select id="pPet">${[...PETS,{id:"todos",name:"Todas"}].map(x=>`<option value="${x.id}" ${x.id===p.pet?"selected":""}>${x.name}</option>`).join("")}</select></label>
    <label>Stock<input id="pStock" type="number" min="0" value="${p.stock||0}"></label>
    <label>Precio (CLP)<input id="pPrice" type="number" min="0" value="${esc(p.price)}"></label>
    <label>Precio antes (opcional)<input id="pOld" type="number" min="0" value="${esc(p.oldPrice||"")}"></label>
    <label class="full">Descripción<textarea id="pDesc" rows="4">${esc(p.description)}</textarea></label>
    <label class="full">Etiquetas (separadas por coma)<input id="pTags" type="text" value="${esc((p.tags||[]).join(", "))}"></label>
    <label class="full">Código de barras o SKU (opcional, para vender en tienda)<input id="pCode" type="text" inputmode="numeric" autocomplete="off" value="${esc(p.barcode||"")}"></label>
    <label class="check"><input id="pFeat" type="checkbox" ${p.featured?"checked":""}> Destacado en portada</label>
    <label class="check"><input id="pAct" type="checkbox" ${p.active!==false?"checked":""}> Visible en la tienda</label>
   </div><div style="display:flex;flex-direction:column;gap:10px">
    <span class="eyebrow">Foto</span><div class="imgprev" id="pPrev">${phHTML(p)}</div>
    <label class="btn" style="align-self:start">Subir foto<input id="pImg" type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden></label>
    <label>o URL de imagen (https)<input id="pUrl" type="url" placeholder="https://…" value="${esc(/^https:/.test(image)?image:"")}"></label>
    <span class="note">Foto cuadrada, idealmente 800×800 px, JPG o WebP, máx. 8 MB.</span>
   </div></div>
   <div class="err" id="pErr"></div>
   <div class="bar"><button class="btn acc" id="pSave" type="button">Guardar</button><button class="btn" id="pCancel" type="button">Cancelar</button>${id?`<a class="btn" href="/producto/${esc(p.slug)}" target="_blank">Ver en tienda</a><button class="btn" id="pDel" type="button" style="margin-left:auto">Eliminar</button>`:""}</div></div>`;
  $("#pform").scrollIntoView({behavior:"smooth",block:"start"});
  $("#pImg").onchange=()=>{imgFile=$("#pImg").files[0];if(imgFile)$("#pPrev").innerHTML=`<img src="${URL.createObjectURL(imgFile)}" alt="">`};
  $("#pCancel").onclick=()=>$("#pform").innerHTML="";
  const ai=$("#aiFill");if(ai)ai.onclick=async()=>{
    const name=$("#pName").value.trim();if(!name&&!imgFile){$("#aiMsg").textContent="Escribe al menos el nombre o sube una foto.";return}
    ai.disabled=true;$("#aiMsg").textContent="Generando ficha…";
    try{const fd=new FormData();fd.append("name",name);if(imgFile&&imgFile.size<=5*1024*1024)fd.append("image",imgFile);
      const r=await api("/api/admin/ai/ficha",{method:"POST",form:fd});
      if(r.name)$("#pName").value=r.name;if(r.brand)$("#pBrand").value=r.brand;if(catById[r.category])$("#pCat").value=r.category;if(["perro","gato","otros","todos"].includes(r.pet))$("#pPet").value=r.pet;if(r.description)$("#pDesc").value=r.description;if(r.tags)$("#pTags").value=r.tags.join(", ");if(r.price&&!$("#pPrice").value)$("#pPrice").value=Math.round(r.price);
      $("#aiMsg").textContent="Listo. Revisa los datos y el precio antes de guardar.";
    }catch(e){$("#aiMsg").textContent=e.message}
    ai.disabled=false};
  $("#pSave").onclick=async()=>{
    const name=$("#pName").value.trim(),price=+$("#pPrice").value;
    if(!name||!(price>0)){$("#pErr").textContent="El producto necesita nombre y un precio mayor que 0.";return}
    const btn=$("#pSave");btn.disabled=true;btn.textContent="Guardando…";$("#pErr").textContent="";
    try{
      if(imgFile){const fd=new FormData();fd.append("image",imgFile);image=(await api("/api/admin/upload",{method:"POST",form:fd})).url}
      else if($("#pUrl").value.trim())image=$("#pUrl").value.trim();
      else if(/^https:/.test(image))image="";
      const data={name,brand:$("#pBrand").value.trim(),category:$("#pCat").value,pet:$("#pPet").value,price,oldPrice:+$("#pOld").value||0,description:$("#pDesc").value.trim(),tags:$("#pTags").value.split(",").map(s=>s.trim()).filter(Boolean),featured:$("#pFeat").checked,active:$("#pAct").checked,image,stock:Math.max(0,parseInt($("#pStock").value)||0),barcode:$("#pCode").value.trim()};
      const r=await api(id?`/api/admin/products/${encodeURIComponent(id)}`:"/api/admin/products",{method:id?"PUT":"POST",body:data});
      S.adminProducts=id?S.adminProducts.map(x=>x.id===id?r.product:x):[...S.adminProducts,r.product];
      toast("Producto guardado");admProducts();
    }catch(e){$("#pErr").textContent=e.message;btn.disabled=false;btn.textContent="Guardar"}
  };
  const del=$("#pDel");if(del)del.onclick=async()=>{if(del.dataset.sure){try{await api(`/api/admin/products/${encodeURIComponent(id)}`,{method:"DELETE"});S.adminProducts=S.adminProducts.filter(x=>x.id!==id);toast("Producto eliminado");admProducts()}catch(e){toast(e.message)}}else{del.dataset.sure=1;del.textContent="Confirmar eliminar";del.style.borderColor="var(--bad)";del.style.color="var(--bad)"}};
}
/* ---------- VENTA EN TIENDA (punto de venta) ---------- */
const POS_PAY=[["efectivo","Efectivo"],["debito","Débito"],["credito","Crédito"],["transferencia","Transferencia"]];
S.pos=lsGet("dd_pos",null)||{items:{},payment:"efectivo",discount:"",received:"",customer:{}};
function posSave(){lsSet("dd_pos",S.pos)}
const norm=t=>String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
function posProd(id){return S.adminProducts.find(p=>p.id===id)}
function posLines(){return Object.entries(S.pos.items).map(([id,q])=>({p:posProd(id),q})).filter(x=>x.p)}
function posTotals(){const sub=posLines().reduce((s,x)=>s+x.p.price*x.q,0),disc=Math.min(sub,Math.max(0,Math.round(+S.pos.discount||0)));return{sub,disc,total:sub-disc}}
function posAdd(id,q=1){const p=posProd(id);if(!p)return;const have=S.pos.items[id]||0;if(have+q>p.stock){toast(p.stock?`Solo hay ${p.stock} en stock`:"Sin stock");return}S.pos.items[id]=have+q;posSave();posTicket();toast(`+1 ${p.name}`)}
function posSearch(q){const t=norm(q).trim();let ps=S.adminProducts.slice();
  if(t)ps=ps.filter(p=>p.barcode===q.trim()||norm(p.name+" "+(p.brand||"")+" "+(p.tags||[]).join(" ")+" "+(p.barcode||"")).includes(t));
  return ps.sort((a,b)=>(b.stock>0)-(a.stock>0)||a.name.localeCompare(b.name)).slice(0,t?40:24)}
function admSell(){
  $("#abody").innerHTML=`<div class="pos">
   <div class="pos__left">
     <div class="pos__search"><input id="posQ" type="search" placeholder="Busca por nombre, marca o código de barras…" autocomplete="off" aria-label="Buscar producto"><button class="btn dark" id="posScan" type="button">${icon("M4 7V5a1 1 0 0 1 1-1h2M17 4h2a1 1 0 0 1 1 1v2M20 17v2a1 1 0 0 1-1 1h-2M7 20H5a1 1 0 0 1-1-1v-2M7 9v6M10 9v6M13 9v6M16 9v6",2)}<span>Escanear</span></button></div>
     <div class="pos__res" id="posRes"></div>
   </div>
   <div class="panel pos__ticket" id="posTicket"></div></div>
   <button class="pos__bar" id="posBar" type="button" hidden></button>`;
  $("#posBar").onclick=()=>$("#posTicket").scrollIntoView({behavior:"smooth",block:"start"});
  const q=$("#posQ"),res=()=>{$("#posRes").innerHTML=posSearch(q.value).map(p=>`<button class="pos__item" data-pos="${p.id}" ${p.stock<=0?"disabled":""}><span class="thumb">${phHTML(p)}</span><span class="pos__name"><b>${esc(p.name)}</b><span class="note">${esc(p.brand||catById[p.category]?.name||"")}${p.barcode?` · <span class="mono">${esc(p.barcode)}</span>`:""}</span></span><span class="pos__price"><b class="num">${clp(p.price)}</b><span class="pill ${p.stock<=0?"bad":p.stock<=S.config.lowStock?"warn":"ok"}">${p.stock<=0?"Agotado":p.stock+" en stock"}</span></span></button>`).join("")||`<div class="empty"><b>Sin resultados</b>Prueba otra palabra o revisa el código.</div>`};
  q.oninput=res;res();
  // Enter: un lector de códigos USB escribe el código y presiona Enter.
  q.onkeydown=e=>{if(e.key!=="Enter")return;e.preventDefault();const code=q.value.trim(),exact=S.adminProducts.find(p=>p.barcode&&p.barcode===code),list=posSearch(code);
    const hit=exact||(list.length===1?list[0]:null);if(hit){posAdd(hit.id);q.value="";res()}else if(code)toast("Elige el producto de la lista")};
  $("#posRes").onclick=e=>{const b=e.target.closest("[data-pos]");if(b){posAdd(b.dataset.pos);q.focus()}};
  $("#posScan").onclick=posScanner;
  posTicket();
  if(matchMedia("(pointer:fine)").matches)q.focus();
}
function posTicket(){
  const el=$("#posTicket");if(!el)return;const lines=posLines(),t=posTotals(),cash=S.pos.payment==="efectivo",rec=Math.round(+S.pos.received||0);
  el.innerHTML=`<div class="bar"><h3 style="margin:0">Venta en tienda</h3>${lines.length?`<button class="btn sm" id="posClear" style="margin-left:auto">Vaciar</button>`:""}</div>
   ${lines.length?lines.map(({p,q})=>`<div class="pos__line"><div style="min-width:0"><b>${esc(p.name)}</b><div class="note num">${clp(p.price)} c/u · stock ${p.stock}</div></div>
     <div class="qty"><button data-pq="${p.id}" data-d="-1" aria-label="Menos">−</button><span class="num">${q}</span><button data-pq="${p.id}" data-d="1" aria-label="Más">+</button></div><b class="num">${clp(p.price*q)}</b></div>`).join("")
    :`<p class="note" style="margin:0">Busca o escanea productos para agregarlos al ticket.</p>`}
   <div class="row"><span>Subtotal</span><span class="num">${clp(t.sub)}</span></div>
   <label class="pos__inline">Descuento ($)<input id="posDisc" type="number" min="0" inputmode="numeric" value="${esc(S.pos.discount)}" placeholder="0"></label>
   <div class="row total"><span>Total</span><span class="num">${clp(t.total)}</span></div>
   <span class="eyebrow">Medio de pago</span>
   <div class="chips">${POS_PAY.map(([k,n])=>`<button class="chip ${S.pos.payment===k?"on":""}" data-pp="${k}">${n}</button>`).join("")}</div>
   ${cash?`<label class="pos__inline">Recibido ($)<input id="posRec" type="number" min="0" inputmode="numeric" value="${esc(S.pos.received)}" placeholder="${t.total}"></label>
     <div class="row"><span>Vuelto</span><b class="num" id="posChange">${rec>=t.total&&rec?clp(rec-t.total):"—"}</b></div>`:""}
   <details class="pos__cli" ${S.pos.customer.email||S.pos.customer.name?"open":""}><summary>Datos del cliente (opcional)</summary>
     <div class="form"><label class="full">Nombre<input id="posName" type="text" value="${esc(S.pos.customer.name||"")}"></label>
     <label class="full">Correo (le enviamos el comprobante)<input id="posEmail" type="email" value="${esc(S.pos.customer.email||"")}"></label>
     <label class="full">RUT<input id="posRut" type="text" value="${esc(S.pos.customer.rut||"")}"></label></div></details>
   <div class="err" id="posErr" role="alert"></div>
   <button class="cta wide" id="posPay" ${lines.length?"":"disabled"}>Cobrar ${clp(t.total)}</button>`;
  el.querySelectorAll("[data-pq]").forEach(b=>b.onclick=()=>{const id=b.dataset.pq,q=(S.pos.items[id]||0)+ +b.dataset.d,p=posProd(id);if(q<=0)delete S.pos.items[id];else if(q>p.stock){toast(`Solo hay ${p.stock} en stock`);return}else S.pos.items[id]=q;posSave();posTicket()});
  el.querySelectorAll("[data-pp]").forEach(b=>b.onclick=()=>{S.pos.payment=b.dataset.pp;posSave();posTicket()});
  const disc=$("#posDisc");disc.onchange=()=>{S.pos.discount=disc.value;posSave();posTicket()};
  const recI=$("#posRec");if(recI)recI.oninput=()=>{S.pos.received=recI.value;posSave();const v=Math.round(+recI.value||0),tt=posTotals().total;$("#posChange").textContent=v>=tt&&v?clp(v-tt):"—"};
  ["posName","posEmail","posRut"].forEach(id=>{const i=$("#"+id);i.oninput=()=>{S.pos.customer={name:$("#posName").value,email:$("#posEmail").value,rut:$("#posRut").value};posSave()}});
  const clr=$("#posClear");if(clr)clr.onclick=()=>{if(confirm("¿Vaciar el ticket?")){posReset();posTicket()}};
  $("#posPay").onclick=posCharge;
  // Barra fija en el celular con el total, para llegar al ticket sin bajar toda la lista.
  const bar=$("#posBar");if(bar){const n=lines.reduce((a,x)=>a+x.q,0);bar.hidden=!n;bar.innerHTML=`<span>${n} producto${n===1?"":"s"} · <b class="num">${clp(t.total)}</b></span><span>Ver ticket →</span>`}
}
function posReset(){S.pos={items:{},payment:S.pos.payment,discount:"",received:"",customer:{}};posSave()}
async function posCharge(){
  const t=posTotals(),btn=$("#posPay"),err=$("#posErr");err.textContent="";
  const rec=Math.round(+S.pos.received||0);if(S.pos.payment==="efectivo"&&rec&&rec<t.total){err.textContent="El monto recibido es menor que el total.";return}
  if(!confirm(`¿Confirmas la venta por ${clp(t.total)} pagada con ${PAY_NAMES[S.pos.payment]}?`))return;
  btn.disabled=true;btn.textContent="Registrando…";
  try{
    const r=await api("/api/admin/ventas-tienda",{method:"POST",body:{items:posLines().map(({p,q})=>({id:p.id,qty:q})),payment:S.pos.payment,discount:t.disc,received:S.pos.payment==="efectivo"?rec:0,customer:S.pos.customer}});
    const o=r.order;S.orders.unshift(o);
    for(const i of o.items){const p=posProd(i.id);if(p)p.stock-=i.qty}
    posReset();
    $("#posBar").hidden=true;
    $("#posTicket").innerHTML=`<div class="ok-box"><b>Venta registrada · <span class="mono">${esc(o.id)}</span></b><br>Total ${clp(o.total)} · ${esc(PAY_NAMES[o.payment])}${o.paymentDetail?.change?`<br><span style="font-size:20px">Vuelto: <b>${clp(o.paymentDetail.change)}</b></span>`:""}${o.customer.email?`<br>Comprobante enviado a ${esc(o.customer.email)}`:""}</div>
      <p class="note" style="margin:0">El stock ya se descontó en la tienda online.</p>
      <div class="bar"><button class="btn" id="posPrint">Imprimir comprobante</button><button class="btn acc" id="posNew">Nueva venta</button></div>`;
    $("#posNew").onclick=()=>admSell();
    $("#posPrint").onclick=()=>posPrint(o);
    const q=$("#posQ");if(q){q.value="";q.dispatchEvent(new Event("input"))}
  }catch(e){err.textContent=e.message;btn.disabled=false;btn.textContent=`Cobrar ${clp(t.total)}`;if(e.status===409)refreshAdmin()}
}
function posPrint(o){
  const w=window.open("","_blank","width=380,height=640");if(!w){toast("Permite las ventanas emergentes para imprimir");return}
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.id)}</title><style>body{font:13px/1.45 monospace;margin:16px;color:#000}h1{font-size:16px;margin:0 0 4px;text-align:center}p{margin:2px 0;text-align:center}table{width:100%;border-collapse:collapse;margin:10px 0}td{padding:3px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}.t td{border-top:1px dashed #000;font-weight:bold;font-size:15px}</style></head><body>
   <h1>DON DOG</h1><p>Pet shop · Candelaria Goyenechea 3820, local 165, Vitacura</p><p>${esc(new Date(o.createdAt).toLocaleString("es-CL"))} · N° ${esc(o.id)}</p>
   <table>${o.items.map(i=>`<tr><td>${i.qty} × ${esc(i.name)}</td><td>${clp(i.qty*i.price)}</td></tr>`).join("")}
   ${o.discount?`<tr><td>Descuento</td><td>−${clp(o.discount)}</td></tr>`:""}<tr class="t"><td>TOTAL</td><td>${clp(o.total)}</td></tr></table>
   <p>Pago: ${esc(PAY_NAMES[o.payment])}${o.paymentDetail?.received?` · recibido ${clp(o.paymentDetail.received)} · vuelto ${clp(o.paymentDetail.change)}`:""}</p>
   <p style="margin-top:10px">Comprobante interno, no válido como boleta.</p><p>¡Gracias por tu compra! @dondog.cl</p></body></html>`);
  w.document.close();w.focus();w.print();
}
// Escáner con la cámara (Chrome en Android y otros navegadores con BarcodeDetector).
async function posScanner(){
  if(!("BarcodeDetector" in window)||!navigator.mediaDevices?.getUserMedia){toast("Este navegador no puede escanear. Usa Chrome en Android o un lector USB.");return}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"}})}catch(e){toast("No se pudo abrir la cámara. Revisa los permisos.");return}
  const ov=document.createElement("div");ov.className="pos__scan";ov.innerHTML=`<video playsinline muted></video><div class="pos__aim"></div><button class="btn" id="scanX">Cerrar</button><p>Apunta al código de barras</p>`;document.body.appendChild(ov);
  const v=ov.querySelector("video");v.srcObject=stream;await v.play().catch(()=>{});
  const det=new BarcodeDetector();let done=false;
  const stop=()=>{done=true;stream.getTracks().forEach(t=>t.stop());ov.remove();$("#posQ")?.focus()};
  ov.querySelector("#scanX").onclick=stop;
  const loop=async()=>{if(done)return;try{const codes=await det.detect(v);if(codes.length){const code=codes[0].rawValue,p=S.adminProducts.find(x=>x.barcode===code);stop();if(p)posAdd(p.id);else{toast(`Código ${code} no está asignado a ningún producto`);const q=$("#posQ");if(q){q.value=code;q.dispatchEvent(new Event("input"))}}return}}catch(e){}setTimeout(loop,250)};loop();
}
function sold30(id){const from=Date.now()-30*864e5;return S.orders.filter(o=>o.paymentStatus==="pagado"&&o.createdAt>=from).reduce((s,o)=>s+o.items.filter(i=>i.id===id).reduce((a,i)=>a+i.qty,0),0)}
function admStock(){
  const ps=S.adminProducts.slice().sort((a,b)=>a.stock-b.stock),low=ps.filter(p=>p.stock<=S.config.lowStock);
  const val=ps.reduce((s,p)=>s+p.price*p.stock,0),units=ps.reduce((s,p)=>s+p.stock,0);
  $("#abody").innerHTML=`<div class="kpis"><div class="kpi"><span class="eyebrow">Productos</span><b>${ps.length}</b></div><div class="kpi"><span class="eyebrow">Unidades</span><b>${units}</b></div>
   <div class="kpi ${low.length?"alert":""}"><span class="eyebrow">Stock bajo (≤ ${S.config.lowStock})</span><b>${low.length}</b></div><div class="kpi"><span class="eyebrow">Valor a precio venta</span><b>${clp(val)}</b></div></div>
   ${S.ai?`<div class="ai"><div class="bar"><b>Análisis de stock con IA</b><button class="btn dark sm" id="aiStock">Analizar y sugerir reposición</button></div><div class="ai-out" id="aiOut">Cruza el stock actual con las ventas de los últimos 30 días y te dice qué reponer primero.</div></div>`:""}
   <div class="tablewrap"><table><thead><tr><th>Producto</th><th>Estado</th><th class="r">Vendidos 30 d</th><th class="r">Stock</th><th></th></tr></thead><tbody>
   ${ps.map(p=>{const n=p.stock;return `<tr><td><b>${esc(p.name)}</b><br><span class="note">${esc(catById[p.category]?.name||"")}</span></td><td><span class="pill ${n<=0?"bad":n<=S.config.lowStock?"warn":"ok"}">${n<=0?"Agotado":n<=S.config.lowStock?"Bajo":"OK"}</span></td><td class="r num">${sold30(p.id)}</td>
    <td class="r"><input class="stockin num" type="number" min="0" id="st-${p.id}" value="${n}"></td><td><button class="btn sm" data-st="${p.id}">Guardar</button></td></tr>`}).join("")||`<tr><td colspan="5" class="note">Sin productos.</td></tr>`}</tbody></table></div>`;
  document.querySelectorAll("[data-st]").forEach(b=>b.onclick=async()=>{const id=b.dataset.st,v=Math.max(0,parseInt($("#st-"+id).value)||0);try{const r=await api(`/api/admin/products/${encodeURIComponent(id)}/stock`,{method:"PUT",body:{stock:v}});S.adminProducts=S.adminProducts.map(x=>x.id===id?r.product:x);toast("Stock actualizado")}catch(e){toast(e.message)}});
  const ai=$("#aiStock");if(ai)ai.onclick=async()=>{ai.disabled=true;const out=$("#aiOut");out.textContent="Analizando…";
    try{out.textContent=(await api("/api/admin/ai/stock",{method:"POST"})).text}catch(e){out.textContent=e.message}ai.disabled=false};
}
async function admSettings(){
  $("#abody").innerHTML=`<div class="empty">Cargando…</div>`;
  let r;try{r=await api("/api/admin/settings")}catch(e){$("#abody").innerHTML=`<div class="empty">${esc(e.message)}</div>`;return}
  const c=r.settings,st=r.status,ok=(b,y,n)=>`<span class="pill ${b?"ok":"warn"}">${b?y:n}</span>`;
  $("#abody").innerHTML=`<div class="panel"><h3>Estado de la tienda</h3>
    <div class="tablewrap"><table><tbody>
     <tr><td>Correo (SMTP)</td><td>${ok(st.smtp,"Configurado","Sin configurar · los correos no salen")}</td></tr>
     <tr><td>Avisos al dueño</td><td>${ok(st.ownerEmail,"Activos","Falta MAIL_OWNER_TO")}</td></tr>
     <tr><td>Webpay</td><td>${st.webpay==="produccion"?ok(true,"Producción · cobra de verdad"):st.webpay==="integracion"?ok(false,"","Modo pruebas · no cobra"):ok(false,"","Apagado")}</td></tr>
     <tr><td>Mercado Pago</td><td>${ok(st.mercadopago,"Activo","Apagado")}</td></tr>
     <tr><td>Transferencia</td><td>${ok(st.transfer,"Activa","Faltan datos bancarios")}</td></tr>
     <tr><td>Google Sheets</td><td>${ok(st.sheets,"Conectado","No conectado")}</td></tr>
     <tr><td>Asesor IA</td><td>${ok(st.ai,"Activo","Apagado")}</td></tr>
    </tbody></table></div>
    <div class="bar"><button class="btn dark" id="testMail">Enviarme un correo de prueba</button><span class="note">Estos datos se cambian en el archivo <span class="mono">.env</span> del servidor.</span></div></div>
   <div class="panel"><h3>Reglas de la tienda</h3><div class="form">
    <label>Plazo de preparación (horas)<input id="sSla" type="number" min="1" value="${c.slaHours}"></label>
    <label>Alerta de stock bajo (unidades)<input id="sLow" type="number" min="0" value="${c.lowStock}"></label>
    <label>Despacho gratis desde (CLP)<input id="sFree" type="number" min="0" value="${c.freeShip}"></label>
    <label>Costo de despacho (CLP)<input id="sShip" type="number" min="0" value="${c.shipCost}"></label>
    <label class="full">Comunas con despacho (separadas por coma; vacío = todas)<input id="sCom" type="text" value="${esc(c.shipComunas||"")}" placeholder="Vitacura, Las Condes, Lo Barnechea, Providencia"></label></div>
    <div class="bar"><button class="btn acc" id="sSave">Guardar ajustes</button></div></div>
   <div class="panel"><h3>Mi cuenta</h3><p class="note" style="margin:0">Sesión iniciada como <b>${esc(S.admin?.email)}</b>.</p>
    <div class="form"><label>Contraseña actual<input id="pwCur" type="password" autocomplete="current-password"></label><label>Nueva contraseña (mín. 10)<input id="pwNew" type="password" autocomplete="new-password"></label></div>
    <div class="bar"><button class="btn" id="pwSave">Cambiar contraseña</button><button class="btn" id="logout" style="margin-left:auto">Cerrar sesión</button></div></div>`;
  $("#testMail").onclick=async()=>{try{const r=await api("/api/admin/test-email",{method:"POST"});toast(r.smtp?`Correo enviado a ${r.to}`:"SMTP sin configurar: el correo quedó en server/data/outbox")}catch(e){toast(e.message)}};
  $("#sSave").onclick=async()=>{try{const r=await api("/api/admin/settings",{method:"PUT",body:{slaHours:+$("#sSla").value||24,lowStock:+$("#sLow").value||0,freeShip:+$("#sFree").value||0,shipCost:+$("#sShip").value||0,shipComunas:$("#sCom").value.trim()}});Object.assign(S.config,r.settings);toast("Ajustes guardados")}catch(e){toast(e.message)}};
  $("#pwSave").onclick=async()=>{try{await api("/api/admin/password",{method:"PUT",body:{current:$("#pwCur").value,next:$("#pwNew").value}});$("#pwCur").value=$("#pwNew").value="";toast("Contraseña actualizada")}catch(e){toast(e.message)}};
  $("#logout").onclick=async()=>{await api("/api/admin/logout",{method:"POST"}).catch(()=>{});S.admin=null;$("#adminBtn").hidden=true;closeAdmin()};
}
setInterval(()=>{if(S.adminTab==="pedidos"&&$("#admin")&&!$("#admin").hidden&&!document.activeElement?.matches("select,input"))refreshAdmin()},60e3);

/* desvanecer la foto de la tienda al bajar */
(()=>{let ticking=false;const rm=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
 function upd(){ticking=false;const f=document.querySelector(".hero2__foto");if(!f)return;
   const r=f.getBoundingClientRect(),end=r.top+window.scrollY+r.height*0.7;
   const t=Math.min(1,Math.max(0,window.scrollY/end));
   f.style.opacity=(1-t).toFixed(3);
   if(!rm)f.style.transform=`translateY(${(t*60).toFixed(1)}px) scale(${(1-t*0.06).toFixed(3)})`;}
 addEventListener("scroll",()=>{if(!ticking){ticking=true;requestAnimationFrame(upd)}},{passive:true});
 addEventListener("resize",upd);
 const o=render;render=function(){o();upd()};})();

/* ---------- BOOT ---------- */
async function loadCatalog(){
  try{const r=await api("/api/catalog");S.products=r.products;Object.assign(S.config,r.config);S.payments=r.payments;S.store=r.store||{};S.ai=r.ai;S.loadError=false}
  catch(e){S.loadError=true}
  S.loaded=true;$("#fab").hidden=false;fitCart();
  // No redibujar la portada si el cliente está escribiendo en el formulario de contacto.
  if(document.activeElement?.closest?.("#main form")){renderNav();updateCartBadge()}else render()
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&S.loaded)loadCatalog()});
render();
(async()=>{
  await loadCatalog();
  const u=new URL(location.href),path=u.pathname.replace(/\/+$/,"")||"/";
  const pid=u.searchParams.get("pedido"),k=u.searchParams.get("k");
  if(pid&&k){rememberOrder(pid,k);openOrder(pid,k,u.searchParams.get("pago")||undefined);return}
  if(u.searchParams.get("pago")==="rechazado"){toast("El pago no se completó");setPath("/")}
  if(path.startsWith("/producto/")){const p=S.products.find(x=>x.slug===decodeURIComponent(path.slice(10)));if(p)openProduct(p.id);else{toast("Ese producto ya no está disponible");setPath("/")}return}
  if(path==="/admin"){openAdmin();return}
  if(["/seguimiento","/terminos","/privacidad","/devoluciones"].includes(path))openPage(path.slice(1));
  // ¿Sesión de admin activa? Muestra el botón del panel.
  api("/api/admin/me").then(r=>{S.admin=r.admin;$("#adminBtn").hidden=false}).catch(()=>{});
})();
