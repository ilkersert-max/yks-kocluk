import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,getDocs,query,orderBy,serverTimestamp,onSnapshot,updateDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';
import {TESTS,TYPES,idsFor,parseNumber,format,computeExam,obpFromProfile,successIndicator,normalizedExamTotals} from './scoring.js';
// Existing project's Firebase app: host this folder as static files (GitHub Pages / simple HTTP server).
const cfg={apiKey:'AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M',authDomain:'tayt-bbbbe.firebaseapp.com',projectId:'tayt-bbbbe',storageBucket:'tayt-bbbbe.firebasestorage.app',messagingSenderId:'367442443596',appId:'1:367442443596:web:be954f464173e2abe5e3e9'};
const firebase=initializeApp(cfg),auth=getAuth(firebase),db=getFirestore(firebase);
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultSettings={examEntryMode:'BOTH',defaultEntryMode:'NET',studentDetailedMode:false,studentCelebrationSound:true,testMode:true};
let user=null,role='Öğrenci',settings={...defaultSettings},profile={diplomaStatus:'unknown',diplomaNote:null,brokenObp:false},exams=[],tasks=[],tests=[],unsubs=[],view='home',draftMode='NET',draftType='TYT',draft={},draftMeta={},assignmentFilter='all';
const staff=()=>['Admin','Öğretmen','Koç','Veli'].includes(role);
const canAssign=()=>['Admin','Öğretmen','Koç','Veli'].includes(role);
const canAdmin=()=>role==='Admin';
// Motivasyon, her başarılı öğrenci oturumunda bir sonraki söze geçer.
const MOTIVATION=[
  'Bugünkü küçük adımlar, yarının büyük ilerlemesi.',
  'Mükemmel olmak değil, bugün bir adım ilerlemek önemli.',
  'Her yeni deneme, kendini biraz daha tanıma fırsatı.',
  'Sabırla yaptığın çalışma birikiyor; devam et!',
  'Bugün gösterdiğin emek kendine verdiğin değer.',
  'Yorulduğunda dinlenebilirsin; sonra kaldığın yerden devam.',
  'Dünle yarış; başkalarıyla değil.',
  'İlerlemeni fark et: Başladığın yerde değilsin.'
];
let loginMotivation=MOTIVATION[0];
let wipeInProgress=false, wipeStatus='';
function nextMotivation(){
  let n=0;
  try { n=Number(localStorage.getItem('yksMotivationIndex')||0); localStorage.setItem('yksMotivationIndex',String(n+1)); } catch (_) {}
  return MOTIVATION[Math.abs(n)%MOTIVATION.length];
}
// Kullanıcının yüklediği özgün alkış/tezahürat kaydı; sentetik ses motoru kaldırıldı.
const applauseAudio = new Audio('./alkis.mp3');
applauseAudio.preload = 'none';
function playCelebration(){
  if (settings.studentCelebrationSound === false) return;
  applauseAudio.pause();
  applauseAudio.currentTime = 0;
  const playPromise = applauseAudio.play();
  if (playPromise?.catch) playPromise.catch(() => notify('Sesi başlatmak için düğmeye tekrar dokun veya cihaz sesini kontrol et.', true));
}
const BOOK_OPTIONS=[
  ['345-allstar','ÜçDörtBeş (345) – All Star Serisi'],
  ['345-other','ÜçDörtBeş (345) – Diğer Seriler'],
  ['other','Başka yayın / kitap']
];
function bookFields(prefix, required=true){
  return `<label>Kitap / yayın<select id="${prefix}-book-choice">${BOOK_OPTIONS.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label><label>Kitap adı / seri detayı<input id="${prefix}-book-detail" ${required?'required':''} placeholder="Örn. TYT Matematik / Problemler"></label>`;
}
function readBook(prefix){
  const selection=$(prefix+'-book-choice').value;
  const detail=$(prefix+'-book-detail').value.trim();
  if(!detail)throw Error('Kitabın adını / dersini belirt.');
  const base=BOOK_OPTIONS.find(x=>x[0]===selection)?.[1]||'Diğer';
  return {bookChoice:selection,bookDetail:detail,bookLabel:selection==='other'?detail:base+' – '+detail};
}

function notify(msg,error=false){const el=$('toast');el.textContent=msg;el.style.background=error?'#ad2932':'#22324c';el.style.display='block';setTimeout(()=>{el.style.display='none'},5000)}
function E(tag,attributes={},text){const el=document.createElement(tag);for(const[k,v]of Object.entries(attributes)){if(k==='className')el.className=v;else if(k==='value')el.value=v;else if(k==='type')el.type=v;else if(k==='checked')el.checked=v;else el.setAttribute(k,v)}if(text!==undefined)el.textContent=text;return el;}
function detail(name,value){return `<div class="stat"><small>${esc(name)}</small><strong>${value}</strong></div>`}
function dateString(value){if(!value)return '—';if(value.toDate)return value.toDate().toLocaleDateString('tr-TR');return String(value).slice(0,10).split('-').reverse().join('.');}
function normalizedRole(r){if(r==='Ogretmen')return 'Öğretmen';return ['Admin','Öğretmen','Koç','Veli','Öğrenci'].includes(r)?r:'Öğrenci'}
function tearDown(){for(const f of unsubs)f();unsubs=[];exams=[];tasks=[];tests=[]}
async function boot(u){tearDown();user=u;const us=await getDoc(doc(db,'Users',u.uid));const data=us.exists()?us.data():{};role=normalizedRole((data.Rol||'Öğrenci').trim());if(role==='Öğrenci')loginMotivation=nextMotivation();$('hello').textContent=`${data.AdSoyad||'Kullanıcı'} · ${role}`;
 try{const [s,p]=await Promise.all([getDoc(doc(db,'Settings','SystemConfig')),getDoc(doc(db,'StudentProfile','mainStudent'))]);settings={...defaultSettings,...(s.exists()?s.data():{})};profile={...profile,...(p.exists()?p.data():{})};}catch(err){notify('Ayarlar/profil alınamadı: '+err.message,true)}
 draftMode=settings.examEntryMode==='BOTH'?settings.defaultEntryMode:settings.examEntryMode;if(!['NET','DY'].includes(draftMode))draftMode='NET';$('login').hidden=true;$('app').hidden=false;
 for(const[name,cb]of[['Denemeler',data=>exams=data],['Assignments',data=>tasks=data],['TestEntries',data=>tests=data]]){const unsubscribe=onSnapshot(collection(db,name),snap=>{cb(snap.docs.map(x=>({id:x.id,...x.data()})));render()},err=>notify(name+' okunamadı: '+err.message,true));unsubs.push(unsubscribe)}
 view='home';render();}
