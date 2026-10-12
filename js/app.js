"use strict";
const LOGO="img/logo.webp";
const MASCOT="img/el-don.webp",MASCOT_SM="img/el-don-mini.webp";
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

const S={products:[],stock:{},config:{slaHours:24,lowStock:5,freeShip:40000,shipCost:3990},orders:[],
  cart:lsGet("dd_cart",{}),view:"home",cat:null,pet:null,q:"",sort:"featured",
  db:null,user:null,uid:null,isAdmin:false,sample:null,assets:null,downloads:null,loaded:false,adminTab:"pedidos"};

function toast(msg){const t=$("#toast");t.textContent=msg;t.hidden=false;clearTimeout(toast._t);toast._t=setTimeout(()=>t.hidden=true,2600)}
function imgSrc(p){if(p.imageId)return "/_blob/"+p.imageId;return p.imageUrl||""}
function phHTML(p){const s=imgSrc(p);if(s)return `<img src="${esc(s)}" alt="${esc(p.name)}" loading="lazy">`;const c=catById[p.category]||CATS[0];return `<div class="ph-blank">${icon(c.d,1.4)}</div>`}
function stockOf(id){const v=S.stock[id];return typeof v==="number"?v:0}
function availHTML(id){const n=stockOf(id);if(n<=0)return `<span class="avail out">Sin stock</span>`;if(n<=S.config.lowStock)return `<span class="avail low">Últimas ${n} unidades</span>`;return `<span class="avail ok">Disponible · ${n} en stock</span>`}
function active(){return S.products.filter(p=>p.active!==false)}

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
  const n=stockOf(p.id),sale=p.oldPrice&&p.oldPrice>p.price?Math.round((1-p.price/p.oldPrice)*100):0;
  return `<article class="card">
   <button class="ph" data-open="${p.id}" aria-label="Ver ${esc(p.name)}">${phHTML(p)}${p.featured?'<span class="tag">Destacado</span>':""}${sale?`<span class="tag sale">-${sale}%</span>`:""}</button>
   <div class="body"><span class="brandl">${esc(p.brand||catById[p.category]?.name||"")}</span>
   <h3>${esc(p.name)}</h3>
   <div class="price"><b>${clp(p.price)}</b>${sale?`<s>${clp(p.oldPrice)}</s>`:""}</div>
   ${availHTML(p.id)}
   <button class="add" data-add="${p.id}" ${n<=0?"disabled":""}>${n<=0?"Agotado":"Agregar al carrito"}</button></div></article>`;
}
function emptyCatalog(){return `<div class="empty"><b>Todavía no hay productos publicados</b>${S.isAdmin?"Abre <b style='display:inline'>Admin → Productos</b> para cargar el primero, o deja que la IA complete la ficha por ti.":"Vuelve pronto: estamos cargando el catálogo."}</div>`}
function renderHome(){
  const ps=active(),feat=ps.filter(p=>p.featured).slice(0,8),deals=ps.filter(p=>p.oldPrice>p.price).slice(0,4);
  const counts=Object.fromEntries(CATS.map(c=>[c.id,ps.filter(p=>p.category===c.id).length]));
  const blurbs={alimentos:"Pienso seco y húmedo de marcas premium para cada etapa.",snacks:"Premios naturales, dentales y de entrenamiento.",juguetes:"Pelotas, mordedores y juegos para gatos activos.",accesorios:"Correas, arneses, camas y collares de recuperación.",cosmetica:"Shampoo, colonias y cuidado del pelaje.",salud:"Calmantes, antiparasitarios y bienestar diario.",ropa:"Chalecos, botas y abrigo para el invierno."};
  $("#main").innerHTML=`
  <section class="hero2"><div class="wrap hero2__in">
    <div class="hero2__txt">
      <span class="pill-dark">Nuevo · <b>Compra online</b> y retira en tienda</span>
      <p class="kicker">Pet shop · Vitacura</p>
      <h1 class="display">Consentir a tu mascota es cosa de Dones</h1>
      <p class="hero2__eslogan">Todo para perros y gatos, <span>listo en 24 horas.</span></p>
      <div class="cta-row"><button class="btn-pill acc" data-cat="todo">Ver productos</button><button class="btn-pill line" data-cat="alimentos">Alimentos</button></div>
      <div class="hero2__redes"><span>Síguenos</span><a class="redes1 light" href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener" aria-label="Instagram">${IG}</a><span class="mono">@dondog.cl</span></div>
    </div>
    <figure class="hero2__foto"><img src="img/tienda.webp" alt="Interior de la tienda Don Dog con huellas de colores en el piso"></figure>
  </div></section>
  <section class="oscura sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Categorías</p><h2 class="display h-xl">Todo para tu mascota</h2></div><p>Elige una categoría y mira lo que tenemos en stock ahora mismo en la tienda.</p></div>
    <div class="cats-grid">${CATS.map((c,i)=>`<button class="catcard" data-cat="${c.id}"><span class="catcard__ico c${i%4}">${icon(c.d,1.6)}</span><span class="catcard__txt"><small class="num">${counts[c.id]} productos</small><h3>${esc(c.name)}</h3><p>${blurbs[c.id]}</p><span class="flecha">Ver ${esc(c.name.split(" ")[0].toLowerCase())} →</span></span></button>`).join("")}
      <button class="catcard catcard--all" data-cat="todo"><span class="catcard__txt"><small>Catálogo completo</small><h3>Ver todo</h3><p>${ps.length?ps.length+" productos con stock en vivo.":"Todo el catálogo con stock en vivo."}</p><span class="flecha">Entrar a la tienda →</span></span></button></div>
  </div></section>
  <section class="sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Lo más pedido</p><h2 class="display h-xl">Destacados</h2></div><button class="flecha" data-cat="todo">Ver todo →</button></div>
    ${!S.loaded?`<div class="empty">Cargando catálogo…</div>`:feat.length?`<div class="grid">${feat.map(card).join("")}</div>`:ps.length?`<div class="grid">${ps.slice(0,8).map(card).join("")}</div>`:emptyCatalog()}
  </div></section>
  <section class="oscura sec"><div class="wrap">
    <div class="cabecera"><div><p class="kicker">Cómo comprar</p><h2 class="display h-xl">Tu pedido en 3 pasos</h2></div><p>Compras desde el celular y nosotros preparamos todo en la tienda.</p></div>
    <ol class="pasos"><li class="paso"><span class="paso__num c0">1</span><h3>Elige</h3><p>Busca por categoría o pregúntale al Don qué le conviene a tu mascota.</p></li>
    <li class="paso"><span class="paso__num c1">2</span><h3>Paga seguro</h3><p>Webpay, Mercado Pago o transferencia. Ves el stock real antes de pagar.</p></li>
    <li class="paso"><span class="paso__num c2">3</span><h3>Recibe en 24 h</h3><p>Preparamos tu pedido en menos de 24 horas para despacho o retiro en tienda.</p></li></ol>
  </div><div class="paws" aria-hidden="true">${paws(12)}</div></section>
  ${deals.length?`<section class="sec"><div class="wrap"><div class="cabecera"><div><p class="kicker">Precios especiales</p><h2 class="display h-xl">Ofertas del Don</h2></div></div><div class="grid">${deals.map(card).join("")}</div></div></section>`:""}
  <section class="sec madera"><div class="wrap bio">
    <img src="img/muro.webp" alt="Muro negro con el logo de Don Dog y el mesón de la tienda">
    <div class="bio__txt"><p class="kicker">Nosotros</p><h2 class="display h-xl">Un pet shop de barrio con estilo</h2>
      <p class="destacado">En Don Dog elegimos cada producto como si fuera para nuestros propios perros y gatos.</p>
      <p>Estamos en el centro comercial Lo Castillo, en Vitacura. Pasa a conocer la tienda, pide consejo o retira tu compra online sin costo.</p>
      <ul class="chips-l"><li>Alimentos premium</li><li>Accesorios</li><li>Cosmética</li><li>Retiro en tienda</li><li>Despacho 24 h</li></ul>
      <p class="firma display">Don Dog<small>Candelaria Goyenechea 3820, local 165</small></p></div>
  </div></section>
  <section class="redes-panel"><div class="wrap">
    <a href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener">${IG}<strong>Instagram</strong><span>@dondog.cl</span></a>
    <button data-cat="todo">${icon("M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L20 8H6.2")}<strong>Tienda online</strong><span>Stock en vivo</span></button>
    <div>${icon("M4 10l8-6 8 6v10H4zM10 20v-6h4v6")}<strong>Retiro gratis</strong><span>Lo Castillo, Vitacura</span></div>
    <div>${icon("M3 7h11v9H3zM14 10h4l3 3v3h-7")}<strong>Despacho 24 h</strong><span>Gratis sobre ${clp(S.config.freeShip)}</span></div>
  </div></section>
  <section class="oscura sec"><div class="wrap contacto">
    <div><p class="kicker">Asesor con IA</p><h2 class="display h-xl">¿No sabes qué elegir? Pregúntale al Don</h2>
      <p class="contacto__p">Cuéntale la edad, el tamaño o lo que necesita tu mascota y te recomienda productos que tenemos en stock.</p>
      <div class="cta-row"><button class="btn-pill acc" id="openChat2">Hablar con el Don</button><a class="btn-pill line" href="https://www.instagram.com/dondog.cl/" target="_blank" rel="noopener">Escríbenos por Instagram</a></div></div>
    <div class="donbox"><img class="donbox__img" src="${MASCOT}" alt="El Don, la mascota de Don Dog, en skate con sombrero y lentes"><div class="chatprev"><div class="chatprev__cab"><img src="${MASCOT_SM}" alt="">El Don · asesor</div>
      <div class="msgp u">Mi bulldog francés se pone nervioso con los fuegos artificiales</div>
      <div class="msgp b">Para esas noches te sirve el collar calmante con feromonas. Póntelo unos días antes y dura hasta 4 semanas.</div>
      <div class="chipsp"><span>Cachorros</span><span>Gatos</span><span>Piel sensible</span></div></div></div>
  </div></section>`;
  const oc=$("#openChat2");if(oc)oc.onclick=()=>{if(S.sample){$("#chat").hidden=false;$("#chatIn").focus()}else toast("El asesor se activa al abrir la tienda con tu cuenta")};
}
function filtered(){
  let ps=active();
  if(S.cat&&S.cat.startsWith("g:")){const it=groupById[S.cat.slice(2)].items;ps=ps.filter(p=>it.includes(p.category))}
  else if(S.cat&&S.cat!=="todo")ps=ps.filter(p=>p.category===S.cat);
  if(S.deals)ps=ps.filter(p=>p.oldPrice>p.price);
  if(S.pet)ps=ps.filter(p=>p.pet===S.pet||p.pet==="todos");
  if(S.q){const t=S.q.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");ps=ps.filter(p=>(p.name+" "+(p.brand||"")+" "+(p.tags||[]).join(" ")+" "+(catById[p.category]?.name||"")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").includes(t))}
  const by={featured:(a,b)=>(b.featured?1:0)-(a.featured?1:0)||a.name.localeCompare(b.name),asc:(a,b)=>a.price-b.price,desc:(a,b)=>b.price-a.price,stock:(a,b)=>stockOf(b.id)-stockOf(a.id)};
  return ps.sort(by[S.sort]);
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
     ${ps.length?`<div class="grid">${ps.map(card).join("")}</div>`:S.products.length?`<div class="empty"><b>Sin resultados</b>Prueba otra palabra o pregúntale al Don.</div>`:emptyCatalog()}
   </div></div></section>`;
  $("#sort").value=S.sort;
}
function render(){renderNav();if(S.view==="catalog")renderCatalog();else renderHome();updateCartBadge()}
function go(view,opts={}){Object.assign(S,{view},opts);render();window.scrollTo({top:0})}

document.addEventListener("click",e=>{
  const t=e.target.closest("[data-nav],[data-cat],[data-pet],[data-fcat],[data-fpet],[data-add],[data-open]");if(!t)return;
  if(t.dataset.nav!==undefined){const [c,p,d]=t.dataset.nav.split("|");navOpen=null;S.q="";$("#q").value="";go("catalog",{cat:c||"todo",pet:p||null,deals:!!d});return}
  if(t.dataset.cat!==undefined){S.q="";$("#q").value="";go("catalog",{cat:t.dataset.cat,pet:null,deals:false})}
  else if(t.dataset.pet!==undefined){S.q="";$("#q").value="";go("catalog",{pet:t.dataset.pet,cat:"todo",deals:false})}
  else if(t.dataset.fcat!==undefined){S.cat=t.dataset.fcat;S.deals=false;render()}
  else if(t.dataset.fpet!==undefined){S.pet=t.dataset.fpet||null;render()}
  else if(t.dataset.add!==undefined){addToCart(t.dataset.add,1)}
  else if(t.dataset.open!==undefined){openProduct(t.dataset.open)}
});
document.addEventListener("change",e=>{if(e.target.id==="sort"){S.sort=e.target.value;render()}});
$("#goHome").onclick=()=>{S.q="";$("#q").value="";go("home",{cat:null,pet:null,deals:false})};
$("#searchForm").onsubmit=e=>{e.preventDefault();S.q=$("#q").value.trim();go("catalog",{cat:"todo",pet:null,deals:false})};

/* ---------- PRODUCT MODAL ---------- */
function closeLayer(){$("#layer").innerHTML=""}
function openProduct(id){
  const p=S.products.find(x=>x.id===id);if(!p)return;const n=stockOf(id);
  $("#layer").innerHTML=`<div class="scrim" data-close></div><div class="modal"><div class="box" role="dialog" aria-label="${esc(p.name)}">
   <div class="ph">${phHTML(p)}</div>
   <div class="info"><div class="row"><span class="eyebrow">${esc(p.brand||"")} · ${esc(catById[p.category]?.name||"")}</span><button class="x" data-close aria-label="Cerrar">✕</button></div>
   <h2>${esc(p.name)}</h2>
   <div class="price"><b style="font-size:26px">${clp(p.price)}</b>${p.oldPrice>p.price?`<s>${clp(p.oldPrice)}</s>`:""}</div>
   ${availHTML(id)}
   <p style="margin:0">${esc(p.description||"")}</p>
   ${(p.tags||[]).length?`<div class="chips">${p.tags.map(t=>`<span class="pill mut">${esc(t)}</span>`).join("")}</div>`:""}
   <div class="bar" style="margin-top:auto"><div class="qty"><button id="mMinus" aria-label="Menos">−</button><span id="mQ" class="num">1</span><button id="mPlus" aria-label="Más">+</button></div>
   <button class="cta" id="mAdd" ${n<=0?"disabled":""}>${n<=0?"Agotado":"Agregar al carrito"}</button></div>
   <p class="note" style="margin:0">Pedido preparado y despachado dentro de 24 h.</p></div></div></div>`;
  let q=1;const upd=()=>$("#mQ").textContent=q;
  $("#mMinus").onclick=()=>{q=Math.max(1,q-1);upd()};$("#mPlus").onclick=()=>{q=Math.min(n,q+1);upd()};
  $("#mAdd").onclick=()=>{addToCart(id,q);closeLayer()};
}
$("#layer").addEventListener("click",e=>{if(e.target.closest("[data-close]"))closeLayer()});
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeLayer()});

/* ---------- CART ---------- */
function cartItems(){return Object.entries(S.cart).map(([id,q])=>({p:S.products.find(x=>x.id===id),q})).filter(x=>x.p)}
function cartTotals(delivery){const sub=cartItems().reduce((s,x)=>s+x.p.price*x.q,0);const ship=delivery==="retiro"||sub>=S.config.freeShip||sub===0?0:S.config.shipCost;return{sub,ship,total:sub+ship}}
function saveCart(){lsSet("dd_cart",S.cart);updateCartBadge()}
function updateCartBadge(){const n=Object.values(S.cart).reduce((a,b)=>a+b,0);const b=$("#cartCount");b.textContent=n;b.hidden=!n}
function addToCart(id,q){const have=S.cart[id]||0,max=stockOf(id);if(have+q>max){toast(max?`Solo quedan ${max} unidades`:"Producto sin stock");S.cart[id]=Math.min(max,have+q)||undefined;if(!S.cart[id])delete S.cart[id];saveCart();return}S.cart[id]=have+q;saveCart();toast("Agregado al carrito")}
$("#cartBtn").onclick=()=>openCart();
function openCart(){
  const items=cartItems(),t=cartTotals("despacho");
  $("#layer").innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="Carrito">
   <div class="dhead"><h2 class="display">Tu carrito</h2><button class="x" data-close aria-label="Cerrar">✕</button></div>
   <div class="dbody">${items.length?items.map(({p,q})=>`<div class="line"><div class="thumb">${phHTML(p)}</div>
     <div style="min-width:0"><div style="font-weight:600;line-height:1.3">${esc(p.name)}</div><div class="note num">${clp(p.price)} c/u · stock ${stockOf(p.id)}</div>
     <div class="qty" style="margin-top:6px"><button data-cq="${p.id}" data-d="-1" aria-label="Menos">−</button><span class="num">${q}</span><button data-cq="${p.id}" data-d="1" aria-label="Más">+</button></div></div>
     <b class="num">${clp(p.price*q)}</b></div>`).join(""):`<div class="empty"><img class="empty__don" src="${MASCOT}" alt=""><b>Tu carrito está vacío</b>El Don te espera en el catálogo.</div>`}</div>
   ${items.length?`<div class="dfoot"><div class="row"><span>Subtotal</span><b class="num">${clp(t.sub)}</b></div>
     <div class="note">${t.sub>=S.config.freeShip?"Tienes despacho gratis.":`Te faltan ${clp(S.config.freeShip-t.sub)} para despacho gratis.`}</div>
     <button class="cta wide" id="toCheckout">Ir a pagar</button></div>`:""}</aside>`;
  $("#layer").querySelectorAll("[data-cq]").forEach(b=>b.onclick=()=>{const id=b.dataset.cq,q=(S.cart[id]||0)+ +b.dataset.d;if(q<=0)delete S.cart[id];else if(q>stockOf(id)){toast("No hay más stock");return}else S.cart[id]=q;saveCart();openCart()});
  const c=$("#toCheckout");if(c)c.onclick=openCheckout;
}
function openCheckout(){
  const saved=lsGet("dd_customer",{});
  $("#layer").innerHTML=`<div class="scrim" data-close></div><aside class="drawer" role="dialog" aria-label="Pago">
   <div class="dhead"><h2 class="display">Finalizar compra</h2><button class="x" data-close aria-label="Cerrar">✕</button></div>
   <form class="dbody" id="coForm" novalidate>
    <div class="form">
     <label class="full">Nombre y apellido<input id="cName" type="text" required value="${esc(saved.name||"")}"></label>
     <label>Correo<input id="cEmail" type="email" required value="${esc(saved.email||"")}"></label>
     <label>Teléfono<input id="cPhone" type="tel" required placeholder="+56 9…" value="${esc(saved.phone||"")}"></label>
    </div>
    <span class="eyebrow">Entrega</span>
    <div class="pay"><label><input type="radio" name="dlv" value="despacho" checked> Despacho a domicilio (24 h)</label><label><input type="radio" name="dlv" value="retiro"> Retiro en tienda, Lo Castillo · gratis</label></div>
    <div class="form" id="addrBox"><label class="full">Dirección<input id="cAddr" type="text" value="${esc(saved.addr||"")}"></label><label class="full">Comuna<input id="cComuna" type="text" value="${esc(saved.comuna||"")}"></label></div>
    <span class="eyebrow">Medio de pago</span>
    <div class="pay"><label><input type="radio" name="pay" value="Webpay" checked> Webpay · débito y crédito</label><label><input type="radio" name="pay" value="Mercado Pago"> Mercado Pago</label><label><input type="radio" name="pay" value="Transferencia"> Transferencia bancaria</label></div>
    <div id="coTot"></div>
    <p class="note" style="margin:0">Modo demostración: el pago se simula y no se cobra nada. Para cobrar de verdad hay que conectar Webpay o Mercado Pago con las credenciales del comercio.</p>
    <div class="err" id="coErr"></div>
    <button class="cta wide" id="coPay">Pagar</button>
   </form></aside>`;
  const tot=()=>{const d=document.querySelector("input[name=dlv]:checked").value,t=cartTotals(d);$("#addrBox").hidden=d==="retiro";$("#coTot").innerHTML=`<div class="row"><span>Subtotal</span><span class="num">${clp(t.sub)}</span></div><div class="row"><span>Despacho</span><span class="num">${t.ship?clp(t.ship):"Gratis"}</span></div><div class="row total"><span>Total</span><span class="num">${clp(t.total)}</span></div>`;$("#coPay").textContent="Pagar "+clp(t.total)};
  $("#coForm").addEventListener("change",tot);tot();
  $("#coForm").onsubmit=async e=>{e.preventDefault();await placeOrder()};
}
async function placeOrder(){
  const err=$("#coErr"),btn=$("#coPay");err.textContent="";
  const dlv=document.querySelector("input[name=dlv]:checked").value,pay=document.querySelector("input[name=pay]:checked").value;
  const c={name:$("#cName").value.trim(),email:$("#cEmail").value.trim(),phone:$("#cPhone").value.trim(),addr:$("#cAddr").value.trim(),comuna:$("#cComuna").value.trim()};
  if(!c.name||!/\S+@\S+\.\S+/.test(c.email)||!c.phone){err.textContent="Completa nombre, un correo válido y teléfono.";return}
  if(dlv==="despacho"&&(!c.addr||!c.comuna)){err.textContent="Para despacho necesitamos dirección y comuna.";return}
  if(S.demo){const items=cartItems(),t=cartTotals(dlv),now=Date.now();
    for(const {p,q} of items){if(stockOf(p.id)<q){err.textContent=`Solo quedan ${stockOf(p.id)} de “${p.name}”.`;return}}
    lsSet("dd_customer",c);items.forEach(({p,q})=>{S.stock[p.id]-=q});lsSet("dd_demo_stock",S.stock);
    const order={id:"DD-"+now.toString(36).toUpperCase().slice(-6),createdAt:now,deadline:now+S.config.slaHours*3600e3,items:items.map(({p,q})=>({id:p.id,name:p.name,qty:q,price:p.price})),total:t.total,customer:c,delivery:dlv,payment:pay,status:"nuevo"};
    const all=lsGet("dd_demo_orders",[]);all.push(order);lsSet("dd_demo_orders",all);S.cart={};saveCart();
    $("#layer").innerHTML=`<div class="scrim" data-close></div><aside class="drawer"><div class="dhead"><h2 class="display">¡Pedido listo!</h2><button class="x" data-close aria-label="Cerrar">✕</button></div><div class="dbody"><img class="empty__don" style="align-self:center" src="${MASCOT}" alt=""><div class="ok-box"><b>Pedido <span class="mono">${order.id}</span> registrado en modo demo.</b><br>Todavía no se cobra ni se guarda en servidor.</div><div class="row total"><span>Total</span><span class="num">${clp(order.total)}</span></div><button class="cta wide" data-close>Seguir comprando</button></div></aside>`;render();return}
  if(!S.db||!S.uid){err.textContent="Para comprar necesitas iniciar sesión en Claude con acceso de colaborador a esta tienda.";return}
  const items=cartItems();
  for(const {p,q} of items){if(stockOf(p.id)<q){err.textContent=`Solo quedan ${stockOf(p.id)} de “${p.name}”. Ajusta tu carrito.`;return}}
  btn.disabled=true;btn.textContent="Procesando pago…";
  lsSet("dd_customer",c);
  try{
    // descontar stock con relectura
    for(const {p,q} of items){const ref=S.db.doc("stock/"+p.id),snap=await ref.get(),cur=snap.exists?(snap.data().qty||0):0;if(cur<q)throw new Error(`Se agotó “${p.name}” mientras pagabas.`);await ref.set({qty:cur-q,updatedAt:Date.now()})}
    const t=cartTotals(dlv),now=Date.now();
    const order={id:"DD-"+now.toString(36).toUpperCase().slice(-6),createdAt:now,deadline:now+S.config.slaHours*3600e3,
      items:items.map(({p,q})=>({id:p.id,name:p.name,qty:q,price:p.price})),subtotal:t.sub,shipping:t.ship,total:t.total,
      delivery:dlv,payment:pay,paymentStatus:"pagado (demo)",status:"nuevo",customer:c};
    const ref=S.db.doc("orders/"+S.uid),snap=await ref.get(),list=snap.exists?(snap.data().list||[]):[];
    list.push(order);await ref.set({list,updatedAt:now});
    S.cart={};saveCart();
    $("#layer").innerHTML=`<div class="scrim" data-close></div><aside class="drawer"><div class="dhead"><h2 class="display">¡Pedido listo!</h2><button class="x" data-close aria-label="Cerrar">✕</button></div>
     <div class="dbody"><img class="empty__don" style="align-self:center" src="${MASCOT}" alt=""><div class="ok-box"><b>Pedido <span class="mono">${order.id}</span> confirmado.</b><br>Te escribiremos a ${esc(c.email)}. Lo preparamos antes de las <b>${new Date(order.deadline).toLocaleString("es-CL",{weekday:"long",hour:"2-digit",minute:"2-digit"})}</b>.</div>
     ${order.items.map(i=>`<div class="row"><span>${i.qty} × ${esc(i.name)}</span><span class="num">${clp(i.qty*i.price)}</span></div>`).join("")}
     <div class="row total"><span>Total</span><span class="num">${clp(order.total)}</span></div><button class="cta wide" data-close>Seguir comprando</button></div></aside>`;
  }catch(ex){err.textContent=ex.message&&!ex.code?ex.message:"No pudimos registrar el pedido. Revisa tu conexión e intenta de nuevo.";btn.disabled=false;btn.textContent="Reintentar pago"}
}

