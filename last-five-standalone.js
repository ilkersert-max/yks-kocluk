/* YKS – Son 5 Deneme: mevcut app.js değiştirilmeden eklenir. */
import { getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import { getFirestore, collection, onSnapshot, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';

const TESTS = {
  'tyt-turkce':['TYT Türkçe',40], 'tyt-sosyal':['TYT Sosyal',20],
  'tyt-mat':['TYT Matematik',40], 'tyt-fen':['TYT Fen',20],
  'ayt-mat':['AYT Matematik',40], 'ayt-fizik':['AYT Fizik',14],
  'ayt-kimya':['AYT Kimya',13], 'ayt-biyo':['AYT Biyoloji',13],
  'ayt-tde':['AYT Türk Dili ve Edebiyatı',24], 'ayt-tar1':['AYT Tarih-1',10],
  'ayt-cog1':['AYT Coğrafya-1',6], 'ayt-tar2':['AYT Tarih-2',11],
  'ayt-cog2':['AYT Coğrafya-2',11], 'ayt-felsefe':['AYT Felsefe Grubu',12],
  'ayt-din':['AYT Din / İlave Felsefe',6], 'ydt-dil':['YDT Yabancı Dil',80]
};
const TYT = ['tyt-turkce','tyt-sosyal','tyt-mat','tyt-fen'];
const TYPES = {
  TYT:[], SAY:['ayt-mat','ayt-fizik','ayt-kimya','ayt-biyo'],
  EA:['ayt-mat','ayt-tde','ayt-tar1','ayt-cog1'],
  SOZ:['ayt-tde','ayt-tar1','ayt-cog1','ayt-tar2','ayt-cog2','ayt-felsefe','ayt-din'],
  DIL:['ydt-dil']
};
const TYPE_LABELS = {TYT:'TYT',SAY:'AYT Sayısal',EA:'AYT Eşit Ağırlık',SOZ:'AYT Sözel',DIL:'YDT Dil'};
const esc = v => String(v ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = v => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmt = n => n === null ? '—' : n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const signed = n => n === null ? '—' : (n > 0 ? '+' : '') + fmt(n);
const dateKey = e => e.examDate || (e.tarih?.toDate?.()?.toISOString().slice(0,10)) || (e.tarih?.seconds ? new Date(e.tarih.seconds*1000).toISOString().slice(0,10):'');
const timeKey = e => e.tarih?.toMillis?.() || ((e.tarih?.seconds||0)*1000);
function netOf(exam,id) {
  const item = exam.results?.[id];
  if (item?.entered === false) return null;
  if (item?.entered === true) return number(item.net);
  const label = TESTS[id][0];
  const aliases = id === 'ayt-tde' ? ['AYT TDE',label,'AYT Türkçe'] : [label];
  for (const key of aliases) {
    const n = number(exam.altNetler?.[key]);
    if (n !== null) return n;
  }
  return null;
}

/* Yalnızca tam kayıtlar, aynı puan türü ve azami son beş. */
export function analyzeLastFive(exams,type) {
  const ids = [...TYT,...TYPES[type]];
  if (!TYPES[type]) throw Error('Geçersiz sınav türü');
  const matching = exams.filter(e => e.denemeTuru === type);
  const eligible = matching.filter(e => {
    if (e.complete === false || number(e.toplamNet) === null) return false;
    if (e.complete === true) return true;
    return ids.every(id => netOf(e,id) !== null); // eski kayıtta gerçek ders netleri gerekli
  });
  eligible.sort((a,b)=>dateKey(a).localeCompare(dateKey(b))||timeKey(a)-timeKey(b)||String(a.id||'').localeCompare(String(b.id||'')));
  const records = eligible.slice(-5);
  const values = records.map(e => number(e.toplamNet));
  const latest = values.length ? values.at(-1) : null;
  const average = values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const highest = values.length ? Math.max(...values) : null;
  const change = values.length >= 2 ? values.at(-1)-values[0] : null;
  const subjects = ids.map(id => {
    const first = records.length ? netOf(records[0],id) : null;
    const last = records.length ? netOf(records.at(-1),id) : null;
    return {id,name:TESTS[id][0],first,last,change:first !== null && last !== null && records.length>1 ? last-first : null};
  });
  return {records,values,latest,average,highest,change,subjects,excluded:matching.length-eligible.length};
}

function graph(values) {
  if (!values.length) return '<p class="l5-empty">Bu puan türünde henüz tam deneme bulunmuyor.</p>';
  const w=680,h=220,left=40,right=24,top=30,bottom=38;
  const lo=Math.min(0,...values),hi=Math.max(1,...values),range=Math.max(1,hi-lo);
  const x=i=>values.length===1?w/2:left+i*(w-left-right)/(values.length-1);
  const y=n=>h-bottom-(n-lo)/range*(h-top-bottom);
  return `<div class="l5-graph"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Son denemelerin net grafiği">
  <line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" stroke="#94a3b8"/>
  <polyline points="${values.map((n,i)=>`${x(i)},${y(n)}`).join(' ')}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linejoin="round"/>
  ${values.map((n,i)=>`<circle cx="${x(i)}" cy="${y(n)}" r="5" fill="#2563eb" stroke="white" stroke-width="2"/>
  <text x="${x(i)}" y="${Math.max(15,y(n)-13)}" text-anchor="middle" fill="#174ea6" font-size="12">${fmt(n)}</text>
  <text x="${x(i)}" y="${h-9}" text-anchor="middle" fill="#64748b" font-size="12">${i+1}</text>`).join('')}
  </svg></div>`;
}

let records=[], selectedType='DIL', currentRole='', stopListening=null, initialized=false, observer=null;
let updateQueued=false;
function scheduleMount() {
  if (updateQueued) return;
  updateQueued=true;
  queueMicrotask(()=>{updateQueued=false;mount();});
}
function mount() {
  const app=document.getElementById('app');
  const content=document.getElementById('content');
  if (!app || app.hidden || !content || !['Admin','Öğretmen','Ogretmen','Veli','Koç','Koc'].includes(currentRole)) return;
  const h=content.querySelector('h1,h2');
  const pageTitle=h?.textContent?.toLocaleLowerCase('tr-TR')||'';
  const analysis=pageTitle.includes('analiz');
  const home=pageTitle.includes('genel durum') || pageTitle.includes('öğrencinin genel durumu');
  // app.js içerikleri yeniden çizdiğinde kartları yeniden ekle; seçim aynı kalır.
  if (home && !content.querySelector('#last5-home')) {
    const card=document.createElement('section');
    card.id='last5-home';card.className='card';
    card.innerHTML=`<h2>📈 Son 5 Deneme · v4</h2><p>TYT, SAY, EA, SÖZ ve DİL ayrı ayrı izlenir.</p>
      <button type="button" class="primary" id="l5-open">Son 5 Deneme Analizini Aç</button>`;
    content.append(card);
    card.querySelector('#l5-open').onclick=()=>{
      const nav=[...document.querySelectorAll('#nav button')].find(b=>b.textContent.toLocaleLowerCase('tr-TR').includes('analiz'));
      if(nav)nav.click();else document.getElementById('l5-open').textContent='Detaylı analiz menüsünü açın';
    };
  }
  if (!analysis) return;
  let section=content.querySelector('#last5-analysis');
  if (!section) {
    section=document.createElement('section');
    section.id='last5-analysis';section.className='card';
    content.prepend(section);
  }
  // Sadece veriler veya puan türü değiştiğinde render; MutationObserver döngüsünü önler.
  const signature=selectedType+'|'+records.map(e=>[e.id,e.denemeTuru,e.toplamNet,e.complete,e.examDate,timeKey(e)].join(':')).join('|');
  if (section.dataset.signature===signature) return;
  section.dataset.signature=signature;
  const a=analyzeLastFive(records,selectedType);
  const up=a.subjects.filter(s=>s.change!==null&&s.change>0).sort((x,y)=>y.change-x.change)[0];
  const down=a.subjects.filter(s=>s.change!==null&&s.change<0).sort((x,y)=>x.change-y.change)[0];
  const trend=a.change===null?'Karşılaştırma için en az iki tam deneme gerekiyor.':a.change>0?`İlk ve son deneme arasında ${fmt(a.change)} net artış var.`:a.change<0?`İlk ve son deneme arasında ${fmt(-a.change)} net azalış var.`:'İlk ve son deneme aynı toplam nete sahip.';
  section.innerHTML=`<div class="l5-head"><div><h2>📈 Son 5 Deneme Analizi · v4</h2><p>Aynı puan türündeki son ${a.records.length} tam deneme.</p></div>
    <label>Deneme türü<select id="l5-type">${Object.entries(TYPE_LABELS).map(([id,label])=>`<option value="${id}" ${id===selectedType?'selected':''}>${label}</option>`).join('')}</select></label></div>
    <div class="l5-stats">${[['Son net',a.latest],['Son 5 ortalaması',a.average],['En yüksek net',a.highest],['İlk–son farkı',a.change]].map(([k,v])=>`<div><small>${k}</small><strong>${k==='İlk–son farkı'?signed(v):fmt(v)}</strong></div>`).join('')}</div>
    ${graph(a.values)}
    ${a.excluded?`<p class="l5-note">${a.excluded} eksik/kısmi kayıt karşılaştırmaya alınmadı.</p>`:''}
    <p class="l5-note">${esc(trend)} ${up?esc(up.name+': '+signed(up.change)+' net.'):''} ${down?esc(down.name+': '+signed(down.change)+' net.'):''}</p>
    <h3>Denemeler</h3><div class="l5-table"><table><thead><tr><th>#</th><th>Deneme / Tarih</th><th>Kaynak</th><th>TYT</th><th>Alan</th><th>Toplam</th></tr></thead><tbody>
    ${a.records.map((e,i)=>`<tr><td>${i+1}</td><td>${esc(e.denemeAdi||'Deneme')}<br><small>${esc(dateKey(e)||'—')}</small></td><td>${esc(e.examSource||'—')}</td><td>${fmt(number(e.tytNet))}</td><td>${selectedType==='TYT'?'—':fmt(number(e.fieldNet))}</td><td><strong>${fmt(number(e.toplamNet))}</strong></td></tr>`).join('')||'<tr><td colspan="6">Kayıt yok.</td></tr>'}</tbody></table></div>
    <h3>Ders bazında ilk–son değişim</h3><div class="l5-table"><table><thead><tr><th>Ders</th><th>İlk</th><th>Son</th><th>Fark</th></tr></thead><tbody>
    ${a.subjects.map(s=>`<tr><td>${esc(s.name)}</td><td>${fmt(s.first)}</td><td>${fmt(s.last)}</td><td>${signed(s.change)}</td></tr>`).join('')}</tbody></table></div>
    <p class="l5-note">Net farkı tek başına sınavların eşdeğer olduğunu veya değişimin nedenini göstermez. Buradaki değerler ÖSYM puanı değildir.</p>`;
  section.querySelector('#l5-type').onchange=e=>{selectedType=e.target.value;section.dataset.signature='';scheduleMount();};
}

const style=document.createElement('style');
style.textContent=`
#last5-analysis{overflow:hidden}#last5-analysis h3{margin:20px 0 9px}
.l5-head{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px}
.l5-head label{min-width:190px}.l5-head select{width:100%;min-height:44px}
.l5-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:15px 0}
.l5-stats>div{background:#edf4ff;padding:14px;border-radius:12px;min-width:0}
.l5-stats small{display:block;color:#64748b}.l5-stats strong{display:block;color:#1754ab;font-size:23px;margin-top:5px}
.l5-graph{overflow:auto;background:#f8fbff;border:1px solid #dbeafe;border-radius:11px;padding:7px}
.l5-graph svg{display:block;width:100%;min-width:310px;height:auto}
.l5-note{padding:10px 0;color:#475569;line-height:1.5}.l5-empty{padding:24px;background:#f8fafc;text-align:center}
.l5-table{max-width:100%;overflow-x:auto}.l5-table table{width:100%;border-collapse:collapse;min-width:560px}
.l5-table th,.l5-table td{text-align:left;padding:10px;border-bottom:1px solid #e3eaf5;font-size:13px}
.l5-table th{background:#f1f5fb}
@media(max-width:600px){.l5-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.l5-stats strong{font-size:20px}.l5-head{display:block}.l5-head label{display:block;margin:12px 0}}
`;
document.head.append(style);

const firebaseConfig = {apiKey:'AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M',authDomain:'tayt-bbbbe.firebaseapp.com',projectId:'tayt-bbbbe',storageBucket:'tayt-bbbbe.firebasestorage.app',messagingSenderId:'367442443596',appId:'1:367442443596:web:be954f464173e2abe5e3e9'};
const firebase = getApps()[0] || initializeApp(firebaseConfig);
const auth=getAuth(firebase);
const db=getFirestore(firebase);
onAuthStateChanged(auth,async user=>{
  if(stopListening){stopListening();stopListening=null;}
  records=[];currentRole='';
  if(!user){scheduleMount();return;}
  try {
    const snap=await getDoc(doc(db,'Users',user.uid));
    currentRole=String(snap.data()?.Rol||'Öğrenci').trim();
    if(!['Admin','Öğretmen','Ogretmen','Veli','Koç','Koc'].includes(currentRole))return;
    stopListening=onSnapshot(collection(db,'Denemeler'),snapshot=>{
      records=snapshot.docs.map(d=>({id:d.id,...d.data()}));
      const sec=document.getElementById('last5-analysis');if(sec)sec.dataset.signature='';
      scheduleMount();
    },error=>console.error('Son 5 deneme Firestore okuma hatası:',error));
    if(!observer){observer=new MutationObserver(scheduleMount);observer.observe(document.getElementById('app')||document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});}
    scheduleMount();
  } catch(error){console.error('Son 5 deneme başlatılamadı:',error);}
});
