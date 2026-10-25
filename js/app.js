// ===== アプリ本体 =====
(function(){
"use strict";
const KEY = "dq10otasuke:v1";
const $ = (s, el=document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = (s) => String(s||"").toLowerCase().replace(/[ァ-ン]/g, c => String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,"");

// ---- 保存データ ----
const DEF = {fav:{},done:{},petDone:{},myRes:[],myJob:"",gear:"",resByJob:{},gearByJob:{},theme:"",font:"m",
  daily:{items:null,checked:{},key:""},weekly:{items:null,checked:{},key:""},
  zel:{cells:Array(12).fill(0),uroko:0,floor:20,parts:{},want:{}},
  f:{coinCat:"",onlyJob:false,onlyRes:false,ver7:false,hideDone:false,sort:"ver",evGroup:"",petT:""}};
let S;
function load(){ try{ S = Object.assign(structuredClone(DEF), JSON.parse(localStorage.getItem(KEY)||"{}")); }catch(e){ S = structuredClone(DEF); }
  S.f = Object.assign(structuredClone(DEF.f), S.f||{}); S.zel = Object.assign(structuredClone(DEF.zel), S.zel||{});
  // 職業ごとの耐性・装備メモ（前の版の記録は、その時の職業のものとして引き継ぐ）
  S.resByJob=S.resByJob||{}; S.gearByJob=S.gearByJob||{}; const k=S.myJob||"";
  if(!(k in S.resByJob)) S.resByJob[k]=[...(S.myRes||[])]; if(!(k in S.gearByJob)) S.gearByJob[k]=S.gear||"";
  S.myRes=S.resByJob[k]; S.gear=S.gearByJob[k]; }
function setJob(j){ S.resByJob[S.myJob||""]=S.myRes; S.gearByJob[S.myJob||""]=S.gear; S.myJob=j||"";
  if(!(S.myJob in S.resByJob)) S.resByJob[S.myJob]=[]; if(!(S.myJob in S.gearByJob)) S.gearByJob[S.myJob]="";
  S.myRes=S.resByJob[S.myJob]; S.gear=S.gearByJob[S.myJob]; }
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
load();

// ---- 表示設定 ----
function applyLook(){ const r=document.documentElement; if(S.theme) r.setAttribute("data-theme",S.theme); else r.removeAttribute("data-theme"); r.setAttribute("data-font",S.font||"m"); }
applyLook();

// ---- 便利関数 ----
function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
async function copy(text){ try{ await navigator.clipboard.writeText(text); toast("コピーしました"); }catch(e){ const ta=document.createElement("textarea"); ta.value=text; document.body.appendChild(ta); ta.select(); try{document.execCommand("copy"); toast("コピーしました");}catch(_){toast("コピーできませんでした。長押しで選択してください");} ta.remove(); } }
const srcLinks = (keys) => (keys||[]).map(k=>SRC[k]?`<a href="${esc(SRC[k].u)}" target="_blank" rel="noopener">${esc(SRC[k].t)}</a>`:"").filter(Boolean).join("<br>");
const isOld = (era) => /実装当時|古い|2023|記事時点/.test(era||"");
const eraBadge = (era) => era ? `<span class="badge ${isOld(era)?"old":(/Ver8/.test(era)?"new":"")}">${esc(era)}${isOld(era)&&!/要確認/.test(era)?"・要確認":""}</span>` : "";
const verNum = (v) => parseFloat(String(v).replace(/[^\d.]/g,""))||0;
const jobNames = JOBS.map(j=>j.n);
function slotFits(slot, job){ if(slot===job) return true; if(slot in FREE_SLOTS){ const l=FREE_SLOTS[slot]; return !l || l.includes(job); } if(slot==="補助"||slot==="同行") return true; return false; }
function partyHas(p, job){ return !!job && p.jobs.some(s=>slotFits(s,job)); }
function borrow(p, job){ const rest=[...p.jobs]; let i=rest.indexOf(job); if(i<0) i=rest.findIndex(s=>slotFits(s,job)); if(i>=0) rest.splice(i,1); return rest; }
const missing = (need) => (need||[]).filter(s=>!S.myRes.includes(s));
function textOf(o){ return norm(JSON.stringify(o)); }

// ---- 解析（GoatCounter） ----
function gcCount(path){ try{ if(window.goatcounter && window.goatcounter.count) window.goatcounter.count({path, title:document.title}); }catch(e){} }
if(CONFIG.goatcounterCode){ const s=document.createElement("script"); s.async=true; s.src="https://gc.zgo.at/count.js"; s.dataset.goatcounter=`https://${CONFIG.goatcounterCode}.goatcounter.com/count`; s.dataset.goatcounterSettings='{"no_onload":true}'; s.onload=()=>gcCount("/"+(cur||"home")); document.head.appendChild(s); }

// ---- 日課・週課のリセット（日本時間 6:00） ----
function jstNow(){ return new Date(Date.now()+9*3600e3); }
function dailyKey(){ const d=new Date(jstNow().getTime()-6*3600e3); return d.toISOString().slice(0,10); }
function weeklyKey(){ const d=new Date(jstNow().getTime()-6*3600e3); d.setUTCDate(d.getUTCDate()-d.getUTCDay()); return d.toISOString().slice(0,10); }
function resetCheck(){ if(!S.daily.items) S.daily.items=[...DAILY_DEFAULT]; if(!S.weekly.items) S.weekly.items=[...WEEKLY_DEFAULT];
  const dk=dailyKey(), wk=weeklyKey(); if(S.daily.key!==dk){S.daily.key=dk;S.daily.checked={};} if(S.weekly.key!==wk){S.weekly.key=wk;S.weekly.checked={};} save(); }
resetCheck();

// ---- ビュー定義 ----
const VIEWS = [
 {id:"home",label:"ホーム"},{id:"coin",label:"コインボス",list:()=>COIN},{id:"event",label:"高難度・イベント",list:()=>EV},
 {id:"lv",label:"レベル上げ",list:()=>LV},{id:"pet",label:"仲間モンスター",list:()=>PET},{id:"support",label:"サポ仲間の探し方"},
 {id:"zel",label:"ゼルメア"},{id:"daily",label:"日課・週課"},{id:"cal",label:"カレンダー"},{id:"my",label:"マイ耐性・装備"},
 {id:"fav",label:"お気に入り"},{id:"recruit",label:"募集文"},{id:"job",label:"職業ガイド",list:()=>JOBS},{id:"orb",label:"宝珠・アクセ"},
 {id:"gold",label:"金策"},{id:"gloss",label:"用語",list:()=>GLOSS},{id:"about",label:"評価・このアプリ"}
];
let cur="home", q="", onlyId="";

function counts(){ const nq=norm(q); const m={}; VIEWS.forEach(v=>{ if(v.list && nq){ m[v.id]=v.list().filter(o=>textOf(o).includes(nq)).length; } }); return m; }
function renderTabs(){ const c=counts(); $("#tabs").innerHTML = VIEWS.map(v=>`<button class="tab" role="tab" data-v="${v.id}" aria-selected="${v.id===cur}">${esc(v.label)}${c[v.id]!=null?`<span class="n">${c[v.id]}</span>`:""}</button>`).join(""); const a=$(`.tab[aria-selected="true"]`); if(a) a.scrollIntoView({inline:"center",block:"nearest"}); }

let depth=0; try{ history.scrollRestoration="manual"; }catch(e){}
function go(v, opts={}){ if(!VIEWS.find(x=>x.id===v)) v="home";
  const changed = v!==cur || (!opts.keepId && onlyId) || opts.keepId;
  if(!opts.fromPop && !opts.init){ try{ history.replaceState(Object.assign({},history.state,{v:cur,id:onlyId,y:window.scrollY,d:depth}),""); }catch(e){} }
  cur=v; if(!opts.keepId) onlyId="";
  renderTabs(); render(); updateNav();
  if(opts.fromPop){ const y=opts.y||0; window.scrollTo({top:y}); requestAnimationFrame(()=>window.scrollTo({top:y})); }
  else if(!opts.noScroll) window.scrollTo({top:0});
  try{ const url=location.pathname+location.search.replace(/[?&](v|id)=[^&]*/g,"").replace(/^&/,"?")+"#"+v;
    if(opts.init) history.replaceState({v,id:onlyId,y:0,d:0},"",url);
    else if(!opts.fromPop && changed){ depth++; history.pushState({v,id:onlyId,y:0,d:depth},"",url); }
  }catch(e){}
  updateNav(); gcCount("/"+v); }
function updateNav(){ const b=$("#nav-back"); if(b) b.hidden = depth<=0 && cur==="home"; }
window.addEventListener("popstate",(e)=>{ const st=e.state||{v:(location.hash||"#home").slice(1),y:0,d:0}; depth=st.d||0; onlyId=st.id||""; go(st.v||"home",{fromPop:true,keepId:true,y:st.y}); });
function goBack(){ if(depth>0) history.back(); else go("home"); }
window.addEventListener("scroll",()=>{ const t=$("#nav-top"); if(t) t.hidden = window.scrollY<600; },{passive:true});

// ---- 共通UI ----
function jobSelect(id){ return `<select id="${id}" aria-label="自分の職業"><option value="">自分の職業：選ばない</option>${JOBS.map(j=>`<option ${S.myJob===j.n?"selected":""}>${esc(j.n)}</option>`).join("")}</select>`; }
function needChips(need, dmg){ const miss=missing(need); const st=(need||[]).map(s=>`<span class="chip ${S.myRes.length?(miss.includes(s)?"ng":"ok"):""}">${esc(s)}${S.myRes.length?(miss.includes(s)?" ✕":" ✓"):""}</span>`).join(""); const dm=(dmg||[]).map(s=>`<span class="chip dmg">${esc(s)}軽減</span>`).join(""); return (st||dm)?`<div class="chips">${st}${dm}</div>`:`<span class="lead">特になし</span>`; }
function partyHTML(p){ const hit=partyHas(p,S.myJob); const jobs=p.jobs.map(s=>{ const me=S.myJob&&slotFits(s,S.myJob)&&s===S.myJob; const free=s in FREE_SLOTS; return `<span class="chip ${me?"me":""} ${free?"free":""}">${esc(s)}</span>`; }).join("");
  const b = hit ? `<div class="borrow">サポで借りる：<b>${esc(borrow(p,S.myJob).join("・"))}</b></div>` : "";
  return `<div class="party ${hit?"hit":""}"><div class="chips">${jobs}</div>${p.note?`<div class="note">${esc(p.note)}</div>`:""}${b}<div>${eraBadge(p.era)}</div></div>`; }
function cardActions(kind, o){ const id=o.id; return `<div class="actions">
  <button class="btn" data-act="fav" data-id="${kind}:${esc(id)}" aria-pressed="${!!S.fav[kind+":"+id]}">☆ お気に入り</button>
  ${kind!=="lv"?`<button class="btn" data-act="done" data-id="${kind}:${esc(id)}" aria-pressed="${!!S.done[kind+":"+id]}">✓ 討伐済み</button>`:""}
  ${kind!=="lv"?`<button class="btn" data-act="recruit" data-id="${kind}:${esc(id)}">募集文</button>`:""}
  <button class="btn" data-act="share" data-id="${kind}:${esc(id)}">共有リンク</button>
  <button class="btn" data-act="report" data-id="${esc(o.name)}">誤りを報告</button></div>`; }
// 「何を装備すればいいか」をひと目で
const FORCE={"炎":"ファイアフォース","氷":"アイスフォース","風":"ストームフォース","光":"ライトフォース","闇":"ダークフォース"};
const ELEM=["炎","氷","風","雷","土","光","闇"];
function equipBox(o){ if(!o.weak && !o.need && !o.dmg) return "";
  const w=o.weak||""; const we=ELEM.filter(e=>w.split(/[（(]/)[0].includes(e) && !/^なし/.test(w));
  const atk = o.weak ? `${esc(w)}${we.length?`<br><span class="hint">→ ${we.map(e=>esc(e)+"属性の武器・呪文"+(FORCE[e]?"／"+FORCE[e]:"")).join("、")}</span>`:(/^なし|等倍/.test(w)?`<br><span class="hint">→ 属性にこだわらず火力重視（無属性でOK）</span>`:"")}` : `<span class="lead">情報なし（要確認）</span>`;
  const dm=(o.dmg||[]); const arm = dm.length ? dm.map(d=>esc(d)+(ELEM.includes(d)?"属性":"")+"ダメージ減").join("・") : "特になし";
  const st=(o.need||[]); const acc = st.length ? st.map(x=>esc(x)+(x==="弱体"?"ガード（幻界王の首かざり等）":"ガード")).join("・") : "特になし";
  return `<div class="equip"><h4>装備の目安</h4><dl class="kv">
   <dt>武器・攻撃</dt><dd>${atk}</dd>
   ${o.res?`<dt>効きにくい</dt><dd>${esc(o.res)}</dd>`:""}
   <dt>防具（体・盾）</dt><dd>${arm}</dd>
   <dt>頭・足・アクセ</dt><dd>${acc}</dd>
   ${o.prio?`<dt>耐性の重要度</dt><dd>${esc(o.prio)}<br><span class="hint">◎必須 ○あると楽 △余裕があれば</span></dd>`:""}
   ${o.resnote?`<dt>耐性について</dt><dd>${esc(o.resnote)}</dd>`:""}
   ${o.gear?`<dt>おすすめ装備</dt><dd>${esc(o.gear)}</dd>`:""}
  </dl></div>`; }
// 参加ガイドと「この情報で参加できるか」のチェック
function joinInfo(kind,o){ return kind==="coin"?COIN_INFO:(typeof GINFO!=="undefined"?GINFO[o.g]:null); }
function readiness(kind,o){ const g=joinInfo(kind,o)||{}; const ok=(t)=>!!t&&!/要確認/.test(t);
  return [["参加条件・行き方",ok(g.cond)&&ok(g.where)],["弱点",!!o.weak],["耐性",!!((o.need&&o.need.length)||(o.dmg&&o.dmg.length)||o.resnote)],["編成",!!(o.parties&&o.parties.length)],["立ち回り",!!((o.acts&&o.acts.length)||o.tips)],["仲間モンスター",ok(g.pet)]]; }
function guideBox(kind,o){ const g=joinInfo(kind,o); const r=readiness(kind,o); const lack=r.filter(x=>!x[1]).length;
  const chips=r.map(([t,v])=>`<span class="chip ${v?"ok":"ng"}">${esc(t)}${v?" ✓":" 不足"}</span>`).join("");
  return `<details class="guide"><summary>参加ガイド <span class="badge ${lack?"warn":"new"}">${lack?"不足 "+lack:"そろっています"}</span></summary>
  <div class="chips">${chips}</div>
  ${g?`<dl class="kv"><dt>参加条件</dt><dd>${esc(g.cond||"要確認")}</dd><dt>行き方</dt><dd>${esc(g.where||"要確認")}</dd><dt>人数</dt><dd>${esc(g.size||"要確認")}</dd>${g.reward?`<dt>報酬など</dt><dd>${esc(g.reward)}</dd>`:""}<dt>仲間モンスター</dt><dd>${esc(g.pet||"要確認")}</dd></dl>${g.src&&g.src.length?`<div class="src">出典：${srcLinks(g.src)}</div>`:""}`:`<p class="lead">参加ガイドは準備中です。</p>`}
  ${lack?`<p class="hint">「不足」の項目は調査中です。知っている情報があれば「誤りを報告」から教えてください。</p>`:""}</details>`; }
// ひと目で分かる：おすすめ職業・必要な耐性・攻め方
function prioTiers(t){ const out={"◎":[],"○":[],"△":[]}; (t||"").split(/\s*[　]\s*/).forEach(seg=>{ const m=seg.match(/^([◎○△])(.*)$/); if(m) out[m[1]].push(m[2]); }); return out; }
function jobChips(list,cls){ return (list||[]).map(j=>`<span class="chip ${cls||""} ${S.myJob===j?"me":""}">${esc(j)}</span>`).join(""); }
function quickBox(kind,o){
  let jobs="";
  if(o.jt){ const t=o.jt; const mine=S.myJob?(["◎","○","△","×"].find(k=>(t[k]||[]).includes(S.myJob))||""):null;
    jobs=`${mine!=null?`<p class="mine">${esc(S.myJob)}は ${mine?`<b class="tier t${"◎○△×".indexOf(mine)}">${mine}</b>`:"評価の記載なし"}</p>`:""}
    ${["◎","○"].filter(k=>t[k]&&t[k].length).map(k=>`<div class="qrow"><span class="tier t${"◎○△×".indexOf(k)}">${k}</span><div class="chips">${jobChips(t[k])}</div></div>`).join("")}
    ${(t["△"]||t["×"])?`<details class="roles"><summary>△・×の職業も見る</summary>${["△","×"].filter(k=>t[k]&&t[k].length).map(k=>`<div class="qrow"><span class="tier t${"◎○△×".indexOf(k)}">${k}</span><div class="chips">${jobChips(t[k])}</div></div>`).join("")}</details>`:""}
    ${t.note?`<p class="hint">${esc(t.note)}</p>`:""}
    ${t.roles?`<details class="roles"><summary>役割ごとに見る</summary><dl class="kv">${t.roles.map(([r,v])=>`<dt>${esc(r)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></details>`:""}
    ${t.four?`<p class="hint">${esc(t.four)}</p>`:""}`;
  } else { const c={}; (o.parties||[]).forEach(p=>p.jobs.forEach(j=>{ if(!(j in FREE_SLOTS)) c[j]=(c[j]||0)+1; })); const top=Object.keys(c).sort((a,b)=>c[b]-c[a]).slice(0,8);
    jobs = top.length?`<div class="qrow"><span class="tier t1">例</span><div class="chips">${jobChips(top)}</div></div><p class="hint">下の編成例によく出てくる職業です</p>`:`<p class="lead">職業の情報は準備中です</p>`; }
  const pt=prioTiers(o.prio); const has=pt["◎"].length||pt["○"].length;
  const res = has ? ["◎","○","△"].filter(k=>pt[k].length).map(k=>`<div class="qrow"><span class="tier t${"◎○△".indexOf(k)}">${k==="◎"?"必須":k==="○"?"あると楽":"余裕があれば"}</span><div class="qtext">${esc(pt[k].join("／"))}</div></div>`).join("")
    : `<div class="qrow"><span class="tier t0">${!(o.need||[]).length&&!(o.dmg||[]).length&&o.resnote?"目安":"必須"}</span><div class="qtext">${esc([...(o.need||[]).map(x=>x+"ガード"),...(o.dmg||[]).map(x=>x+"ダメージ減")].join("・")||o.resnote||"特になし")}</div></div>`;
  const w=o.weak?esc(o.weak.split(/[（(]/)[0]):"情報なし";
  return `<div class="quick">
   <div class="qsec"><h4>行くならこの職業</h4>${jobs}</div>
   <div class="qsec"><h4>必要な耐性 ${S.myRes.length?`<span class="badge ${missing(o.need).length?"warn":"new"}">${missing(o.need).length?"足りない "+missing(o.need).length+"つ":"耐性OK"}</span>`:""}</h4>${res}</div>
   <div class="qsec"><h4>攻め方</h4><p class="qtext">弱点：<b>${w}</b>${o.res&&o.res!=="—"?`　効きにくい：${esc(o.res.split(/[（(]/)[0])}`:""}</p></div>
  </div>`; }
// ソロ（自分＋サポート仲間3人）で行くなら：雇う職業・検索条件・装備
const SAPO_ST=["即死","封印","眠り","混乱","マヒ","転び","踊り","魅了","幻惑","おびえ","呪い","どく","MP吸収","弱体","しばり","ショック","毒"];
function sapoRes(o,g){ if(g&&g.res) return {main:g.res,more:[]};
  const pt=prioTiers(o.prio); const sp=t=>t.join("・").replace(/[（(][^）)]*[）)]/g,"").split("・").map(x=>x.trim()).filter(Boolean);
  let a=sp(pt["◎"]), b=sp(pt["○"]); if(!a.length&&!b.length){ a=[...(o.need||[]),...(o.dmg||[])]; }
  const lab=x=>SAPO_ST.includes(x)?x+"★★":x+"★"; const ord=l=>[...l.filter(x=>SAPO_ST.includes(x)),...l.filter(x=>!SAPO_ST.includes(x))];
  const all=[...new Set([...ord(a),...ord(b)])]; return {main:all.slice(0,3).map(lab),more:all.slice(3).map(lab)}; }
function sapoBox(kind,o){ if(kind!=="coin"&&kind!=="event") return ""; const g=(typeof SAPO_G!=="undefined"&&o.g&&SAPO_G[o.g])||{};
  if(g.no) return `<details class="sapo"><summary>ソロ（サポ仲間）で行くなら</summary><p class="lead">${esc(g.no)}</p></details>`;
  const ps=(o.parties||[]).filter(p=>!/一般例/.test(p.era||"")); if(!ps.length) return "";
  const p=(S.myJob&&ps.find(p=>partyHas(p,S.myJob)))||ps[0]; const me=S.myJob&&partyHas(p,S.myJob)?S.myJob:p.jobs[0];
  const hires=borrow(p,me); const uniq=[...new Set(hires.map(h=>h.replace(/\(仲間\)/,"")))];
  const r=sapoRes(o,g); const w=(o.weak||"").split(/[（(]/)[0]; const we=ELEM.filter(e=>w.includes(e)&&!/^なし/.test(w));
  const rows=uniq.map(j=>{ const d=(g.jobs&&g.jobs[j])||SAPO_JOB[j]; if(!d) return `<li><b>${esc(j)}</b>：${j in FREE_SLOTS?"この枠は好きな職業でOK（下の共通の目安で探す）":PET.find(x=>x.n===j)?`仲間モンスター（${esc([PET.find(x=>x.n===j).role,PET.find(x=>x.n===j).w&&"武器："+PET.find(x=>x.n===j).w].filter(Boolean).join("・"))}）。育て方は「仲間モンスター」タブ`:"目安は準備中"}</li>`;
    const atk=/ガンガン/.test(d.s)&&we.length?`。武器の属性が${we.join("・")}ならなお良い`:"";
    return `<li><b>${esc(j)}</b><dl class="kv"><dt>武器</dt><dd>${esc(d.w)}</dd><dt>さくせん</dt><dd>${esc(d.s)}</dd><dt>見るところ</dt><dd>${esc(d.c+atk)}</dd></dl></li>`; }).join("");
  return `<details class="sapo"><summary>ソロ（サポ仲間）で行くなら</summary>
  <p class="qtext">自分：<b>${esc(me)}</b>${S.myJob&&me!==S.myJob?`（${esc(S.myJob)}が入る編成がないため先頭の例）`:""}　雇う：<b>${esc(hires.join("・"))}</b></p>
  ${p.note?`<p class="hint">${esc(p.note)}</p>`:""}
  <h4>酒場で入れる耐性（3つまで）</h4><div class="chips">${r.main.map(x=>`<span class="chip">${esc(x)}</span>`).join("")||"特になし"}</div>
  ${r.more.length?`<p class="hint">ほかに：${esc(r.more.join("・"))}（3つを超える分は装備画面で確認）</p>`:""}
  <h4>雇う仲間の条件（武器は検索で指定できます）</h4><ul class="sapo-l">${rows}</ul>
  ${o.gear||g.gear?`<p class="qtext">装備：${esc([g.gear,o.gear].filter(Boolean).join("／"))}</p>`:""}
  ${g.note?`<p class="hint">${esc(g.note)}</p>`:""}
  <details class="roles"><summary>酒場での探し方（共通）</summary><ol>${SAPO_HOW.map(x=>`<li>${esc(x)}</li>`).join("")}</ol><p class="hint">★2＝耐性100%、★1＝40〜99%。武器・さくせんは攻略サイトでよく使われる形で、ボスによって変わることがあります。</p></details>
  <div class="src">出典：${srcLinks(["kyoku_sup",...(g.src||[])])}</div></details>`; }
function bossCard(kind, o){ const done=S.done[kind+":"+o.id]; const parties=o.parties||[];
  const hits = S.myJob ? parties.filter(p=>partyHas(p,S.myJob)).length : null;
  return `<article class="card ${done?"done":""}" id="c-${esc(o.id)}">
  <div class="card-h"><h3>${esc(o.name)}</h3>${S.fav[kind+":"+o.id]?'<span class="badge warn">☆</span>':""}</div>
  <div class="meta">${o.cat?`<span class="badge">${esc(o.cat)}</span>`:""}${o.g?`<span class="badge">${esc(o.g)}</span>`:""}${o.ver?`<span class="badge ${verNum(o.ver)>=7?"new":""}">実装 Ver.${esc(o.ver)}</span>`:""}${o.bosses?`<span>${esc(o.bosses)}</span>`:""}</div>
  ${quickBox(kind,o)}
  ${sapoBox(kind,o)}
  ${o.reward?`<dl class="kv"><dt>報酬</dt><dd>${esc(o.reward)}</dd></dl>`:""}
  ${guideBox(kind,o)}
  <details class="more"><summary>装備・耐性のくわしい目安</summary>${equipBox(o)}  <div><h4>耐性の一覧（マイ耐性と比べる） ${S.myRes.length?`<span class="badge ${missing(o.need).length?"warn":"new"}">${missing(o.need).length?"足りない "+missing(o.need).length+"つ":"耐性OK"}</span>`:""}</h4>${needChips(o.need,o.dmg)}</div></details>

  <div><h4>編成パターン（${parties.length}）${hits!=null?` <span class="badge ${hits?"new":"warn"}">${esc(S.myJob)}が入る：${hits}</span>`:""}</h4>
   ${parties.length?parties.map(partyHTML).join(""):`<p class="lead">${o.g==="邪神の宮殿"?"獄ごとに職業・武器の制限が変わるため、決まった編成は載せていません。制限に合わせて、上の「装備の目安」と倒す順を参考にしてください。":"編成パターンは準備中です。情報があれば「誤りを報告」から教えてください。"}</p>`}</div>
  ${o.acts&&o.acts.length?`<details class="acts"><summary>主な行動と対策（${o.acts.length}）</summary><ul>${o.acts.map(a=>`<li>${esc(a)}</li>`).join("")}</ul></details>`:""}
  ${o.tips?`<div class="tips"><b>注意点</b>　${esc(o.tips)}</div>`:""}
  ${cardActions(kind,o)}
  <details><summary>出典</summary><div class="src">${srcLinks(o.src)}${o.era&&kind==="event"?`<br>${esc(o.era)}`:""}</div></details></article>`; }

// ---- 各ビュー ----
const R = {};
R.home = () => { const done=S.daily.items.filter((_,i)=>S.daily.checked[i]).length; const wdone=S.weekly.items.filter((_,i)=>S.weekly.checked[i]).length;
  const today=jstNow().toISOString().slice(0,10); const up=CAL.filter(c=>(c.end||c.start)>=today).slice(0,3);
  return `<div class="notice">このアプリは<b>非公式のファンツール</b>です。情報は攻略サイトなどを要約したもので、ゲーム内の表示と違う場合があります。情報の時点は各項目に表示しています（データ更新：${esc(DATA_UPDATED)}・${esc(GAME_VER)}）。</div>
  <div class="panel"><h3>使い方</h3><p class="lead">上の検索欄にボス名・耐性・職業などを入れると、すべてのタブから探せます（タブ横の数字が件数）。「マイ耐性・装備」で自分の職業と耐性を登録すると、ボスごとに足りない耐性と、サポで借りる職業が出ます。</p></div>
  <div class="home-links">${[["coin","コインボス",COIN.length+"体"],["event","高難度・イベント",EV.length+"件"],["lv","レベル上げ",LV.length+"件"],["pet","仲間モンスター",PET.length+"体"],["my","マイ耐性・装備","足りない耐性を表示"],["daily","日課・週課",`今日 ${done}/${S.daily.items.length}・今週 ${wdone}/${S.weekly.items.length}`],["zel","ゼルメア","シートと探索メモ"],["cal","カレンダー","次の予定"],["recruit","募集文","作ってコピー"],["job","職業ガイド","職ごとの出番"],["orb","宝珠・アクセ","優先度"],["gold","金策","稼ぎ方一覧"],["support","サポ仲間の探し方","酒場の使い方"],["gloss","用語","むずかしい言葉"],["fav","お気に入り",Object.keys(S.fav).length+"件"],["about","評価・このアプリ","役に立った？"]].map(([v,t,s])=>`<button data-go="${v}"><b>${esc(t)}</b><span>${esc(s)}</span></button>`).join("")}</div>
  <div class="panel"><h3>近い予定</h3>${up.length?up.map(c=>`<div class="check"><span class="badge">${esc(c.start.slice(5).replace("-","/"))}${c.end?"〜"+esc(c.end.slice(5).replace("-","/")):"〜"}</span><span>${esc(c.title)}</span></div>`).join(""):`<p class="lead">登録された予定はありません。</p>`}<p class="src">予定の更新日：${esc(CAL_UPDATED)}</p></div>`; };

function bossFilters(kind){ const f=S.f; return `<div class="panel filters">
  <div class="frow">${jobSelect("f-job")}${kind==="coin"?`<select id="f-cat" aria-label="種類"><option value="">すべての種類</option>${["コインボス","召喚符","その他"].map(c=>`<option ${f.coinCat===c?"selected":""}>${c}</option>`).join("")}</select><select id="f-sort" aria-label="並び順"><option value="ver" ${f.sort==="ver"?"selected":""}>実装が古い順</option><option value="new" ${f.sort==="new"?"selected":""}>新しい順</option></select>`:`<select id="f-group" aria-label="コンテンツ"><option value="">すべてのコンテンツ</option>${[...new Set(EV.map(e=>e.g))].map(g=>`<option ${f.evGroup===g?"selected":""}>${esc(g)}</option>`).join("")}</select>`}</div>
  <div class="frow">
   <button class="chip" data-tg="onlyJob" aria-pressed="${f.onlyJob}">自分の職業が入る編成だけ</button>
   <button class="chip" data-tg="onlyRes" aria-pressed="${f.onlyRes}">耐性が足りるものだけ</button>
   ${kind==="coin"?`<button class="chip" data-tg="ver7" aria-pressed="${f.ver7}">Ver7以降に実装</button>`:""}
   <button class="chip" data-tg="hideDone" aria-pressed="${f.hideDone}">討伐済みを隠す</button></div>
  ${S.myRes.length?"":`<p class="lead">「マイ耐性・装備」で耐性を登録すると、足りない耐性が赤く表示されます。</p>`}</div>`; }
function filterBoss(kind, list){ const f=S.f, nq=norm(q);
  let a=list.filter(o=>{ if(onlyId) return o.id===onlyId; if(nq && !textOf(o).includes(nq)) return false;
    if(kind==="coin" && f.coinCat && o.cat!==f.coinCat) return false; if(kind==="event" && f.evGroup && o.g!==f.evGroup) return false;
    if(kind==="coin" && f.ver7 && verNum(o.ver)<7) return false; if(f.onlyJob && S.myJob && !(o.parties||[]).some(p=>partyHas(p,S.myJob))) return false;
    if(f.onlyRes && missing(o.need).length) return false; if(f.hideDone && S.done[kind+":"+o.id]) return false; return true; });
  if(kind==="coin"){ a=[...a].sort((x,y)=>(verNum(x.ver)||99)-(verNum(y.ver)||99)); if(f.sort==="new") a.reverse(); }
  return a; }
function onlyBar(){ return onlyId?`<div class="notice">共有リンクの項目だけ表示しています。<button class="btn" data-act="all">すべて表示</button></div>`:""; }
R.coin = () => { const a=filterBoss("coin",COIN); return `<h2>コインボス・召喚符</h2><p class="lead">必要耐性はVer8.1時点の一覧、編成は各攻略ページの例です。古い編成には「要確認」を付けています。</p>${bossFilters("coin")}${onlyBar()}<div class="grid two">${a.map(o=>bossCard("coin",o)).join("")||`<div class="empty">条件に合うボスがありません</div>`}</div>`; };
R.event = () => { const a=filterBoss("event",EV); return `<h2>高難度・イベント</h2><p class="lead">常闇の聖戦・聖守護者の闘戦記・邪神の宮殿・天獄・万魔の塔・咎人・宿敵・防衛軍・パニガルム・輝晶獣・まもの博士・ゼルメア・試練の門・ピラミッド・黄昏の奏戦記・王家/心層の迷宮・魔塔など。上の「すべてのコンテンツ」から選べます。耐性はVer8.1時点（2026-10-20更新）の一覧です。</p>${bossFilters("event")}${onlyBar()}<div class="grid two">${a.map(o=>bossCard("event",o)).join("")||`<div class="empty">条件に合うコンテンツがありません</div>`}</div>`; };

R.lv = () => { const nq=norm(q); const a=LV.filter(o=>onlyId?o.id===onlyId:(!nq||textOf(o).includes(nq)));
  return `<h2>レベル上げ</h2><p class="lead">狩り場ごとに、パーティーの各メンバーの役割・装備・立ち回りをまとめています。経験値はおおよその目安で、混雑や装備で変わります。</p>${onlyBar()}<div class="grid two">${a.map(o=>`<article class="card" id="c-${o.id}">
   <div class="card-h"><h3>${esc(o.name)}</h3></div>
   <div class="meta"><span class="badge">Ver.${esc(o.ver)}エリア</span><span class="badge new">${esc(o.asof)}</span></div>
   <dl class="kv"><dt>場所</dt><dd>${esc(o.place)}</dd><dt>経験値</dt><dd>${esc(o.exp)}</dd><dt>通帳</dt><dd>${esc(o.book)}</dd>${o.enemy?`<dt>敵</dt><dd>${esc(o.enemy)}</dd>`:""}</dl>
   ${(o.need.length||o.dmg.length)?`<div><h4>必要な耐性</h4>${needChips(o.need,o.dmg)}</div>`:""}
   ${o.parties.map(p=>`<div class="party"><b>${esc(p.title)}</b> ${eraBadge(p.era)}<div class="members">${p.members.map((m,i)=>`<div class="member"><div class="slot">${i+1}</div><b>${esc(m.job)}</b><span>${esc(m.role)}</span>${m.detail?`<div class="d">${esc(m.detail)}</div>`:""}</div>`).join("")}</div></div>`).join("")}
   ${o.items?`<div class="tips"><b>装備・持ち物</b>　${esc(o.items)}</div>`:""}
   ${o.steps&&o.steps.length?`<div><h4>手順</h4><ol class="steps">${o.steps.map(s=>`<li>${esc(s)}</li>`).join("")}</ol></div>`:""}
   ${o.notes?`<div class="tips"><b>注意点</b>　${esc(o.notes)}</div>`:""}
   ${cardActions("lv",o)}<details><summary>出典</summary><div class="src">${srcLinks(o.src)}</div></details></article>`).join("")||`<div class="empty">見つかりません</div>`}</div>`; };

R.pet = () => { const nq=norm(q); const a=PET.filter(p=>(!S.f.petT||p.t===S.f.petT)&&(!nq||textOf(p).includes(nq)||textOf(PET_SPEC[p.n]||"").includes(nq)));
  return `<h2>仲間モンスター</h2><div class="panel"><h3>基本ルール</h3><ul class="lead">${PET_RULES.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div>
  <div class="frow"><select id="f-pett" aria-label="スカウトできる職業"><option value="">すべて</option><option ${S.f.petT==="まもの使い"?"selected":""}>まもの使い</option><option ${S.f.petT==="どうぐ使い"?"selected":""}>どうぐ使い</option></select><span class="lead">${a.length}体</span></div>
  <div class="grid two">${a.map(p=>{ const sp=PET_SPEC[p.n]||[]; return `<article class="card ${S.petDone[p.n]?"done":""}">
   <div class="card-h"><h3>${esc(p.n)}</h3>${p.rank?`<span class="badge warn">評価 ${esc(p.rank)}</span>`:""}</div>
   <div class="meta"><span class="badge">${esc(p.t)}</span><span>${esc(p.role)}</span><span>武器：${esc(p.w)}</span></div>
   <div class="party"><b>汎用型のスキル振り（転生15回）</b> <span class="badge old">Ver6.5後期基準・要確認</span><div class="note">${esc(p.skills)}</div>
    <div class="note"><b>装備の目安</b>：武器は${esc(p.w)}（スキルに合わせる）。防具は役割に合わせ、前衛は重い鎧、呪文・回復はローブ系。宝珠が付けられないので耐性は装備の錬金で作る。</div></div>
   <div class="party"><b>Ver8.0の方針</b> <span class="badge new">Ver8.0</span><div class="note">${esc(p.v8)}</div></div>
   ${sp.map(s=>`<div class="party hit"><b>${esc(s.type)}</b> ${eraBadge(s.era)}<div class="note"><b>スキル</b>：${esc(s.skills)}</div><div class="note"><b>装備</b>：${esc(s.equip)}</div><div class="note"><b>バッジ</b>：${esc(s.badge)}</div><div class="note"><b>使い方</b>：${esc(s.how)}</div></div>`).join("")}
   <div class="actions"><button class="btn" data-act="petdone" data-id="${esc(p.n)}" aria-pressed="${!!S.petDone[p.n]}">✓ 育成済み</button><button class="btn" data-act="report" data-id="${esc(p.n)}">誤りを報告</button></div>
   <details><summary>出典</summary><div class="src">${srcLinks(["hotondo","kanon","ranbu_pet",...new Set(sp.flatMap(s=>s.src))])}</div></details></article>`; }).join("")}</div>`; };

R.support = () => `<h2>サポート仲間の探し方</h2><div class="grid two">${SUPPORT_GUIDE.map(g=>`<div class="panel"><h3>${esc(g.h)}</h3><p class="lead">${esc(g.b)}</p></div>`).join("")}</div><p class="src">出典：${srcLinks(["ranbu_sup"])}</p>`;

R.zel = () => { const z=S.zel; const lab=["","開","下","ボ","鱗","箱"]; const cls=["","open","down","boss","open","open"];
  const parts=["あたま","からだ上","からだ下","うで","あし"];
  return `<h2>いにしえのゼルメア</h2><p class="lead">情報の時点：${esc(ZEL.asof)}。${esc(ZEL.levels)}</p>
  <div class="grid two"><div class="panel"><h3>探索メモ（ゼルメアシート風）</h3><p class="lead">部屋をタップすると「開→下（くだりの扉）→ボ（ボス）→鱗（うろこ）→箱（宝箱）→空」と切り替わります。地図の候補を絞り込みたい時は有志の<a href="${esc(SRC.zel_sheet.u)}" target="_blank" rel="noopener">ゼルメアシート</a>を使ってください。</p>
   <div class="frow"><label>階</label><button class="btn" data-z="floor-">−</button><b class="num">地下${z.floor}階</b><button class="btn" data-z="floor+">＋</button><label>うろこ</label><button class="btn" data-z="uroko-">−</button><b class="num">${z.uroko}</b><button class="btn" data-z="uroko+">＋</button></div>
   <div class="zgrid" style="margin-top:10px">${z.cells.map((c,i)=>`<div class="zcell ${cls[c]}" role="button" tabindex="0" data-cell="${i}" aria-label="部屋${i+1}">${lab[c]}</div>`).join("")}</div>
   <div class="actions" style="margin-top:10px"><button class="btn" data-z="next">次の階へ（地図をリセット）</button></div></div>
  <div class="panel"><h3>防具チェック</h3><p class="lead">手に入れた部位にチェック。欲しい錬金効果をメモできます。</p>${parts.map(p=>`<div class="check ${z.parts[p]?"on":""}"><input type="checkbox" id="zp-${p}" data-zp="${p}" ${z.parts[p]?"checked":""}><label for="zp-${p}">${p}</label><input class="input" style="flex:1.4" data-zw="${p}" placeholder="欲しい錬金" value="${esc(z.want[p]||"")}"></div>`).join("")}</div></div>
  <div class="grid two"><div class="panel"><h3>階層ごとの仕掛け</h3><div class="tablewrap"><table><tr><th>階</th><th>主な要素</th></tr>${ZEL.floors.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join("")}</table></div><p class="lead">${esc(ZEL.hp)}</p></div>
  <div class="panel"><h3>選べる階層</h3><div class="tablewrap"><table><tr><th>条件</th><th>階層</th><th>防具Lv</th></tr>${ZEL.unlock.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>
  <h4>探索の極意</h4>${ZEL.kiwami.map(k=>`<div><b>${esc(k[0])}</b>：${esc(k[1])}</div>`).join("")}</div></div>
  <p class="lead">編成と必要耐性は「高難度・イベント」タブの「いにしえのゼルメア」にあります。</p><p class="src">出典：${srcLinks(["zel_mz","zel_ike","zel_sheet"])}</p>`; };

function checklist(kind){ const d=S[kind]; return `${d.items.map((t,i)=>`<div class="check ${d.checked[i]?"on":""}"><input type="checkbox" id="${kind}-${i}" data-ck="${kind}" data-i="${i}" ${d.checked[i]?"checked":""}><label for="${kind}-${i}">${esc(t)}</label><button class="x" data-del="${kind}" data-i="${i}" aria-label="${esc(t)}を一覧から外す">✕</button></div>`).join("")}
  <div class="frow" style="margin-top:8px"><input class="input" id="add-${kind}" placeholder="項目を追加" style="flex:1"><button class="btn primary" data-add="${kind}">追加</button></div>`; }
R.daily = () => `<h2>日課・週課チェック</h2><p class="lead">日課は毎日6:00、週課は毎週日曜6:00（日本時間）に自動でチェックが外れます。項目は自由に追加・削除できます（初期項目は例。ゲーム内の更新時刻と違う場合は要確認）。</p>
  <div class="grid two"><div class="panel"><h3>日課 <span class="badge">${S.daily.items.filter((_,i)=>S.daily.checked[i]).length}/${S.daily.items.length}</span></h3>${checklist("daily")}</div><div class="panel"><h3>週課 <span class="badge">${S.weekly.items.filter((_,i)=>S.weekly.checked[i]).length}/${S.weekly.items.length}</span></h3>${checklist("weekly")}</div></div>
  <div class="actions"><button class="btn" data-act="resetlist">項目を初期状態に戻す</button></div>`;

R.cal = () => { const today=jstNow().toISOString().slice(0,10); const st=(c)=> c.start>today?["予定",""]:((c.end&&c.end<today)?["終了","old"]:["開催中","new"]);
  return `<h2>イベント・強敵カレンダー</h2><p class="lead">予定の更新日：${esc(CAL_UPDATED)}。終了日が分からないものは「〜」だけ表示しています。最新情報は公式の「目覚めし冒険者の広場」で確認してください。</p>
  <div class="panel">${CAL.map(c=>{const [l,k]=st(c); return `<div class="check"><span class="badge ${k}">${l}</span><span class="num">${esc(c.start.replace(/-/g,"/"))}${c.end?"〜"+esc(c.end.slice(5).replace("-","/")):"〜"}</span><span style="flex:1">${esc(c.title)} <span class="badge">${esc(c.kind)}</span></span></div>`;}).join("")}</div>
  <div class="panel"><h3>くり返しの予定</h3><ul>${CAL_REPEAT.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div><p class="src">出典：${srcLinks([...new Set(CAL.map(c=>c.src))])}</p>`; };

R.my = () => { const miss=[...COIN.map(o=>["coin",o]),...EV.map(o=>["event",o])].filter(([,o])=>missing(o.need).length);
  const top={}; miss.forEach(([,o])=>missing(o.need).forEach(s=>top[s]=(top[s]||0)+1)); const rank=Object.entries(top).sort((a,b)=>b[1]-a[1]);
  return `<h2>マイ耐性・装備</h2><div class="grid two"><div class="panel"><h3>自分の職業</h3>${jobSelect("my-job")}<p class="lead">選ぶと、ボスごとに「自分が入れる編成」と「サポで借りる職業」が出ます。</p></div>
  <div class="panel"><h3>持っている耐性（100%）${S.myJob?`：${esc(S.myJob)}`:"：職業を選ばないとき"}</h3><div class="chips">${STATUS.map(s=>`<button class="chip" data-res="${s}" aria-pressed="${S.myRes.includes(s)}">${s}</button>`).join("")}</div><p class="lead">今の装備で100%になっている耐性をタップ。職業ごとに別々に記録され、職業を切り替えるとその職業の耐性に変わります。</p>${(()=>{ const o=Object.entries(S.resByJob).filter(([k,v])=>k!==(S.myJob||"")&&v&&v.length); return o.length?`<div class="frow"><span class="lead">ほかの職業からコピー：</span>${o.map(([k])=>`<button class="chip" data-copyres="${esc(k)}">${esc(k||"職業なし")}</button>`).join("")}</div>`:""; })()}${Object.keys(S.resByJob).filter(k=>S.resByJob[k]&&S.resByJob[k].length).length?`<p class="hint">記録がある職業：${esc(Object.keys(S.resByJob).filter(k=>S.resByJob[k].length).map(k=>(k||"職業なし")+"（"+S.resByJob[k].length+"）").join("・"))}</p>`:""}</div></div>
  <div class="panel"><h3>足りない耐性のまとめ</h3>${S.myRes.length?(rank.length?`<p class="lead">耐性が足りないボス・コンテンツ：${miss.length}件。よく必要になる順：</p><div class="chips">${rank.map(([s,n])=>`<span class="chip ng">${esc(s)}（${n}件）</span>`).join("")}</div>`:`<p class="lead">登録した耐性で、すべてのボスの必要耐性を満たしています。</p>`):`<p class="lead">耐性を登録するとここに表示されます。</p>`}</div>
  <div class="panel"><h3>装備メモ</h3><textarea class="input" id="gear" placeholder="例：竜術士 アクセ＝赤竜の首かざり・軍神のゆびわ、転び100、呪文ダメ減…">${esc(S.gear)}</textarea></div>
  <div class="grid two"><div class="panel"><h3>表示の設定</h3><div class="frow"><label>テーマ</label>${[["","端末に合わせる"],["light","ライト"],["dark","ダーク"]].map(([v,l])=>`<button class="chip" data-theme-set="${v}" aria-pressed="${(S.theme||"")===v}">${l}</button>`).join("")}</div>
   <div class="frow" style="margin-top:8px"><label>文字サイズ</label>${[["s","小"],["m","中"],["l","大"],["xl","特大"]].map(([v,l])=>`<button class="chip" data-font-set="${v}" aria-pressed="${S.font===v}">${l}</button>`).join("")}</div></div>
  <div class="panel"><h3>バックアップ（機種変更など）</h3><p class="lead">チェックやメモはこの端末のブラウザにだけ保存されます。別の端末へ移す時は書き出して、移動先で読み込んでください。</p>
   <div class="actions"><button class="btn primary" data-act="export">書き出す</button><button class="btn" data-act="exportcopy">テキストでコピー</button><label class="btn" for="imp-file">ファイルから読み込む</label><input type="file" id="imp-file" accept=".json,application/json" class="sr"></div>
   <textarea class="input" id="imp-text" placeholder="コピーしたテキストを貼り付けて「読み込む」" style="margin-top:8px"></textarea><div class="actions"><button class="btn" data-act="importtext">貼り付けた内容を読み込む</button></div></div></div>`; };

R.fav = () => { const keys=Object.keys(S.fav); const items=keys.map(k=>{const [kind,id]=k.split(":"); const list=kind==="coin"?COIN:kind==="event"?EV:LV; const o=list.find(x=>x.id===id); return o?[kind,o]:null;}).filter(Boolean);
  return `<h2>お気に入り</h2>${items.length?`<div class="grid two">${items.map(([k,o])=>k==="lv"?`<article class="card"><h3>${esc(o.name)}</h3><p class="lead">${esc(o.place)}</p><div class="actions"><button class="btn primary" data-open="lv:${o.id}">開く</button><button class="btn" data-act="fav" data-id="lv:${o.id}" aria-pressed="true">☆ 外す</button></div></article>`:bossCard(k,o)).join("")}</div>`:`<div class="empty">まだありません。各カードの「☆ お気に入り」で追加できます。</div>`}`; };

let recruitPre=null;
R.recruit = () => { const all=[...COIN.map(o=>["coin",o]),...EV.map(o=>["event",o])]; const pre=recruitPre||{}; const sel=pre.key||"";
  return `<h2>パーティー募集文</h2><p class="lead">内容を選ぶと、必要な耐性を自動で入れます。できた文はコピーして、ゲーム内の募集やSNSに貼れます。</p>
  <div class="panel filters"><div class="frow"><select id="r-con" aria-label="コンテンツ" style="flex:1;min-width:0"><option value="">コンテンツを選ぶ</option>${all.map(([k,o])=>`<option value="${k}:${esc(o.id)}" ${sel===k+":"+o.id?"selected":""}>${esc(o.name)}${o.g?"（"+esc(o.g)+"）":""}</option>`).join("")}</select></div>
   <div class="frow"><select id="r-purpose" aria-label="目的">${["周回","討伐","初見歓迎","練習","手伝い募集"].map(p=>`<option>${p}</option>`).join("")}</select>${jobSelect("r-job")}</div>
   <div class="frow"><input class="input" id="r-want" placeholder="募集する職業（例：魔法戦士・隠者）" style="flex:1" value="${esc(pre.want||"")}"></div>
   <div class="frow"><input class="input" id="r-cmt" placeholder="ひとこと（例：22時から1時間ほど）" style="flex:1"></div></div>
  <div class="panel"><h3>できた募集文</h3><textarea class="input" id="r-out" rows="6" readonly></textarea><div class="actions"><button class="btn primary" data-act="rcopy">コピー</button></div><p class="lead">他のプレイヤーの名前を出したり、悪口を書いたりしないでください。</p></div>`; };
function buildRecruit(){ const v=$("#r-con")?.value; if(!$("#r-out")) return; let o=null; if(v){ const [k,id]=v.split(":"); o=(k==="coin"?COIN:EV).find(x=>x.id===id); }
  const need=o?(o.need||[]):[]; const dmg=o?(o.dmg||[]):[]; const job=$("#r-job").value;
  const lines=[`【募集】${o?o.name:"（コンテンツ）"}　${$("#r-purpose").value}`, job?`主：${job}`:"", $("#r-want").value?`募集：${$("#r-want").value}`:"", need.length?`耐性：${need.join("・")}（100%）`:"", dmg.length?`あると良い：${dmg.map(d=>d+"軽減").join("・")}`:"", $("#r-cmt").value].filter(Boolean);
  $("#r-out").value=lines.join("\n"); }

R.job = () => { const nq=norm(q); const use={}; jobNames.forEach(j=>use[j]=[]);
  [...COIN.map(o=>["コインボス",o]),...EV.map(o=>[o.g,o])].forEach(([g,o])=>(o.parties||[]).forEach(p=>p.jobs.forEach(s=>{ if(use[s] && !use[s].includes(o.name)) use[s].push(o.name); })));
  LV.forEach(o=>o.parties.forEach(p=>p.members.forEach(m=>jobNames.forEach(j=>{ if(m.job.includes(j) && !use[j].includes("レベル上げ："+o.name)) use[j].push("レベル上げ："+o.name); }))));
  const list=JOBS.filter(j=>!nq||norm(j.n).includes(nq)||norm(j.g).includes(nq)).sort((a,b)=>use[b.n].length-use[a.n].length);
  return `<h2>職業ガイド</h2><p class="lead">このアプリの編成パターンに何回出てくるかで並べています（多いほど出番が多い）。「この職で探す」を押すと自分の職業に設定されます。</p>
  <div class="grid two">${list.map(j=>`<div class="panel"><div class="card-h"><h3>${esc(j.n)}</h3><span class="badge">${esc(j.g)}</span></div><p class="lead">登場：${use[j.n].length}件</p>${use[j.n].length?`<details><summary>出てくるボス・狩り場</summary><div class="chips">${use[j.n].map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div></details>`:""}<div class="actions"><button class="btn primary" data-setjob="${esc(j.n)}">この職で探す</button></div></div>`).join("")}</div>`; };

R.orb = () => `<h2>宝珠・アクセサリー</h2><div class="panel"><h3>まず取る宝珠（全職共通）</h3><div class="tablewrap"><table><tr><th>宝珠</th><th>効果</th><th>優先度</th></tr>${ORB.common.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div><p class="lead">${esc(ORB.note)}</p></div>
  <div class="grid two"><div class="panel"><h3>役割別の次に取る宝珠</h3>${ORB.role.map(r=>`<h4>${esc(r[0])}</h4><p style="margin:0">${esc(r[1])}</p>`).join("")}</div>
  <div class="panel"><h3>遊び方別の優先</h3><div class="tablewrap"><table><tr><th>遊び方</th><th>優先</th><th>後回し</th></tr>${ORB.scene.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div></div></div>
  <div class="panel"><h3>コインボスアクセの系統（伝承の流れ）</h3><div class="tablewrap"><table><tr><th>部位</th><th>流れ</th><th>ボス</th></tr>${ACCE.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div><p class="lead">${esc(ACCE_NOTE)}</p></div>
  <p class="src">出典：<a href="https://asellog.com/dqx-orb-priority-chart/" target="_blank" rel="noopener">あせろぐ 必須・優先宝珠の入手チャート（2026-09更新）</a><br><a href="https://asellog.com/dqx-coinboss-acce/" target="_blank" rel="noopener">あせろぐ コインボスアクセ一覧（Ver8.0対応・2026-09更新）</a></p>`;

R.gold = () => `<h2>金策</h2><div class="notice">掲載元に時期の記載がないため、金額は<b>要確認</b>です。相場はゲーム内のバザーで確認してください。</div><div class="tablewrap"><table><tr><th>方法</th><th>回数</th><th>目安</th><th>条件・メモ</th></tr>${GOLD.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div><p class="src">出典：<a href="https://xn--10-yg4a1a3kyh.jp/dq10_gold1.html" target="_blank" rel="noopener">ドラクエ10極限攻略 金策</a></p>`;

R.gloss = () => { const nq=norm(q); const a=GLOSS.filter(g=>!nq||textOf(g).includes(nq)); return `<h2>用語解説</h2><div class="panel">${a.map(([t,d])=>`<div class="check"><div><b>${esc(t)}</b><div class="lead">${esc(d)}</div></div></div>`).join("")||`<div class="empty">見つかりません</div>`}</div>`; };

let fbPre={};
R.about = () => { const ready=!!CONFIG.formAction;
  return `<h2>評価・このアプリについて</h2>
  <div class="panel" id="feedback"><h3>役に立ちましたか？</h3>${ready?"":`<div class="notice">送信の準備中です（公開設定が終わると送れるようになります）。</div>`}
   <div class="frow" style="margin:6px 0"><button class="chip" data-rate="役に立った" aria-pressed="${fbPre.rate==="役に立った"}">👍 役に立った</button><button class="chip" data-rate="いまいち" aria-pressed="${fbPre.rate==="いまいち"}">👎 いまいち</button></div>
   <div class="frow"><select id="fb-kind" aria-label="種類">${["感想","誤り報告","要望"].map(k=>`<option ${fbPre.kind===k?"selected":""}>${k}</option>`).join("")}</select><input class="input" id="fb-page" placeholder="どのページ・ボス？" value="${esc(fbPre.page||"")}" style="flex:1"></div>
   <textarea class="input" id="fb-cmt" placeholder="ひとこと（任意）" style="margin-top:8px" maxlength="1000"></textarea>
   <p class="lead">個人情報や、他のプレイヤーの名前・悪口は書かないでください。いただいた内容はアプリの改善に使います。</p>
   <div class="actions"><button class="btn primary" data-act="send" ${ready?"":"disabled"}>送信</button></div></div>
  <div class="grid two"><div class="panel"><h3>このアプリについて</h3><p>ドラゴンクエストXオンラインのコインボス・高難度・レベル上げ・仲間モンスターの情報を、検索してチェックできる<b>非公式のファンツール</b>です。広告はなく無料です。</p><p class="lead">データ更新：${esc(DATA_UPDATED)}（${esc(GAME_VER)}）。情報はインターネット上の攻略情報を要約し、出典を各項目に付けています。古い情報には「要確認」を付けています。</p></div>
  <div class="panel"><h3>プライバシーポリシー</h3><ul class="lead"><li>チェックやメモは、お使いの端末のブラウザ内だけに保存します。作者には送られません。</li><li>アクセス数の集計に GoatCounter を使います。クッキーを使わず、個人を特定する情報は集めません。</li><li>評価・コメントは Google フォームに送られ、作者だけが見られます。名前やメールアドレスは集めません。</li><li>外部の攻略サイトへのリンク先では、それぞれのサイトの方針が適用されます。</li></ul></div></div>
  <div class="panel"><h3>免責事項</h3><p class="lead">ゲームのアップデートで内容が変わることがあります。このアプリの情報によって生じた損害について、作者は責任を負いません。気づいた誤りは上のフォームから「誤り報告」で教えてください。</p></div>
  <div class="panel"><h3>出典一覧</h3><div class="src">${Object.values(SRC).map(s=>`<a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a>`).join("<br>")}</div></div>`; };

// ---- 描画 ----
function render(){ const v=$("#view"); v.innerHTML = `<section class="view" aria-labelledby="vh">${R[cur]()}</section>`; const h=v.querySelector("h2"); if(h) h.id="vh"; if(cur==="recruit"){ if(recruitPre&&recruitPre.job) $("#r-job").value=recruitPre.job; buildRecruit(); } }

// ---- イベント ----
document.addEventListener("click", async (e)=>{ const t=e.target.closest("button,[data-cell]"); if(!t) return; const d=t.dataset;
  if(d.v){ go(d.v); return; } if(d.go){ go(d.go); return; }
  if(d.open){ const [k,id]=d.open.split(":"); onlyId=id; go(k==="coin"?"coin":k==="event"?"event":"lv",{keepId:true}); return; }
  if(d.tg){ S.f[d.tg]=!S.f[d.tg]; save(); render(); return; }
  if(d.copyres!==undefined){ S.myRes.splice(0,S.myRes.length,...(S.resByJob[d.copyres]||[])); save(); toast("耐性をコピーしました"); render(); return; }
  if(d.res){ const i=S.myRes.indexOf(d.res); i<0?S.myRes.push(d.res):S.myRes.splice(i,1); save(); render(); return; }
  if(d.setjob){ setJob(d.setjob); save(); toast(`自分の職業を「${d.setjob}」にしました`); go("coin"); return; }
  if(d.themeSet!==undefined){ S.theme=d.themeSet; save(); applyLook(); render(); return; }
  if(d.fontSet){ S.font=d.fontSet; save(); applyLook(); render(); return; }
  if(d.rate){ fbPre.rate=d.rate; document.querySelectorAll("[data-rate]").forEach(b=>b.setAttribute("aria-pressed", b.dataset.rate===d.rate)); return; }
  if(d.cell!==undefined){ const i=+d.cell; S.zel.cells[i]=(S.zel.cells[i]+1)%6; save(); render(); return; }
  if(d.z){ const z=S.zel; if(d.z==="floor+") z.floor=Math.min(24,z.floor+1); if(d.z==="floor-") z.floor=Math.max(1,z.floor-1); if(d.z==="uroko+") z.uroko++; if(d.z==="uroko-") z.uroko=Math.max(0,z.uroko-1); if(d.z==="next"){ z.cells=Array(12).fill(0); z.floor=Math.min(24,z.floor+1);} save(); render(); return; }
  if(d.add){ const inp=$("#add-"+d.add); const v=inp.value.trim(); if(v){ S[d.add].items.push(v); save(); render(); } return; }
  if(d.del){ const L=S[d.del]; L.items.splice(+d.i,1); const c={}; Object.keys(L.checked).forEach(k=>{ k=+k; if(k<+d.i) c[k]=true; else if(k>+d.i) c[k-1]=true; }); L.checked=c; save(); render(); return; }
  const act=d.act; if(!act) return;
  if(act==="fav"){ S.fav[d.id]?delete S.fav[d.id]:S.fav[d.id]=1; save(); render(); toast(S.fav[d.id]?"お気に入りに追加しました":"お気に入りから外しました"); }
  else if(act==="done"){ S.done[d.id]?delete S.done[d.id]:S.done[d.id]=1; save(); render(); }
  else if(act==="petdone"){ S.petDone[d.id]?delete S.petDone[d.id]:S.petDone[d.id]=1; save(); render(); }
  else if(act==="all"){ onlyId=""; render(); }
  else if(act==="share"){ const [k,id]=d.id.split(":"); const v=k==="coin"?"coin":k==="event"?"event":"lv"; const u=location.origin+location.pathname+`?v=${v}&id=${encodeURIComponent(id)}`+(S.myJob?`&job=${encodeURIComponent(S.myJob)}`:""); copy(u); }
  else if(act==="recruit"){ const [k,id]=d.id.split(":"); const o=(k==="coin"?COIN:EV).find(x=>x.id===id); const p=(o.parties||[]).find(p=>partyHas(p,S.myJob)); recruitPre={key:d.id,job:S.myJob,want:p?borrow(p,S.myJob).filter(s=>!/\(仲間\)/.test(s)).join("・"):""}; go("recruit"); }
  else if(act==="rcopy"){ copy($("#r-out").value); }
  else if(act==="report"){ fbPre={kind:"誤り報告",page:d.id,rate:fbPre.rate}; go("about"); setTimeout(()=>$("#fb-cmt")?.focus(),50); }
  else if(act==="resetlist"){ S.daily.items=[...DAILY_DEFAULT]; S.weekly.items=[...WEEKLY_DEFAULT]; S.daily.checked={}; S.weekly.checked={}; save(); render(); }
  else if(act==="export"){ const blob=new Blob([JSON.stringify(S,null,1)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`dq10-otasuke-backup-${dailyKey()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast("書き出しました（うまくいかない時は「テキストでコピー」）"); }
  else if(act==="exportcopy"){ copy(JSON.stringify(S)); }
  else if(act==="importtext"){ importData($("#imp-text").value); }
  else if(act==="send"){ await sendFeedback(); }
});
document.addEventListener("keydown",(e)=>{ const c=e.target.closest("[data-cell]"); if(c&&(e.key==="Enter"||e.key===" ")){ e.preventDefault(); c.click(); } });
document.addEventListener("change",(e)=>{ const t=e.target, d=t.dataset;
  if(t.id==="f-job"||t.id==="my-job"){ setJob(t.value); save(); render(); }
  else if(t.id==="f-cat"){ S.f.coinCat=t.value; save(); render(); }
  else if(t.id==="f-sort"){ S.f.sort=t.value; save(); render(); }
  else if(t.id==="f-group"){ S.f.evGroup=t.value; save(); render(); }
  else if(t.id==="f-pett"){ S.f.petT=t.value; save(); render(); }
  else if(d.ck){ S[d.ck].checked[d.i]=t.checked; if(!t.checked) delete S[d.ck].checked[d.i]; save(); render(); }
  else if(d.zp){ S.zel.parts[d.zp]=t.checked; save(); render(); }
  else if(t.id==="imp-file"&&t.files[0]){ const r=new FileReader(); r.onload=()=>importData(r.result); r.readAsText(t.files[0]); }
  else if(["r-con","r-purpose","r-job"].includes(t.id)){ if(t.id==="r-con"){ const v=t.value; if(v){ const [k,id]=v.split(":"); const o=(k==="coin"?COIN:EV).find(x=>x.id===id); const p=(o.parties||[]).find(p=>partyHas(p,$("#r-job").value)); if(p&&!$("#r-want").value) $("#r-want").value=borrow(p,$("#r-job").value).filter(s=>!/\(仲間\)/.test(s)).join("・"); } } buildRecruit(); }
});
document.addEventListener("input",(e)=>{ const t=e.target; if(t.id==="q"){ q=t.value; clearTimeout(window._qt); window._qt=setTimeout(()=>{ renderTabs(); if(VIEWS.find(v=>v.id===cur).list||cur==="home"){ if(cur==="home"&&q){ const c=counts(); const best=Object.entries(c).sort((a,b)=>b[1]-a[1])[0]; if(best&&best[1]) { go(best[0],{noScroll:true}); return; } } render(); } },200); }
  else if(t.id==="gear"){ S.gear=t.value; S.gearByJob[S.myJob||""]=S.gear; save(); }
  else if(t.dataset.zw){ S.zel.want[t.dataset.zw]=t.value; save(); }
  else if(["r-want","r-cmt"].includes(t.id)){ buildRecruit(); } });

function importData(text){ try{ const o=JSON.parse(text); if(typeof o!=="object"||!o) throw 0; S=Object.assign(structuredClone(DEF),o); save(); load(); applyLook(); resetCheck(); render(); toast("読み込みました"); }catch(e){ toast("読み込めませんでした。内容を確認してください"); } }

async function sendFeedback(){ const F=CONFIG.formFields; const body=new URLSearchParams(); const rate=fbPre.rate||""; const kind=$("#fb-kind").value, page=$("#fb-page").value, cmt=$("#fb-cmt").value;
  if(!rate&&!cmt.trim()){ toast("👍か👎を選ぶか、ひとこと書いてください"); return; }
  if(F.kind) body.append(F.kind,kind); if(F.rating) body.append(F.rating,rate); if(F.page) body.append(F.page,page); if(F.comment) body.append(F.comment,cmt);
  try{ await fetch(CONFIG.formAction,{method:"POST",mode:"no-cors",body}); fbPre={}; toast("送信しました。ありがとうございます！"); render(); gcCount("/feedback-sent"); }catch(e){ toast("送信できませんでした。通信状態を確認してください"); } }

// ---- 起動 ----
function boot(){ let v=(location.hash||"").slice(1); try{ const u=new URLSearchParams(location.search); if(u.get("v")) v=u.get("v"); if(u.get("id")) onlyId=u.get("id"); if(u.get("job")&&jobNames.includes(u.get("job"))) setJob(u.get("job")); if(u.get("q")){ q=u.get("q"); $("#q").value=q; } }catch(e){}
  $("#q").addEventListener("keydown",e=>{ if(e.key==="Enter") e.target.blur(); });
  $("#btn-theme").addEventListener("click",()=>{ const order=["","light","dark"]; S.theme=order[(order.indexOf(S.theme||"")+1)%3]; save(); applyLook(); toast(S.theme===""?"テーマ：端末に合わせる":S.theme==="dark"?"テーマ：ダーク":"テーマ：ライト"); if(cur==="my") render(); });
  $("#btn-font").addEventListener("click",()=>{ const order=["s","m","l","xl"]; S.font=order[(order.indexOf(S.font||"m")+1)%4]; save(); applyLook(); toast("文字サイズ："+({s:"小",m:"中",l:"大",xl:"特大"})[S.font]); });
  $("#foot-author").textContent=CONFIG.author||""; $("#foot-date").textContent=DATA_UPDATED;
  // マウスのホイールでもタブを左右に動かせるように
  $("#tabs").addEventListener("wheel",e=>{ const t=e.currentTarget; if(t.scrollWidth<=t.clientWidth) return; if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){ t.scrollLeft+=e.deltaY; e.preventDefault(); } },{passive:false});
  $("#nav-back").addEventListener("click",goBack); $("#nav-top").addEventListener("click",()=>window.scrollTo({top:0,behavior:"smooth"}));
  go(v||"home",{keepId:true,init:true});
  if("serviceWorker" in navigator && location.protocol==="https:" && !/claude/.test(location.hostname)){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
}
boot();
})();