/* ---------- AI ASSISTANT (cliente) ---------- */
$("#fab").onclick=()=>{$("#chat").hidden=!$("#chat").hidden;if(!$("#chat").hidden)$("#chatIn").focus()};
$("#chatX").onclick=()=>$("#chat").hidden=true;
const chatHist=[];
$("#chatForm").onsubmit=async e=>{
  e.preventDefault();const q=$("#chatIn").value.trim();if(!q||!S.sample)return;$("#chatIn").value="";
  const msgs=$("#msgs");msgs.insertAdjacentHTML("beforeend",`<div class="bubble me">${esc(q)}</div>`);
  const b=document.createElement("div");b.className="bubble don";b.textContent="Pensando…";msgs.appendChild(b);msgs.scrollTop=msgs.scrollHeight;
  const cat=active().map(p=>({id:p.id,n:p.name,m:p.brand,c:p.category,pet:p.pet,precio:p.price,stock:stockOf(p.id),tags:p.tags}));
  chatHist.push("Cliente: "+q);
  try{
    const r=await S.sample.json(`Eres "El Don", el asesor de la tienda de mascotas Don Dog (Vitacura, Santiago de Chile). Hablas en español de Chile, cercano y breve (máx. 3 frases). Recomienda SOLO productos del catálogo con stock>0. Si nada calza, dilo y sugiere una categoría. No des diagnósticos veterinarios; ante síntomas, sugiere ir al veterinario.
Catálogo JSON: ${JSON.stringify(cat)}
Conversación:
${chatHist.slice(-6).join("\n")}
Responde SOLO JSON: {"reply":"texto","ids":["id de producto", "..."]} con como máximo 4 ids.`,{modelTier:"quick"});
    b.textContent=r.reply||"";chatHist.push("Don: "+(r.reply||""));
    (r.ids||[]).map(id=>S.products.find(p=>p.id===id)).filter(Boolean).forEach(p=>{const m=document.createElement("button");m.className="mini";m.innerHTML=`${phHTML(p)}<span style="flex:1;min-width:0"><b style="display:block;font-size:13px">${esc(p.name)}</b><span class="note num">${clp(p.price)}</span></span>`;m.onclick=()=>openProduct(p.id);msgs.appendChild(m)});
  }catch(ex){b.textContent=ex.code==="not_granted"?"Necesito tu permiso para usar la IA. Vuelve a intentarlo y acepta el aviso.":ex.code==="rate_limited"?"Muchas consultas seguidas. Espera un momento.":"No pude responder ahora. Intenta de nuevo."}
  msgs.scrollTop=msgs.scrollHeight;
};