onAuthStateChanged(auth,u=>{if(u){boot(u).catch(e=>notify('Giriş sonrası yükleme hatası: '+e.message,true))}else{applauseAudio.pause();tearDown();user=null;$('app').hidden=true;$('login').hidden=false}});
$('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').textContent='';try{await signInWithEmailAndPassword(auth,$('email').value,$('password').value)}catch(e){$('login-error').textContent='Giriş başarısız: '+e.code}});
$('logout').addEventListener('click',()=>signOut(auth));
function render(){
 if(!user)return;
 const tabs=role==='Öğrenci'
   ? [['home','Ana sayfam'],['exam','Deneme gir'],['test','Soru çözdüm'],['tasks','Ödevlerim'],['history','Denemelerim']]
   : [['home','Genel durum'],['history','Denemeler'],['test','Günlük çalışmalar'],['tasks','Ödev yönetimi']];
 if(staff()||settings.studentDetailedMode)tabs.push(['analysis',role==='Öğrenci'?'Gelişimim':'Detaylı analiz']);
 if(staff())tabs.push(['reports','Raporlar']);
 if(canAdmin())tabs.push(['admin','Admin']);
 tabs.push(['profile','Diploma / OBP']);
 $('nav').replaceChildren(...tabs.map(([id,label])=>{const b=E('button',{className:id===view?'active':''},label);b.onclick=()=>{view=id;render()};return b}));
 const r={home:renderHome,exam:renderExam,test:renderTest,tasks:renderTasks,history:renderHistory,analysis:renderAnalysis,reports:renderReports,admin:renderAdmin,profile:renderProfile}[view]||renderHome;r();
}
function renderHome(){
 const latest=[...exams].sort((a,b)=>(b.examDate||'').localeCompare(a.examDate||''));
 const last=latest[0],completed=tasks.filter(t=>t.status==='completed'||t.status==='reviewed').length;
 const student=role==='Öğrenci';
 $('content').innerHTML=`
 ${student?`<section class="card motivation"><div class="celebrate-icon" aria-hidden="true">👏 🎉</div><h1>Merhaba, bugün de buradasın!</h1><p class="motivation-quote">${esc(loginMotivation)}</p><div class="buttons"><button type="button" id="celebrate-btn" class="primary applause-button">👏 Alkış ve tezahürat</button><button type="button" id="next-quote" class="subtle">Başka bir söz</button></div><small>Ses yalnızca düğmeye basınca çalar; cihazın sesini kontrol et.</small></section>`:''}
 <section class="card"><h1>${student?'Bugün ne yaptın? 👋':'Öğrencinin genel durumu'}</h1><p class="muted">${student?'Kısa bir giriş yeterli; detaylara istediğinde bakarsın.':'Tek öğrencinin okul, kurs ve ev çalışmaları tek yerde.'}</p><div class="stats">${detail('Son deneme',last?`${esc(last.denemeTuru)} · ${format(normalizedExamTotals(last)?.totalNet??Number(last.toplamNet))}`:'Henüz yok')}${detail('Deneme sayısı',exams.length)}${detail('Tamamlanan ödev',`${completed}/${tasks.length}`)}${detail('Günlük test',tests.length)}</div></section>
 ${student?`<div class="grid"><section class="card"><h2>📝 Deneme girdim</h2><p>Okul, kurs veya ev denemesi.</p><button class="primary" data-nav="exam">Deneme ekle</button></section><section class="card"><h2>✏️ Soru çözdüm</h2><p>Kitabını seç, sonucunu gir.</p><button class="primary" data-nav="test">Çalışma ekle</button></section><section class="card"><h2>📚 Ödevlerim</h2><p>Bugünkü görevlerini tamamla.</p><button class="primary" data-nav="tasks">Ödevleri aç</button></section></div>`:`<div class="grid"><section class="card"><h2>📊 Deneme takibi</h2><p>Tüm sınavlar, netler ve kaynaklar.</p><button class="primary" data-nav="history">Denemeleri incele</button></section><section class="card"><h2>📚 Ödev yönetimi</h2><p>Ödev ata, sonucu değerlendir.</p><button class="primary" data-nav="tasks">Ödevleri aç</button></section><section class="card"><h2>📈 Detaylı analiz</h2><p>Çalışma ve gelişim sonuçları.</p><button class="primary" data-nav="analysis">Analizleri aç</button></section></div>`}
 ${last?`<section class="card"><h2>Son deneme</h2><p>${esc(last.denemeAdi)} · ${dateString(last.examDate||last.tarih)} · ${esc(last.examSource||'Kaynak belirtilmemiş')}</p><strong>${format(normalizedExamTotals(last)?.totalNet??Number(last.toplamNet))} net</strong></section>`:''}`;
 document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{view=b.dataset.nav;render()});
 if(student){
  $('celebrate-btn').disabled=settings.studentCelebrationSound===false;
  if(settings.studentCelebrationSound===false)$('celebrate-btn').textContent='🔇 Ses Admin tarafından kapalı';
  $('celebrate-btn').onclick=playCelebration;
  $('next-quote').onclick=()=>{loginMotivation=nextMotivation();renderHome()};
 }
}
function renderExam(){const allowed=settings.examEntryMode==='BOTH'?['NET','DY']:[settings.examEntryMode];if(!allowed.includes(draftMode))draftMode=allowed[0]||'NET';const modeButtons=allowed.length>1?`<div class="tabbar"><button type="button" class="${draftMode==='NET'?'active':''}" data-mode="NET">⚡ Hızlı net</button><button type="button" class="${draftMode==='DY'?'active':''}" data-mode="DY">Doğru / Yanlış</button></div>`:`<p class="muted">Giriş yöntemi: ${draftMode==='NET'?'Hızlı net':'Doğru / yanlış'}</p>`;
 $('content').innerHTML=`<div class="card"><h1>Yeni deneme sonucu</h1><p class="muted">${staff()?'Öğrenci adına sonuç girilebilir.':'Sadece bildiğin sonuçları gir; boş alanlar sıfır sayılmaz.'}</p><form id="exam-form"><div class="grid"><label>Deneme adı<input id="exam-name" required placeholder="Örn. Özdebir TYT 3" value="${esc(draftMeta.name||'')}"></label><label>Deneme tarihi<input id="exam-date" required type="date" value="${draftMeta.date||new Date().toISOString().slice(0,10)}"></label><label>Kaynak<select id="exam-source"><option>Okul</option><option>Kurs</option><option>Ev / Bireysel</option><option>Türkiye Geneli</option><option>Diğer</option></select></label><label>Sınav / puan türü<select id="exam-type">${[['TYT','TYT'],['SAY','AYT SAY'],['EA','AYT EA'],['SOZ','AYT SÖZ'],['DIL','YDT DİL']].map(([v,t])=>`<option value="${v}" ${v===draftType?'selected':''}>${t}</option>`).join('')}</select></label><label>Yayın / kurum (isteğe bağlı)<input id="exam-publisher" value="${esc(draftMeta.publisher||'')}"></label><label>Kurumun açıkladığı puan (isteğe bağlı)<input id="exam-official" inputmode="decimal" placeholder="Biliniyorsa"></label></div>${modeButtons}<div id="exam-rows"></div><div id="exam-summary" class="summary">Sonuçları girince toplam net burada görünür.</div><div id="exam-err" class="error" role="alert"></div><div class="buttons"><button class="primary">Denemeyi kaydet</button><button type="button" id="exam-clear" class="subtle">Formu temizle</button></div></form><div class="warning">Netler 0,25 adımlı ve küsüratlı saklanır. YKS'nin resmî veya tahmini puanı, doğrulanmış standartlaştırma modeli olmadığından burada üretilmez. Diploma/OBP öğrenci profilinde tutulur.</div></div>`;
 $('exam-source').value=draftMeta.source||'Okul';$('exam-type').onchange=()=>{saveDraftMeta();draftType=$('exam-type').value;renderExam()};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{saveDraftMeta();draftMode=b.dataset.mode;draft={};renderExam()});$('exam-clear').onclick=()=>{draft={};draftMeta={};renderExam()};$('exam-form').onsubmit=saveExam;renderExamRows();}
function saveDraftMeta(){draftMeta={name:$('exam-name').value,date:$('exam-date').value,source:$('exam-source').value,publisher:$('exam-publisher').value};}
function renderExamRows(){const ids=idsFor(draftType),rows=$('exam-rows');rows.replaceChildren();let group='';for(const id of ids){const t=TESTS[id];if(t.group!==group){group=t.group;rows.append(E('h2',{},group==='TYT'?'TYT dersleri':group==='YDT'?'YDT':'Alan dersleri'))}const row=E('div',{className:'testrow '+(draftMode==='NET'?'netmode':'')});row.append(E('strong',{},t.label),E('span',{className:'small'},`${t.q} soru`));if(draftMode==='NET'){const i=E('input',{inputmode:'decimal',placeholder:'Net (23,75)',value:draft[id]?.net??''});i.addEventListener('input',()=>{draft[id]={net:i.value};updateExamSummary()});row.append(i)}else{for(const key of ['correct','wrong']){const i=E('input',{type:'number',min:'0',step:'1',max:String(t.q),placeholder:key==='correct'?'Doğru':'Yanlış',value:draft[id]?.[key]??''});i.addEventListener('input',()=>{draft[id]={...(draft[id]||{}),[key]:i.value};updateExamSummary()});row.append(i)}row.append(E('span',{className:'testnet small',id:'preview-'+id},'—'))}rows.append(row)}updateExamSummary();}
function updateExamSummary(){const box=$('exam-summary'),err=$('exam-err');try{const x=computeExam(draftType,draftMode,draft);box.textContent=`TYT ${format(x.tytNet)} · Alan ${format(x.fieldNet)} · Toplam ${format(x.totalNet)} net${x.complete?'':' · Kısmi giriş'}`;if(err)err.textContent='';for(const id of idsFor(draftType)){const e=$('preview-'+id);if(e)e.textContent=format(x.results[id].net)}}catch(e){if(box)box.textContent='Sonuçları kontrol et';if(err)err.textContent=e.message}}
async function saveExam(e){e.preventDefault();saveDraftMeta();const error=$('exam-err');try{const computed=computeExam(draftType,draftMode,draft);const op=obpFromProfile(profile);const indicator=successIndicator(draftType,computed);const altNetler={};for(const[id,r]of Object.entries(computed.results))if(r.entered)altNetler[TESTS[id].label]=r.net;const official=parseNumber($('exam-official').value);if($('exam-official').value.trim()!==''&&official===null)throw Error('Kurum puanı sayısal olmalıdır.');await addDoc(collection(db,'Denemeler'),{schemaVersion:2,studentKey:'mainStudent',createdBy:user.uid,createdByRole:role,denemeAdi:draftMeta.name,examDate:draftMeta.date,examSource:draftMeta.source,publisher:draftMeta.publisher,denemeTuru:draftType,entryMode:draftMode,results:computed.results,altNetler,tytNet:computed.tytNet,fieldNet:computed.fieldNet,toplamNet:computed.totalNet,complete:computed.complete,indicator,indicatorLabel:'Net başarı göstergesi (ÖSYM puanı değildir)',reportedScore:official,obpSnapshot:op||null,obpVersion:'profile-at-entry',tarih:serverTimestamp()});draft={};draftMeta={};notify('Deneme kaydedildi.');view='history';render()}catch(err){error.textContent=err.message;notify('Deneme kaydedilemedi: '+err.message,true)}}
function renderProfile(){$('content').innerHTML=`<div class="card"><h1>Diploma notu ve OBP</h1><p>Bir kere profilde tanımlanır; her denemede tekrar sorulmaz.</p><form id="profile-form"><label>Diploma notu durumu<select id="diploma-status"><option value="unknown">Henüz bilinmiyor</option><option value="estimated">Tahmini diploma notu</option><option value="final">Kesinleşmiş diploma notu</option></select></label><label>Diploma notu (50–100)<input id="diploma-note" inputmode="decimal" placeholder="Örn. 90,25" value="${profile.diplomaNote??''}"></label><label><input id="broken-obp" type="checkbox" style="width:auto" ${profile.brokenObp?'checked':''}> İlgili yılın kurallarına göre kırık OBP uygulanacak</label><div id="obp-preview" class="summary"></div><p class="muted">OBP = diploma notu × 5. Normal katkı × 0,12; uygun durumda kırık katkı × 0,06. Ek puan/istisnalar bu sürümde otomatik uygulanmaz.</p><button class="primary">Bilgileri kaydet</button></form></div>`;$('diploma-status').value=profile.diplomaStatus||'unknown';function preview(){const x=obpFromProfile({diplomaStatus:$('diploma-status').value,diplomaNote:$('diploma-note').value,brokenObp:$('broken-obp').checked});$('obp-preview').textContent=x?`OBP: ${format(x.obp)} · Katsayı: ${String(x.factor).replace('.',',')} · Yerleştirme katkısı: ${format(x.contribution)}${x.isEstimate?' (tahmini)':''}`:'OBP katkısı henüz hesaplanamıyor.'}$('diploma-status').onchange=preview;$('diploma-note').oninput=preview;$('broken-obp').onchange=preview;preview();$('profile-form').onsubmit=async e=>{e.preventDefault();const status=$('diploma-status').value,note=parseNumber($('diploma-note').value);if(status!=='unknown'&&(note===null||note<50||note>100)){notify('Diploma notu 50–100 arasında olmalıdır.',true);return}profile={diplomaStatus:status,diplomaNote:status==='unknown'?null:note,brokenObp:$('broken-obp').checked,updatedAt:serverTimestamp()};try{await setDoc(doc(db,'StudentProfile','mainStudent'),profile,{merge:true});notify('OBP bilgileri kaydedildi.');render()}catch(err){notify(err.message,true)}};}
function sortedExams(){return [...exams].sort((a,b)=>(b.examDate||b.tarih?.toDate?.()?.toISOString()||'').localeCompare(a.examDate||a.tarih?.toDate?.()?.toISOString()||''))}
function renderHistory(){const rows=sortedExams().map(x=>{const res=x.results||{};const pills=Object.keys(res).filter(k=>res[k]?.entered).map(k=>`<span class="pill">${esc(TESTS[k]?.label||k)} ${format(res[k].net)}</span>`).join('')||Object.entries(x.altNetler||{}).map(([k,v])=>`<span class="pill">${esc(k)} ${format(v)}</span>`).join('');const summary=x.indicator!==null&&x.indicator!==undefined?`${format(x.indicator)} (net göstergesi)`:x.schemaVersion===2?'Hesaplanmadı':'Eski kayıt: önceki yaklaşık puan hesabı';return `<tr><td>${esc(x.denemeAdi||'Deneme')}<br><small>${esc(x.denemeTuru||'')}</small></td><td>${esc(x.examSource||'Eski kayıt')}<br><small>${dateString(x.examDate||x.tarih)}</small></td><td>${pills}</td><td><strong>${format(normalizedExamTotals(x)?.totalNet??Number(x.toplamNet))}</strong></td><td>${summary}</td></tr>`}).join('');$('content').innerHTML=`<div class="card"><h1>Deneme geçmişi</h1>${staff()?'<button type="button" class="primary" id="history-add">+ Sonuç ekle</button>':''}<p class="muted">Okul, kurs, ev ve Türkiye geneli denemeler tek yerde.</p><div class="tablewrap"><table><thead><tr><th>Deneme</th><th>Kaynak / Tarih</th><th>Ders netleri</th><th>Toplam</th><th>Gösterge</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Henüz deneme yok.</td></tr>'}</tbody></table></div></div>`;if(staff())$('history-add').onclick=()=>{view='exam';render()};}
function renderTest(){$('content').innerHTML=`<div class="card"><h1>${staff()?'Günlük çalışmalar':'Bugün soru çözdüm'}</h1>${staff()?'<p>Öğrencinin günlük çalışmalarını analiz sekmesinden inceleyebilirsin. Gerekirse burada çocuk adına kayıt girebilirsin.</p>':''}<p class="muted">Sade günlük çalışma girişi. Ödevle ilişkiliyse sonuç girmek için Ödevler bölümünü kullan.</p><form id="test-form"><div class="grid"><label>Ders<select id="test-subject">${Object.values(TESTS).map(t=>`<option>${esc(t.label)}</option>`).join('')}</select></label>${bookFields("test")}<label>Konu / Test<input id="test-topic" required></label><label>Toplam soru<input id="test-count" type="number" min="1" step="1" required></label><label>Doğru<input id="test-correct" type="number" min="0" step="1" required></label><label>Yanlış<input id="test-wrong" type="number" min="0" step="1" required></label></div><div id="test-preview" class="summary">Doğru/yanlış girince net hesaplanır.</div><button class="primary">Çalışmayı kaydet</button></form></div>`;function preview(){const q=parseNumber($('test-count').value),d=parseNumber($('test-correct').value),w=parseNumber($('test-wrong').value);$('test-preview').textContent=q!==null&&d!==null&&w!==null&&q>=d+w?`Boş ${q-d-w} · Net ${format(d-w/4)}`:'Toplam soru, doğru ve yanlış sayılarını gir.'}['test-count','test-correct','test-wrong'].forEach(k=>$(k).oninput=preview);$('test-form').onsubmit=async e=>{e.preventDefault();const q=parseNumber($('test-count').value),d=parseNumber($('test-correct').value),w=parseNumber($('test-wrong').value);if(![q,d,w].every(Number.isInteger)||q<1||d<0||w<0||d+w>q){notify('Soru sayıları geçersiz.',true);return}try{const book=readBook('test');await addDoc(collection(db,'TestEntries'),{schemaVersion:2,studentKey:'mainStudent',createdBy:user.uid,ders:$('test-subject').value,kitap:book.bookLabel,bookChoice:book.bookChoice,bookDetail:book.bookDetail,konu:$('test-topic').value.trim(),dogru:d,yanlis:w,bos:q-d-w,questionCount:q,net:d-w/4,tarih:serverTimestamp()});notify('Çalışma kaydedildi.');view='home';render()}catch(err){notify(err.message,true)}};}
function renderTasks(){const list=[...tasks].sort((a,b)=>(a.dueDate||a.tarih||'').localeCompare(b.dueDate||b.tarih||''));$('content').innerHTML=`<div class="card"><h1>Ödevler</h1><p class="muted">Öğretmen, veli ve koçun verdiği çalışmalar tek yerde. Sonuçlar bütün rollerce görülebilir.</p>${canAssign()?`<details><summary><strong>+ Yeni ödev ata</strong></summary><form id="assignment-form"><div class="grid"><label>Ders<select id="task-subject">${Object.values(TESTS).map(t=>`<option>${esc(t.label)}</option>`).join('')}</select></label>${bookFields("task")}<label>Konu / test<input id="task-topic" required></label><label>Toplam soru<input id="task-q" type="number" min="1" step="1" required></label><label>Hedef doğru (opsiyonel)<input id="task-target" type="number" min="0" step="1"></label><label>Son tarih<input id="task-date" type="date" required></label></div><label>Not<textarea id="task-note" rows="2"></textarea></label><button class="primary">Ödev ata</button></form></details>`:''}</div><div id="task-list"></div>`;if(canAssign())$('assignment-form').onsubmit=saveTask;const listEl=$('task-list');if(!list.length){listEl.innerHTML='<div class="card">Henüz ödev atanmadı.</div>';return}for(const t of list){const legacy=!t.schemaVersion;const done=t.status==='completed'||t.status==='reviewed';const card=E('section',{className:'card'});card.innerHTML=`<div class="taskhead"><h3>${esc(t.ders)} · ${esc(t.konu)}</h3><span class="pill">${esc(t.status||t.durum||'Bekliyor')}</span></div><p>${esc(t.kitap)} · Son tarih ${dateString(t.dueDate||t.tarih)}</p><p class="muted">Atayan: ${esc(t.assignedByRole||'Eski kayıt')} ${t.questionCount?'· '+t.questionCount+' soru':''} ${t.targetCorrect!==null&&t.targetCorrect!==undefined?'· Hedef '+t.targetCorrect+' doğru':''}</p>${t.note?`<p>${esc(t.note)}</p>`:''}${t.result?`<div class="summary">${t.result.correct} doğru · ${t.result.wrong} yanlış · ${t.result.blank} boş · ${format(t.result.net)} net</div>`:''}${legacy?'<p class="warning">Eski ödev kaydı: soru sayısı ve sonuç alanları yok. Yeni formatta ödev oluşturabilirsiniz.</p>':''}`;
 if(!legacy){const controls=E('div',{className:'buttons'});if(!done){const b=E('button',{className:'secondary'},t.result?'Sonucu güncelle':'Sonuç gir');b.onclick=()=>showTaskResult(card,t);controls.append(b)}if(canAssign()){const b=E('button',{className:'subtle'},t.review?'Değerlendirmeyi güncelle':'Değerlendir');b.onclick=()=>showTaskReview(card,t);controls.append(b)}card.append(controls);if(t.review)card.append(E('p',{className:'muted'},'Değerlendirme: '+t.review))}listEl.append(card)} }