/* ---------- ADMIN ---------- */
$("#adminBtn").onclick=()=>openAdmin();
function openAdmin(){if(!S.isAdmin)return;let a=$("#admin");if(!a){a=document.createElement("div");a.id="admin";a.className="admin";document.body.appendChild(a)}a.hidden=false;renderAdmin()}
function closeAdmin(){const a=$("#admin");if(a)a.hidden=true;render()}
function sevOf(o){if(["enviado","entregado","retirado"].includes(o.status))return"done";const left=o.deadline-Date.now();if(left<0)return"bad";if(left<6*3600e3)return"warn";return"ok"}
function leftTxt(ms){const neg=ms<0;ms=Math.abs(ms);const h=Math.floor(ms/3600e3),m=Math.floor(ms%3600e3/60e3);return (neg?"Atrasado ":"")+`${h} h ${String(m).padStart(2,"0")} min`}
function renderAdmin(){
  const a=$("#admin");if(!a||a.hidden)return;
  const tabs=[["pedidos","Pedidos"],["productos","Productos"],["stock","Stock"],["ajustes","Ajustes"]];
  a.innerHTML=`<div class="abar"><img src="${LOGO}" alt=""><h2 class="display">Panel Don Dog</h2>
   <div class="tabs">${tabs.map(([id,n])=>`<button data-tab="${id}" class="${S.adminTab===id?"on":""}">${n}</button>`).join("")}</div>
   <button class="x" id="admX" aria-label="Volver a la tienda">✕</button></div><div class="abody"><div class="wrap" id="abody"></div></div>`;
  a.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{S.adminTab=b.dataset.tab;renderAdmin()});
  $("#admX").onclick=closeAdmin;
  ({pedidos:admOrders,productos:admProducts,stock:admStock,ajustes:admSettings})[S.adminTab]();
}
function allOrders(){return S.orders.slice().sort((a,b)=>{const da=sevOf(a)==="done",db=sevOf(b)==="done";return da-db||a.deadline-b.deadline})}
function admOrders(){
  const os=allOrders(),open=os.filter(o=>sevOf(o)!=="done"),late=open.filter(o=>sevOf(o)==="bad").length,soon=open.filter(o=>sevOf(o)==="warn").length;
  const today=os.filter(o=>new Date(o.createdAt).toDateString()===new Date().toDateString());
  $("#abody").innerHTML=`<div class="kpis">
    <div class="kpi"><span class="eyebrow">Por preparar</span><b>${open.length}</b></div>
    <div class="kpi ${late?"alert":""}"><span class="eyebrow">Atrasados (+${S.config.slaHours} h)</span><b>${late}</b></div>
    <div class="kpi"><span class="eyebrow">Vencen en &lt; 6 h</span><b>${soon}</b></div>
    <div class="kpi"><span class="eyebrow">Ventas de hoy</span><b>${clp(today.reduce((s,o)=>s+o.total,0))}</b></div></div>
   <div class="bar"><button class="btn dark" id="copyTsv">Copiar pedidos para Google Sheets</button><button class="btn" id="dlCsv" ${S.downloads?"":"hidden"}>Descargar CSV</button>
   <span class="note">Copia y pega en tu hoja (celda A1). Cada artículo queda en una fila con su plazo de 24 h.</span></div>
   ${os.length?os.map(o=>{const sv=sevOf(o);return `<div class="order sev-${sv}"><div style="min-width:0">
     <div class="bar"><b class="mono">${esc(o.id)}</b><span class="pill ${sv==="done"?"mut":sv}">${esc(o.status)}</span><span class="pill mut">${o.delivery==="retiro"?"Retiro en tienda":"Despacho"}</span><span class="note">${new Date(o.createdAt).toLocaleString("es-CL")}</span></div>
     <div style="margin-top:6px"><b>${esc(o.customer?.name)}</b> · <span class="mono">${esc(o.customer?.phone)}</span> · ${esc(o.customer?.email)}${o.delivery==="despacho"?`<br>${esc(o.customer?.addr)}, ${esc(o.customer?.comuna)}`:""}</div>
     <ul>${o.items.map(i=>`<li><b class="num">${i.qty}×</b> ${esc(i.name)} <span class="note num">${clp(i.price*i.qty)}</span></li>`).join("")}</ul>
     <div class="note num" style="margin-top:6px">Total ${clp(o.total)} · ${esc(o.payment)} · ${esc(o.paymentStatus)}</div></div>
     <div class="side">${sv==="done"?`<span class="note">Cerrado</span>`:`<span class="eyebrow">Plazo de preparación</span><span class="clock" style="color:var(--${sv==="ok"?"ok":sv})">${leftTxt(o.deadline-Date.now())}</span>`}
     <select data-status="${esc(o._owner)}|${esc(o.id)}" style="width:auto">${["nuevo","preparando","listo",o.delivery==="retiro"?"retirado":"enviado","entregado"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select></div></div>`}).join(""):`<div class="empty"><b>Sin pedidos todavía</b>Cuando un cliente pague, el pedido aparece aquí con su cuenta regresiva de ${S.config.slaHours} horas.</div>`}`;
  document.querySelectorAll("[data-status]").forEach(s=>s.onchange=()=>setStatus(...s.dataset.status.split("|"),s.value));
  $("#copyTsv").onclick=async()=>{const tsv=ordersTable().map(r=>r.join("\t")).join("\n");try{await navigator.clipboard.writeText(tsv);toast("Copiado. Pégalo en Google Sheets")}catch(e){toast("No se pudo copiar; usa Descargar CSV")}};
  $("#dlCsv").onclick=async()=>{const csv=ordersTable().map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");try{await S.downloads.save({filename:`pedidos-dondog-${new Date().toISOString().slice(0,10)}.csv`,data:new Blob(["﻿"+csv],{type:"text/csv"})})}catch(e){if(e?.code!=="cancelled")toast("No se descargó el archivo")}};
}
function ordersTable(){const rows=[["Pedido","Fecha","Plazo (24 h)","Estado","Cliente","Teléfono","Correo","Entrega","Dirección","Comuna","Producto","Cantidad","Precio unit.","Total pedido","Pago"]];
  allOrders().forEach(o=>o.items.forEach(i=>rows.push([o.id,new Date(o.createdAt).toLocaleString("es-CL"),new Date(o.deadline).toLocaleString("es-CL"),o.status,o.customer?.name,o.customer?.phone,o.customer?.email,o.delivery,o.customer?.addr||"",o.customer?.comuna||"",i.name,i.qty,i.price,o.total,o.payment])));return rows}
async function setStatus(owner,id,status){try{const ref=S.db.doc("orders/"+owner),snap=await ref.get(),list=(snap.data()?.list||[]).map(o=>o.id===id?{...o,status,statusAt:Date.now()}:o);await ref.update({list});toast("Estado actualizado")}catch(e){toast("No se pudo actualizar el estado")}}

function admProducts(){
  const ps=S.products.slice().sort((a,b)=>a.name.localeCompare(b.name));
  $("#abody").innerHTML=`<div class="bar"><button class="btn acc" id="newP">+ Nuevo producto</button><span class="note">${ps.length} productos · los marcados como destacados salen en la portada.</span></div>
  <div id="pform"></div>
  <div class="tablewrap"><table><thead><tr><th></th><th>Producto</th><th>Categoría</th><th class="r">Precio</th><th class="r">Stock</th><th>Portada</th><th></th></tr></thead><tbody>
  ${ps.map(p=>`<tr><td><div class="thumb" style="width:44px;height:44px;border-radius:8px;overflow:hidden">${phHTML(p)}</div></td><td><b>${esc(p.name)}</b><br><span class="note">${esc(p.brand||"")}${p.active===false?" · oculto":""}</span></td><td>${esc(catById[p.category]?.name||"")}<br><span class="note">${esc(PETS.find(x=>x.id===p.pet)?.name||"Todos")}</span></td><td class="r num">${clp(p.price)}</td><td class="r num">${stockOf(p.id)}</td><td>${p.featured?'<span class="pill ok">Destacado</span>':""}</td><td><button class="btn sm" data-edit="${p.id}">Editar</button></td></tr>`).join("")||`<tr><td colspan="7" class="note">Aún no hay productos.</td></tr>`}
  </tbody></table></div>`;
  $("#newP").onclick=()=>productForm(null);
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>productForm(b.dataset.edit));
}
function productForm(id){
  const p=id?S.products.find(x=>x.id===id):{name:"",brand:"",category:"alimentos",pet:"perro",price:"",oldPrice:"",featured:false,active:true,description:"",tags:[]};
  let imageId=p.imageId||"",imgBlob=null;
  $("#pform").innerHTML=`<div class="panel"><h3>${id?"Editar producto":"Nuevo producto"}</h3>
   ${S.sample?`<div class="ai"><b>Completar con IA</b><span class="note" style="color:var(--ink)">Escribe el nombre (y si quieres sube la foto). La IA propone categoría, descripción, etiquetas y precio de referencia; tú revisas y guardas.</span><div class="bar"><button class="btn dark" id="aiFill" type="button">Completar ficha con IA</button><span class="note" id="aiMsg"></span></div></div>`:""}
   <div class="split"><div class="form">
    <label class="full">Nombre<input id="pName" type="text" value="${esc(p.name)}"></label>
    <label>Marca<input id="pBrand" type="text" value="${esc(p.brand)}"></label>
    <label>Categoría<select id="pCat">${CATS.map(c=>`<option value="${c.id}" ${c.id===p.category?"selected":""}>${c.name}</option>`).join("")}</select></label>
    <label>Mascota<select id="pPet">${[...PETS,{id:"todos",name:"Todas"}].map(x=>`<option value="${x.id}" ${x.id===p.pet?"selected":""}>${x.name}</option>`).join("")}</select></label>
    <label>Stock<input id="pStock" type="number" min="0" value="${id?stockOf(id):0}"></label>
    <label>Precio (CLP)<input id="pPrice" type="number" min="0" value="${esc(p.price)}"></label>
    <label>Precio antes (opcional)<input id="pOld" type="number" min="0" value="${esc(p.oldPrice||"")}"></label>
    <label class="full">Descripción<textarea id="pDesc" rows="4">${esc(p.description)}</textarea></label>
    <label class="full">Etiquetas (separadas por coma)<input id="pTags" type="text" value="${esc((p.tags||[]).join(", "))}"></label>
    <label class="check"><input id="pFeat" type="checkbox" ${p.featured?"checked":""}> Destacado en portada</label>
    <label class="check"><input id="pAct" type="checkbox" ${p.active!==false?"checked":""}> Visible en la tienda</label>
   </div><div style="display:flex;flex-direction:column;gap:10px">
    <span class="eyebrow">Foto</span><div class="imgprev" id="pPrev">${phHTML(p)}</div>
    ${S.assets?`<label class="btn" style="align-self:start">Subir foto<input id="pImg" type="file" accept="image/*" hidden></label>`:`<span class="note">Subir fotos requiere permiso de editor.</span>`}
    <label>o URL de imagen<input id="pUrl" type="url" placeholder="https://…" value="${esc(p.imageUrl||"")}"></label>
    <span class="note">Las imágenes de otros sitios pueden no cargar dentro de esta vista previa; subir la foto es lo más seguro.</span>
   </div></div>
   <div class="err" id="pErr"></div>
   <div class="bar"><button class="btn acc" id="pSave" type="button">Guardar</button><button class="btn" id="pCancel" type="button">Cancelar</button>${id?`<button class="btn" id="pDel" type="button" style="margin-left:auto">Eliminar</button>`:""}</div></div>`;
  $("#pform").scrollIntoView({behavior:"smooth",block:"start"});
  const img=$("#pImg");if(img)img.onchange=()=>{imgBlob=img.files[0];if(imgBlob)$("#pPrev").innerHTML=`<img src="${URL.createObjectURL(imgBlob)}" alt="">`};
  $("#pCancel").onclick=()=>$("#pform").innerHTML="";
  const ai=$("#aiFill");if(ai)ai.onclick=async()=>{
    const name=$("#pName").value.trim();if(!name&&!imgBlob){$("#aiMsg").textContent="Escribe al menos el nombre o sube una foto.";return}
    ai.disabled=true;$("#aiMsg").textContent="Generando ficha…";
    try{let images;if(imgBlob){const lim=await S.sample.limits();if(lim.images&&imgBlob.size<=lim.images.maxInputBytes)images=[imgBlob]}
      const r=await S.sample.json(`Eres el encargado de catálogo de Don Dog, pet shop premium en Vitacura, Chile. Con el nombre${images?" y la foto":""} del producto, completa la ficha en español de Chile.
Nombre ingresado: "${name}"
Categorías válidas: ${CATS.map(c=>c.id).join(", ")}. Mascota: perro, gato, otros o todos.
Descripción: 2-3 frases persuasivas y útiles para SEO (beneficios, para quién es, formato). No inventes certificaciones ni datos médicos.
Precio: precio de referencia razonable en pesos chilenos para el retail chileno (entero), o 0 si no tienes idea.
Responde SOLO JSON: {"name":"nombre comercial limpio","brand":"","category":"","pet":"","description":"","tags":["5 etiquetas"],"price":0}`,{images,modelTier:"default"});
      if(r.name)$("#pName").value=r.name;if(r.brand)$("#pBrand").value=r.brand;if(catById[r.category])$("#pCat").value=r.category;if(["perro","gato","otros","todos"].includes(r.pet))$("#pPet").value=r.pet;if(r.description)$("#pDesc").value=r.description;if(r.tags)$("#pTags").value=r.tags.join(", ");if(r.price&&!$("#pPrice").value)$("#pPrice").value=Math.round(r.price);
      $("#aiMsg").textContent="Listo. Revisa los datos y el precio antes de guardar.";
    }catch(e){$("#aiMsg").textContent=e.code==="not_granted"?"Acepta el permiso de IA para usar esta función.":"La IA no respondió. Intenta otra vez."}
    ai.disabled=false};
  $("#pSave").onclick=async()=>{
    const name=$("#pName").value.trim(),price=+$("#pPrice").value;
    if(!name||!(price>0)){$("#pErr").textContent="El producto necesita nombre y un precio mayor que 0.";return}
    const btn=$("#pSave");btn.disabled=true;btn.textContent="Guardando…";
    try{
      if(imgBlob&&S.assets){const up=await S.assets.upload(imgBlob);imageId=up.id}
      const pid=id||("p"+Date.now().toString(36));
      const data={name,brand:$("#pBrand").value.trim(),category:$("#pCat").value,pet:$("#pPet").value,price,oldPrice:+$("#pOld").value||0,description:$("#pDesc").value.trim(),tags:$("#pTags").value.split(",").map(s=>s.trim()).filter(Boolean),featured:$("#pFeat").checked,active:$("#pAct").checked,imageId,imageUrl:$("#pUrl").value.trim(),updatedAt:Date.now(),createdAt:p.createdAt||Date.now()};
      await S.db.doc("products/"+pid).set(data);
      await S.db.doc("stock/"+pid).set({qty:Math.max(0,parseInt($("#pStock").value)||0),updatedAt:Date.now()});
      toast("Producto guardado");$("#pform").innerHTML="";
    }catch(e){$("#pErr").textContent=e.code==="too_large"?"La foto pesa demasiado (máx. 20 MB).":"No se pudo guardar. Revisa tu conexión.";btn.disabled=false;btn.textContent="Guardar"}
  };
  const del=$("#pDel");if(del)del.onclick=()=>{if(del.dataset.sure){S.db.doc("products/"+id).delete().then(()=>{S.db.doc("stock/"+id).delete();toast("Producto eliminado");$("#pform").innerHTML=""})}else{del.dataset.sure=1;del.textContent="Confirmar eliminar";del.style.borderColor="var(--bad)";del.style.color="var(--bad)"}};
}
function admStock(){
  const ps=S.products.slice().sort((a,b)=>stockOf(a.id)-stockOf(b.id)),low=ps.filter(p=>stockOf(p.id)<=S.config.lowStock);
  const val=ps.reduce((s,p)=>s+p.price*stockOf(p.id),0),units=ps.reduce((s,p)=>s+stockOf(p.id),0);
  $("#abody").innerHTML=`<div class="kpis"><div class="kpi"><span class="eyebrow">Productos</span><b>${ps.length}</b></div><div class="kpi"><span class="eyebrow">Unidades</span><b>${units}</b></div>
   <div class="kpi ${low.length?"alert":""}"><span class="eyebrow">Stock bajo (≤ ${S.config.lowStock})</span><b>${low.length}</b></div><div class="kpi"><span class="eyebrow">Valor a precio venta</span><b>${clp(val)}</b></div></div>
   ${S.sample?`<div class="ai"><div class="bar"><b>Análisis de stock con IA</b><button class="btn dark sm" id="aiStock">Analizar y sugerir reposición</button></div><div class="ai-out" id="aiOut">Cruza el stock actual con las ventas de los últimos 30 días y te dice qué reponer primero.</div></div>`:""}
   <div class="tablewrap"><table><thead><tr><th>Producto</th><th>Estado</th><th class="r">Vendidos 30 d</th><th class="r">Stock</th><th></th></tr></thead><tbody>
   ${ps.map(p=>{const n=stockOf(p.id);return `<tr><td><b>${esc(p.name)}</b><br><span class="note">${esc(catById[p.category]?.name||"")}</span></td><td><span class="pill ${n<=0?"bad":n<=S.config.lowStock?"warn":"ok"}">${n<=0?"Agotado":n<=S.config.lowStock?"Bajo":"OK"}</span></td><td class="r num">${sold30(p.id)}</td>
    <td class="r"><input class="stockin num" type="number" min="0" id="st-${p.id}" value="${n}"></td><td><button class="btn sm" data-st="${p.id}">Guardar</button></td></tr>`}).join("")||`<tr><td colspan="5" class="note">Sin productos.</td></tr>`}</tbody></table></div>`;
  document.querySelectorAll("[data-st]").forEach(b=>b.onclick=async()=>{const id=b.dataset.st,v=Math.max(0,parseInt($("#st-"+id).value)||0);try{await S.db.doc("stock/"+id).set({qty:v,updatedAt:Date.now()});toast("Stock actualizado")}catch(e){toast("No se pudo guardar el stock")}});
  const ai=$("#aiStock");if(ai)ai.onclick=async()=>{ai.disabled=true;const out=$("#aiOut");out.textContent="Analizando…";
    const data=S.products.map(p=>({producto:p.name,categoria:p.category,precio:p.price,stock:stockOf(p.id),vendidos30d:sold30(p.id)}));
    try{await S.sample(`Eres analista de inventario de Don Dog, pet shop en Vitacura, Chile. Datos: ${JSON.stringify(data)}. Umbral de stock bajo: ${S.config.lowStock}.
Entrega en español, en texto plano sin markdown, máximo 10 líneas: 1) qué reponer urgente y cuántas unidades sugeridas (cubrir ~30 días según ventas), 2) productos sin rotación, 3) una idea de promoción para mover stock. Sé concreto.`,{modelTier:"default",onText:u=>out.textContent=u.text})}catch(e){out.textContent=e.code==="not_granted"?"Acepta el permiso de IA para usar el análisis.":"La IA no respondió. Intenta otra vez."}ai.disabled=false};
}
function sold30(id){const from=Date.now()-30*864e5;return S.orders.filter(o=>o.createdAt>=from).reduce((s,o)=>s+o.items.filter(i=>i.id===id).reduce((a,i)=>a+i.qty,0),0)}
function admSettings(){
  const c=S.config;
  $("#abody").innerHTML=`<div class="panel"><h3>Reglas de la tienda</h3><div class="form">
    <label>Plazo de preparación (horas)<input id="sSla" type="number" min="1" value="${c.slaHours}"></label>
    <label>Alerta de stock bajo (unidades)<input id="sLow" type="number" min="0" value="${c.lowStock}"></label>
    <label>Despacho gratis desde (CLP)<input id="sFree" type="number" min="0" value="${c.freeShip}"></label>
    <label>Costo de despacho (CLP)<input id="sShip" type="number" min="0" value="${c.shipCost}"></label></div>
    <div class="bar"><button class="btn acc" id="sSave">Guardar ajustes</button></div></div>
   <div class="panel"><h3>Google Sheets automático</h3>
    <p class="note" style="margin:0">Hoy puedes copiar los pedidos con el botón de la pestaña Pedidos. Para que lleguen solos a tu hoja, conecta Google Drive en Claude y deja una tarea programada que pase los pedidos nuevos a la hoja cada hora. En la versión publicada en tu dominio, la tienda los envía al instante con un Apps Script.</p></div>
   <div class="panel"><h3>Pago real</h3><p class="note" style="margin:0">El cobro está en modo demostración. Para cobrar de verdad se conecta Webpay Plus (Transbank) o Mercado Pago Checkout Pro con las credenciales de tu comercio en el servidor de la tienda publicada.</p></div>`;
  $("#sSave").onclick=async()=>{try{await S.db.doc("config/store").set({slaHours:+$("#sSla").value||24,lowStock:+$("#sLow").value||0,freeShip:+$("#sFree").value||0,shipCost:+$("#sShip").value||0,updatedAt:Date.now()});toast("Ajustes guardados")}catch(e){toast("No se pudieron guardar los ajustes")}};
}
setInterval(()=>{if(S.adminTab==="pedidos"&&$("#admin")&&!$("#admin").hidden&&!document.activeElement?.matches("select"))admOrders()},60e3);


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
render();
(async()=>{
  const loadDemo=()=>{S.demo=true;S.products=(window.DEMO_PRODUCTS||[]).map(p=>({...p}));const saved=lsGet("dd_demo_stock",null);S.stock=saved||Object.fromEntries(S.products.map(p=>[p.id,p.stock]));S.loaded=true;render()};
  const C=window.claude;if(!C?.use){loadDemo();return}
  const [db,user,sample]=await Promise.all([C.use("db"),C.use("user"),C.use("sample")]);
  S.db=db;S.user=user;S.sample=sample;$("#fab").hidden=!sample;
  if(user){try{S.uid=await user.id()}catch(e){}try{S.isAdmin=!!(await user.canEdit())}catch(e){}}
  if(S.isAdmin){$("#adminBtn").hidden=false;C.use("assets").then(a=>{S.assets=a});C.use("downloads").then(d=>{S.downloads=d})}
  if(!db){loadDemo();return}
  let gotP=false,gotS=false;const done=()=>{if(gotP&&gotS){S.loaded=true;render();renderAdmin()}};
  db.collection("products").onSnapshot(s=>{S.products=s.docs.map(d=>({id:d.id,...d.data()}));gotP=true;done()},()=>{gotP=true;done()});
  db.collection("stock").onSnapshot(s=>{S.stock={};s.docs.forEach(d=>S.stock[d.id]=d.data().qty||0);gotS=true;done()},()=>{gotS=true;done()});
  db.doc("config/store").onSnapshot(s=>{if(s.exists)Object.assign(S.config,s.data());if(S.loaded){render();renderAdmin()}});
  if(S.isAdmin)db.collection("orders").onSnapshot(s=>{S.orders=s.docs.flatMap(d=>(d.data().list||[]).map(o=>({...o,_owner:d.id})));renderAdmin()});
})();