async function saveTask(e){e.preventDefault();const q=parseNumber($('task-q').value),target=parseNumber($('task-target').value);if(!Number.isInteger(q)||q<1||(target!==null&&(!Number.isInteger(target)||target<0||target>q))){notify('Soru sayısı / hedef geçersiz.',true);return}try{const book=readBook('task');await addDoc(collection(db,'Assignments'),{schemaVersion:2,studentKey:'mainStudent',ders:$('task-subject').value,kitap:book.bookLabel,bookChoice:book.bookChoice,bookDetail:book.bookDetail,konu:$('task-topic').value.trim(),questionCount:q,targetCorrect:target,dueDate:$('task-date').value,note:$('task-note').value.trim(),status:'waiting',assignedBy:user.uid,assignedByRole:role,atanmaTarihi:serverTimestamp()});notify('Ödev atandı.')}catch(e){notify(e.message,true)}}
function showTaskResult(card,t){const old=card.querySelector('.task-editor');if(old){old.remove();return}const editor=E('form',{className:'task-editor'});editor.innerHTML=`<h3>Ödev sonucu</h3><p>Ödev ${t.questionCount} soru; kısmi çalışma girebilirsin.</p><div class="grid"><label>Çözülen soru<input name="attempted" type="number" min="0" max="${t.questionCount}" value="${t.result?.attempted??t.questionCount}" required></label><label>Doğru<input name="correct" type="number" min="0" value="${t.result?.correct??''}" required></label><label>Yanlış<input name="wrong" type="number" min="0" value="${t.result?.wrong??''}" required></label></div><label><input type="checkbox" name="finished" style="width:auto" ${t.status==='completed'?'checked':''}> Ödevi tamamladım</label><button class="primary">Sonucu kaydet</button>`;editor.onsubmit=async e=>{e.preventDefault();const a=parseNumber(editor.elements.attempted.value),d=parseNumber(editor.elements.correct.value),w=parseNumber(editor.elements.wrong.value);if(![a,d,w].every(Number.isInteger)||a<0||d<0||w<0||d+w>a||a>t.questionCount){notify('Ödev soru sayıları geçersiz.',true);return}const finished=editor.elements.finished.checked;if(finished&&a!==t.questionCount){notify('Ödev tamamlandı işaretlemek için soru sayısını tamamla.',true);return}try{await updateDoc(doc(db,'Assignments',t.id),{result:{attempted:a,correct:d,wrong:w,blank:a-d-w,remaining:t.questionCount-a,net:d-w/4,updatedBy:user.uid},status:finished?'completed':'in_progress',resultUpdatedAt:serverTimestamp()});notify('Ödev sonucu kaydedildi.')}catch(err){notify(err.message,true)}};card.append(editor)}
function showTaskReview(card,t){const old=card.querySelector('.review-editor');if(old){old.remove();return}const form=E('form',{className:'review-editor'});form.innerHTML='<label>Ödev değerlendirmesi<textarea name="review" rows="3" required></textarea></label><button class="primary">Değerlendirmeyi kaydet</button>';form.elements.review.value=t.review||'';form.onsubmit=async e=>{e.preventDefault();try{await updateDoc(doc(db,'Assignments',t.id),{review:form.elements.review.value.trim(),reviewedBy:user.uid,reviewedByRole:role,reviewedAt:serverTimestamp(),status:t.status==='completed'?'reviewed':t.status});notify('Değerlendirme kaydedildi.')}catch(err){notify(err.message,true)}};card.append(form)}
function renderAnalysis(){const ordered=[...exams].sort((a,b)=>(a.examDate||'').localeCompare(b.examDate||''));const unique=[...new Set(ordered.map(x=>x.denemeTuru||'TYT'))];const totals=ordered.map(e=>normalizedExamTotals(e)?.totalNet??Number(e.toplamNet)).filter(Number.isFinite);const avg=totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:null;const topics={};for(const t of tests){const k=(t.ders||'')+' / '+(t.konu||'');const q=Number(t.questionCount??(Number(t.dogru||0)+Number(t.yanlis||0)+Number(t.bos||0)));if(!topics[k])topics[k]={correct:0,total:0,tests:0};topics[k].correct+=Number(t.dogru||0);topics[k].total+=q;topics[k].tests++}const cards=Object.entries(topics).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.tests}</td><td>${v.total?format(100*v.correct/v.total)+'%':'—'}</td></tr>`).join('');const trend=unique.map(type=>{const data=ordered.filter(x=>(x.denemeTuru||'TYT')===type);const vals=data.map(e=>normalizedExamTotals(e)?.totalNet??Number(e.toplamNet));const last=vals.at(-1),first=vals[0];return `<tr><td>${esc(type)}</td><td>${data.length}</td><td>${format(last)}</td><td>${format(last-first)}</td></tr>`}).join('');$('content').innerHTML=`<div class="card"><h1>Öğrenci analizi</h1><p class="muted">Tek öğrencinin deneme, test ve ödev kayıtları. Farklı puan türlerinin netleri birbiriyle karıştırılmaz.</p><div class="stats">${detail('Deneme sayısı',exams.length)}${detail('Toplam çözülen günlük soru',tests.reduce((a,t)=>a+Number(t.questionCount??(Number(t.dogru||0)+Number(t.yanlis||0)+Number(t.bos||0))),0))}${detail('Tamamlanan ödev',tasks.filter(t=>['completed','reviewed'].includes(t.status)).length)}${detail('Kaydedilmiş test',tests.length)}</div></div><div class="card"><h2>Puan türüne göre net ilerleme</h2><div class="tablewrap"><table><thead><tr><th>Tür</th><th>Deneme</th><th>Son net</th><th>İlk-son farkı</th></tr></thead><tbody>${trend||'<tr><td colspan="4">Veri yok</td></tr>'}</tbody></table></div><p class="muted">Farklı zorluktaki denemeler birebir eşdeğer kabul edilmez.</p></div><div class="card"><h2>Günlük çalışma: konu doğru oranı</h2><div class="tablewrap"><table><thead><tr><th>Ders / Konu</th><th>Test sayısı</th><th>Doğru oranı</th></tr></thead><tbody>${cards||'<tr><td colspan="3">Henüz çalışma yok</td></tr>'}</tbody></table></div></div><div class="card"><h2>Ödev sonuçları</h2>${tasks.map(t=>`<div class="task"><strong>${esc(t.ders)} · ${esc(t.konu)}</strong><p class="muted">${esc(t.assignedByRole||'Eski kayıt')} · ${esc(t.status||t.durum||'Bekliyor')}</p>${t.result?`${t.result.correct} doğru · ${t.result.wrong} yanlış · ${format(t.result.net)} net`: 'Sonuç girilmedi'}${t.review?`<p>${esc(t.review)}</p>`:''}</div>`).join('')||'Henüz ödev yok'}</div>`;}
function renderReports(){const op=obpFromProfile(profile);$('content').innerHTML=`<div class="card"><h1>Öğrenci durum raporu</h1><p class="muted">Tarayıcının Yazdır → PDF olarak kaydet seçeneğiyle bilgisayarda PDF oluşturulabilir.</p><div class="buttons noprint"><button id="print-report" class="primary">Yazdır / PDF</button><button id="export-json" class="secondary">JSON yedeği</button></div><hr><h2>Diploma / OBP</h2><p>${op?`Diploma notu: ${format(op.diploma)} · OBP: ${format(op.obp)} · Katkı: ${format(op.contribution)} ${op.isEstimate?'(tahmini)':''}`:'Diploma notu / OBP henüz bilinmiyor.'}</p><h2>Denemeler</h2><div class="tablewrap"><table><thead><tr><th>Deneme</th><th>Tür</th><th>Tarih</th><th>Net</th></tr></thead><tbody>${sortedExams().map(x=>`<tr><td>${esc(x.denemeAdi)}</td><td>${esc(x.denemeTuru)}</td><td>${dateString(x.examDate||x.tarih)}</td><td>${format(normalizedExamTotals(x)?.totalNet??Number(x.toplamNet))}</td></tr>`).join('')||'<tr><td colspan="4">Veri yok</td></tr>'}</tbody></table></div><h2>Ödevler</h2>${tasks.map(t=>`<p>${esc(t.ders)} – ${esc(t.konu)} · ${esc(t.status||t.durum||'Bekliyor')} ${t.result?'· '+format(t.result.net)+' net':''}</p>`).join('')||'<p>Henüz ödev yok.</p>'}</div>`;$('print-report').onclick=()=>window.print();$('export-json').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),profile,exams,tasks,tests},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='YKS-Ogrenci-Yedek-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};}
function renderAdmin(){$('content').innerHTML=`<div class="card"><h1>Admin · Giriş parametreleri</h1><p class="muted">Tek öğrencinin deneme giriş yöntemi tüm kullanıcılara uygulanır. Daha önce kaydedilmiş denemeler değişmez.</p><form id="admin-form"><label>Deneme sonuç giriş yöntemi<select id="setting-mode"><option value="BOTH">Her iki yöntem</option><option value="NET">Yalnızca net</option><option value="DY">Yalnızca doğru / yanlış</option></select></label><label>Her iki yöntem açıkken varsayılan<select id="setting-default"><option value="NET">Hızlı net</option><option value="DY">Doğru / yanlış</option></select></label><label><input type="checkbox" id="setting-details" style="width:auto"> Öğrencinin detaylı analiz sekmesini göster</label><label><input type="checkbox" id="setting-sound" style="width:auto"> Öğrencinin alkış/tezahürat ses düğmesini göster</label><button class="primary">Ayarları kaydet</button></form></div>`;$('setting-mode').value=settings.examEntryMode||'BOTH';$('setting-default').value=settings.defaultEntryMode||'NET';$('setting-details').checked=settings.studentDetailedMode===true;$('setting-sound').checked=settings.studentCelebrationSound!==false;$('admin-form').onsubmit=async e=>{e.preventDefault();const patch={examEntryMode:$('setting-mode').value,defaultEntryMode:$('setting-default').value,studentDetailedMode:$('setting-details').checked,studentCelebrationSound:$('setting-sound').checked};try{await setDoc(doc(db,'Settings','SystemConfig'),patch,{merge:true});settings={...settings,...patch};draftMode=patch.examEntryMode==='BOTH'?patch.defaultEntryMode:patch.examEntryMode;draft={};notify('Admin parametreleri güncellendi.');render()}catch(err){notify(err.message,true)}};}

/* ================ TEST VERİLERİ / CANLIYA GEÇİŞ ================
   Yalnızca çalışma koleksiyonları silinir. Kullanıcılar, öğrenci
   profili / diploma-OBP, kitaplar ve admin ayarları korunur.
*/
const WIPE_COLLECTIONS = ['Denemeler','TestEntries','Assignments'];
const WIPE_PHRASE = 'GERÇEK KULLANIMA GEÇ';

async function fetchTestSnapshot(){
  const groups = await Promise.all(WIPE_COLLECTIONS.map(name => getDocs(collection(db,name))));
  return Object.fromEntries(groups.map((snapshot,index)=>[
    WIPE_COLLECTIONS[index], snapshot.docs.map(row=>({id:row.id,data:row.data(),ref:row.ref}))
  ]));
}
function backupJSON(snapshot){
  return JSON.stringify({
    schema:'yks-tek-ogrenci-test-backup-v1',
    exportedAt:new Date().toISOString(),
    projectId:cfg.projectId,
    collections:Object.fromEntries(WIPE_COLLECTIONS.map(name=>[
      name,snapshot[name].map(({id,data})=>({id,data}))
    ]))
  },null,2);
}
function saveBackup(snapshot){
  const blob=new Blob([backupJSON(snapshot)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='yks-test-yedek-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}
function wipeCounts(){
  return `Deneme: ${exams.length} · Günlük çalışma: ${tests.length} · Ödev: ${tasks.length}`;
}
function installTestCleanup(){
  if(!canAdmin())return;
  const content=$('content');
  const pane=document.createElement('section');
  pane.className='card cleanup-panel';
  pane.innerHTML=`
    <h2>🧹 Test kayıtları ve gerçek kullanıma geçiş</h2>
    <p class="muted">Bu özellik tek seferlik test temizliği içindir. Kullanıcılar, diploma notu/OBP, kitaplar ve giriş parametreleri <strong>korunur.</strong></p>
    <p id="wipe-counts" class="summary">${wipeCounts()}</p>
    <p class="muted">Test kayıtlarını JSON olarak bilgisayarına al. Dosya indirmesini tarayıcında kontrol etmeden silme işlemine geçme.</p>
    <div class="buttons"><button type="button" id="test-backup" class="secondary">⬇ Test verilerini yedekle</button></div>
    ${settings.testMode===false?'<div class="summary">✅ Gerçek kullanım modu açık. Toplu silme kapalı.</div>':`
      <div class="cleanup-warning"><strong>Kalıcı işlem:</strong> Bütün Denemeler, TestEntries ve Assignments kayıtları kaldırılır. Eski tarihli kayıtlar da buna dahildir. Silme, güncel sonuçları da kapsar.</div>
      <button type="button" id="wipe-open" class="danger-btn">Testi bitir ve gerçek kullanıma geç</button>
      <div id="wipe-confirm" class="wipe-confirm" hidden>
        <h3>Son onay</h3>
        <p id="wipe-confirm-counts"></p>
        <p>Devam etmek için <strong>${WIPE_PHRASE}</strong> yaz.</p>
        <input id="wipe-phrase" autocomplete="off" placeholder="Onay ifadesini yaz" aria-label="Silme onayı">
        <label class="checkline"><input id="wipe-check" type="checkbox"> Seçilen kayıtların kalıcı olarak silineceğini anladım.</label>
        <div class="buttons"><button id="wipe-final" class="danger-btn" type="button" disabled>Kalıcı silme ve geçişi onayla</button><button id="wipe-cancel" class="subtle" type="button">Vazgeç</button></div>
      </div>
    `}
    <p id="wipe-status" role="status" aria-live="polite">${esc(wipeStatus)}</p>
  `;
  content.append(pane);
  const status=pane.querySelector('#wipe-status');
  const showStatus=msg=>{wipeStatus=msg;status.textContent=msg;};
  pane.querySelector('#test-backup').onclick=async()=>{
    try{
      showStatus('Yedek hazırlanıyor…');
      const snapshot=await fetchTestSnapshot();
      saveBackup(snapshot);
      showStatus('Yedek tarayıcıya gönderildi. İndirilen JSON dosyasını kontrol et.');
    }catch(err){showStatus('Yedek oluşturulamadı: '+err.message);}
  };
  if(settings.testMode===false)return;
  const open=pane.querySelector('#wipe-open'),area=pane.querySelector('#wipe-confirm');
  const phrase=pane.querySelector('#wipe-phrase'),check=pane.querySelector('#wipe-check');
  const final=pane.querySelector('#wipe-final');
  const validate=()=>{final.disabled=wipeInProgress||phrase.value.trim()!==WIPE_PHRASE||!check.checked;};
  phrase.addEventListener('input',validate);check.addEventListener('change',validate);
  open.onclick=()=>{area.hidden=false;pane.querySelector('#wipe-confirm-counts').textContent=wipeCounts();area.scrollIntoView({behavior:'smooth',block:'nearest'});};
  pane.querySelector('#wipe-cancel').onclick=()=>{area.hidden=true;phrase.value='';check.checked=false;validate();};
  final.onclick=async()=>{
    validate();if(final.disabled)return;
    const shown=wipeCounts();
    if(!window.confirm(shown+'\n\nBu kayıtların tümü kalıcı silinecek. Devam edilsin mi?'))return;
    wipeInProgress=true;final.disabled=true;open.disabled=true;
    try{
      showStatus('Firestore kayıtları yeniden sayılıyor…');
      const snapshot=await fetchTestSnapshot();
      const counts=WIPE_COLLECTIONS.map(name=>`${name}: ${snapshot[name].length}`).join(' · ');
      showStatus('Siliniyor: '+counts);
      for(const name of WIPE_COLLECTIONS){
        const rows=snapshot[name];
        for(let i=0;i<rows.length;i+=400){
          const batch=writeBatch(db);
          for(const row of rows.slice(i,i+400))batch.delete(row.ref);
          await batch.commit();
          showStatus(`${name}: ${Math.min(i+400,rows.length)}/${rows.length} silindi.`);
        }
      }
      // Herhangi bir silme başarısız olursa buraya gelinmez; test modu açık kalır.
      await setDoc(doc(db,'Settings','SystemConfig'),{testMode:false},{merge:true});
      settings.testMode=false;
      showStatus('✅ Test kayıtları temizlendi. Gerçek kullanım modu açıldı.');
      notify('Gerçek kullanıma geçildi.');
    }catch(err){
      showStatus('İşlem tamamlanamadı. Test modu açık kaldı. Kalan kayıtları kontrol et: '+err.message);
      notify('Silme tamamlanamadı: '+err.message,true);
    }finally{
      wipeInProgress=false;
      render();
    }
  };
}

// Admin ekranının mevcut giriş parametreleriyle birlikte temizleme alanını göster.
const renderAdminParameters = renderAdmin;
renderAdmin = function(){
  if(!canAdmin()){view='home';render();return;}
  renderAdminParameters();
  installTestCleanup();
};
