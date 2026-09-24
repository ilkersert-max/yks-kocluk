import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,collection,addDoc,getDocs,query,orderBy,serverTimestamp,onSnapshot,updateDoc,deleteDoc,writeBatch} from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';
import {TESTS,TYPES,idsFor,parseNumber,format,computeExam,obpFromProfile,successIndicator,normalizedExamTotals} from './scoring.js';
// Existing project's Firebase app: host this folder as static files (GitHub Pages / simple HTTP server).
const cfg={apiKey:'AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M',authDomain:'tayt-bbbbe.firebaseapp.com',projectId:'tayt-bbbbe',storageBucket:'tayt-bbbbe.firebasestorage.app',messagingSenderId:'367442443596',appId:'1:367442443596:web:be954f464173e2abe5e3e9'};
const firebase=initializeApp(cfg),auth=getAuth(firebase),db=getFirestore(firebase);
const BUILD_VERSION='v11';
const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaultSettings={examEntryMode:'BOTH',defaultEntryMode:'NET',studentDetailedMode:false,studentCelebrationSound:true,testMode:true,assignmentSubjectMode:'simple'};
let user=null,role='Öğrenci',settings={...defaultSettings},profile={diplomaStatus:'unknown',diplomaNote:null,brokenObp:false},exams=[],tasks=[],tests=[],unsubs=[],view='home',draftMode='NET',draftType='TYT',draft={},draftMeta={},editingExamId=null,assignmentFilter='all';
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
// Ödev ekranına özel ders görünümü; deneme testleri ve hesaplama motoru değiştirilmez.
const ASSIGNMENT_SIMPLE_SUBJECTS = ['DİL','Matematik','Türkçe','Tarih','Coğrafya','Felsefe','Din','Fizik','Kimya','Biyoloji'];
// Tek hesaplama kaynağı: ödev kartı, ana sayfa ve analiz aynı sonucu kullanır.
function assignmentMetrics(t){
 const result=t.result;
 const state=String(t.status||t.durum||'').toLowerCase();
 const cancelled=['cancelled','iptal','iptal edildi'].includes(state);
 const assigned=t.questionCount==null||t.questionCount===''?NaN:Number(t.questionCount);
 const d=result?.correct==null?NaN:Number(result.correct);
 const w=result?.wrong==null?NaN:Number(result.wrong);
 const blank=result?.blank==null?NaN:Number(result.blank);
 // Older records may lack attempted or blank. Use stored attempted first, then D+Y+B.
 const actual=result?.attempted!=null&&result.attempted!==''?Number(result.attempted):
  [d,w,blank].every(Number.isInteger)?d+w+blank:NaN;
 const valid=Boolean(result)&&Number.isInteger(assigned)&&assigned>0&&
  Number.isInteger(actual)&&actual>=0&&
  (!Number.isFinite(d)||!Number.isFinite(w)||d+w<=actual)&&
  (!Number.isFinite(blank)||!Number.isFinite(d)||!Number.isFinite(w)||d+w+blank===actual);
 // Historical status is used only when numerical completion cannot be established.
 const legacyComplete=!valid&&['completed','reviewed','tamamlandı','değerlendirildi'].includes(state);
 return {assigned,actual,valid,cancelled,
  complete:!cancelled&&(valid?actual>=assigned:legacyComplete),
  over:valid&&actual>assigned,legacyComplete};
}
function completedAssignmentCount(list){return list.filter(t=>assignmentMetrics(t).complete).length;}
function assignmentStatus(t){
 const m=assignmentMetrics(t),state=String(t.status||t.durum||'waiting').toLowerCase();
 const over=Boolean(t.dueDate&&t.dueDate<new Date().toLocaleDateString('sv-SE'));
 if(m.cancelled)return 'İptal edildi';
 if(m.complete){const reviewed=state==='reviewed'&&Boolean(t.review);return (reviewed?'Değerlendirildi':'Tamamlandı')+(m.over?' · Hedef üstü':'');}
 if(m.valid&&m.actual>0)return over?'Süresi geçti · Eksik':'Eksik · Devam ediyor';
 if(m.valid&&m.actual===0)return over?'Süresi geçti · Başlanmadı':'Başlanmadı';
 if(over)return 'Süresi geçti · Başlanmadı';
 return ({waiting:'Bekliyor',in_progress:'Devam ediyor',completed:'Sonuç kontrol edilmeli',reviewed:'Sonuç kontrol edilmeli',pending:'Beklemede',overdue:'Süresi geçti'})[state]||'Bekliyor';
}
function assignmentProgress(t){
 if(!t.result||!(Number(t.questionCount)>0))return '';
 const m=assignmentMetrics(t);if(!m.valid)return '<p class="muted">Eski kayıtta çözülen soru sayısı doğrulanamıyor.</p>';const count=m.assigned,actual=m.actual,diff=actual-count;
 const sign=diff>0?`+${diff} fazla`:diff<0?`${-diff} eksik`:'Hedef kadar';
 const target=t.targetCorrect;
 const targetLabel=target===null||target===undefined?'':` · Doğru hedefi: ${Number(t.result.correct)>=Number(target)?'Ulaşıldı':'Ulaşılamadı'} (${t.result.correct}/${target})`;
 return `<p class="muted">Çözülen / atanan: ${actual}/${count} · Gerçekleşme: ${format(actual/count*100)}% · ${sign} soru${targetLabel}</p>`;
}
function assignmentSubjectOptions(){
 const entries=settings.assignmentSubjectMode==='detailed'
  ? Object.values(TESTS).map(t=>t.label)
  : ASSIGNMENT_SIMPLE_SUBJECTS;
 return entries.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
}
function assignmentSubjectName(name){
 const text=String(name||'');
 const normalized=text.toLocaleLowerCase('tr-TR');
 if(/^(ydt|yabancı dil|dil)\b/u.test(normalized))return 'DİL';
 if(normalized.includes('matematik'))return 'Matematik';
 if(normalized.includes('edebiyat')||normalized.includes('türkçe'))return 'Türkçe';
 if(normalized.includes('tarih'))return 'Tarih';
 if(normalized.includes('coğrafya'))return 'Coğrafya';
 if(normalized.includes('felsefe'))return 'Felsefe';
 if(normalized.includes('din'))return 'Din';
 if(normalized.includes('fizik'))return 'Fizik';
 if(normalized.includes('kimya'))return 'Kimya';
 if(normalized.includes('biyoloji'))return 'Biyoloji';
 return text;
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
   ? [['home','Ana sayfam'],['exam','Deneme gir'],['test','Soru çözdüm'],['tasks','Ödevlerim'],['history','Denemelerim'],['weekly','Haftalık sorularım']]
   : [['home','Genel durum'],['history','Denemeler'],['test','Günlük çalışmalar'],['tasks','Ödev yönetimi'],['weekly','Haftalık sorular']];
 if(staff()||settings.studentDetailedMode)tabs.push(['analysis',role==='Öğrenci'?'Gelişimim':'Detaylı analiz']);
 if(staff())tabs.push(['reports','Raporlar']);
 if(canAdmin())tabs.push(['admin','Admin']);
 tabs.push(['profile','Diploma / OBP']);
 $('nav').replaceChildren(...tabs.map(([id,label])=>{const b=E('button',{className:id===view?'active':''},label);b.onclick=()=>{view=id;render()};return b}));
 const r={home:renderHome,exam:renderExam,test:renderTest,tasks:renderTasks,history:renderHistory,weekly:renderWeekly,analysis:renderAnalysis,reports:renderReports,admin:renderAdmin,profile:renderProfile}[view]||renderHome;r();
}
function renderHome(){
 const latest=[...exams].sort((a,b)=>(b.examDate||'').localeCompare(a.examDate||''));
 const last=latest[0],completed=completedAssignmentCount(tasks);
 const student=role==='Öğrenci';
 $('content').innerHTML=`
 ${student?`<section class="card motivation"><div class="celebrate-icon" aria-hidden="true">👏 🎉</div><h1>Merhaba, bugün de buradasın!</h1><p class="motivation-quote">${esc(loginMotivation)}</p><div class="buttons"><button type="button" id="celebrate-btn" class="primary applause-button">👏 Alkış ve tezahürat</button><button type="button" id="next-quote" class="subtle">Başka bir söz</button></div><small>Ses yalnızca düğmeye basınca çalar; cihazın sesini kontrol et.</small></section>`:''}
 <section class="card"><h1>${student?'Bugün ne yaptın? 👋':'Öğrencinin genel durumu'}</h1><p class="muted">${student?'Kısa bir giriş yeterli; detaylara istediğinde bakarsın.':'Tek öğrencinin okul, kurs ve ev çalışmaları tek yerde.'}</p><div class="stats">${detail('Son deneme',last?`${esc(last.denemeTuru)} · ${examNetText(last)}`:'Henüz yok')}${detail('Deneme sayısı',exams.length)}${detail('Tamamlanan ödev',`${completed}/${tasks.filter(t=>!assignmentMetrics(t).cancelled).length}`)}${detail('Günlük test',tests.length)}</div></section>
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
 $('content').innerHTML=`<div class="card"><h1>${editingExamId?'Deneme sonucunu düzenle':'Yeni deneme sonucu'}</h1><p class="muted">${staff()?'Öğrenci adına sonuç girilebilir.':'Sadece bildiğin sonuçları gir; boş alanlar sıfır sayılmaz.'}</p><form id="exam-form"><div class="grid"><label>Deneme adı<input id="exam-name" required placeholder="Örn. Özdebir TYT 3" value="${esc(draftMeta.name||'')}"></label><label>Deneme tarihi<input id="exam-date" required type="date" value="${draftMeta.date||new Date().toISOString().slice(0,10)}"></label><label>Kaynak<select id="exam-source"><option>Okul</option><option>Kurs</option><option>Ev / Bireysel</option><option>Türkiye Geneli</option><option>Diğer</option></select></label><label>Sınav / puan türü<select id="exam-type">${[['TYT','TYT'],['SAY','AYT SAY'],['EA','AYT EA'],['SOZ','AYT SÖZ'],['DIL','YDT DİL']].map(([v,t])=>`<option value="${v}" ${v===draftType?'selected':''}>${t}</option>`).join('')}</select></label><label>Yayın / kurum (isteğe bağlı)<input id="exam-publisher" value="${esc(draftMeta.publisher||'')}"></label><label>Kurumun açıkladığı puan (isteğe bağlı)<input id="exam-official" inputmode="decimal" placeholder="Biliniyorsa"></label></div>${modeButtons}<div id="exam-rows"></div><div id="exam-summary" class="summary">Sonuçları girince toplam net burada görünür.</div><div id="exam-err" class="error" role="alert"></div><div class="buttons"><button class="primary">Denemeyi kaydet</button><button type="button" id="exam-clear" class="subtle">Formu temizle</button></div></form><div class="warning">Netler 0,25 adımlı ve küsüratlı saklanır. YKS'nin resmî veya tahmini puanı, doğrulanmış standartlaştırma modeli olmadığından burada üretilmez. Diploma/OBP öğrenci profilinde tutulur.</div></div>`;
 $('exam-source').value=draftMeta.source||'Okul';$('exam-type').onchange=()=>{saveDraftMeta();draftType=$('exam-type').value;renderExam()};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{saveDraftMeta();if(editingExamId&&Object.values(draft).some(x=>Object.values(x).some(v=>v!==''&&v!==null))&&!window.confirm('Giriş türünü değiştirmek bu ekrandaki ders girişlerini temizler. Devam edilsin mi?'))return;draftMode=b.dataset.mode;draft={};renderExam()});$('exam-clear').onclick=()=>{draft={};draftMeta={};editingExamId=null;renderExam()};$('exam-form').onsubmit=saveExam;renderExamRows();$('exam-official').value=draftMeta.official??'';}
function saveDraftMeta(){draftMeta={name:$('exam-name').value,date:$('exam-date').value,source:$('exam-source').value,publisher:$('exam-publisher').value,official:$('exam-official').value};}
function renderExamRows(){const ids=idsFor(draftType),rows=$('exam-rows');rows.replaceChildren();let group='';for(const id of ids){const t=TESTS[id];if(t.group!==group){group=t.group;rows.append(E('h2',{},group==='TYT'?'TYT dersleri':group==='YDT'?'YDT':'Alan dersleri'))}const row=E('div',{className:'testrow '+(draftMode==='NET'?'netmode':'')});row.append(E('strong',{},t.label),E('span',{className:'small'},`${t.q} soru`));if(draftMode==='NET'){const i=E('input',{inputmode:'decimal',placeholder:'Net (23,75)',value:draft[id]?.net??''});i.addEventListener('input',()=>{draft[id]={net:i.value};updateExamSummary()});row.append(i)}else{for(const key of ['correct','wrong']){const i=E('input',{type:'number',min:'0',step:'1',max:String(t.q),placeholder:key==='correct'?'Doğru':'Yanlış',value:draft[id]?.[key]??''});i.addEventListener('input',()=>{draft[id]={...(draft[id]||{}),[key]:i.value};updateExamSummary()});row.append(i)}row.append(E('span',{className:'testnet small',id:'preview-'+id},'—'))}rows.append(row)}updateExamSummary();}
function updateExamSummary(){const box=$('exam-summary'),err=$('exam-err');try{const x=computeExam(draftType,draftMode,draft);box.textContent=x.any?`TYT ${format(x.tytNet)} · Alan ${format(x.fieldNet)} · Toplam ${format(x.totalNet)} net${x.complete?'':' · Kısmi giriş'}`:'Ders sonucu girmeden denemeyi kaydedebilirsin; netleri daha sonra ekleyebilirsin.';if(err)err.textContent='';for(const id of idsFor(draftType)){const e=$('preview-'+id);if(e)e.textContent=format(x.results[id].net)}}catch(e){if(box)box.textContent='Sonuçları kontrol et';if(err)err.textContent=e.message}}
async function saveExam(e){e.preventDefault();saveDraftMeta();const error=$('exam-err');try{const computed=computeExam(draftType,draftMode,draft);const op=obpFromProfile(profile);const indicator=computed.any?successIndicator(draftType,computed):null;const altNetler={};for(const[id,r]of Object.entries(computed.results))if(r.entered)altNetler[TESTS[id].label]=r.net;const official=parseNumber($('exam-official').value);if($('exam-official').value.trim()!==''&&official===null)throw Error('Kurum puanı sayısal olmalıdır.');const payload={schemaVersion:2,studentKey:'mainStudent',createdBy:user.uid,createdByRole:role,denemeAdi:draftMeta.name,examDate:draftMeta.date,examSource:draftMeta.source,publisher:draftMeta.publisher,denemeTuru:draftType,entryMode:draftMode,results:computed.results,altNetler,tytNet:computed.tytNet,fieldNet:computed.fieldNet,toplamNet:computed.totalNet,complete:computed.complete,resultStatus:computed.any?(computed.complete?'complete':'partial'):'pending',indicator,indicatorLabel:'Net başarı göstergesi (ÖSYM puanı değildir)',reportedScore:official,obpSnapshot:op||null,obpVersion:'profile-at-entry'};if(editingExamId){payload.updatedAt=serverTimestamp();payload.updatedBy=user.uid;await updateDoc(doc(db,'Denemeler',editingExamId),payload)}else{payload.tarih=serverTimestamp();await addDoc(collection(db,'Denemeler'),payload)}draft={};draftMeta={};editingExamId=null;notify('Deneme kaydedildi.');view='history';render()}catch(err){error.textContent=err.message;notify('Deneme kaydedilemedi: '+err.message,true)}}
function renderProfile(){$('content').innerHTML=`<div class="card"><h1>Diploma notu ve OBP</h1><p>Bir kere profilde tanımlanır; her denemede tekrar sorulmaz.</p><form id="profile-form"><label>Diploma notu durumu<select id="diploma-status"><option value="unknown">Henüz bilinmiyor</option><option value="estimated">Tahmini diploma notu</option><option value="final">Kesinleşmiş diploma notu</option></select></label><label>Diploma notu (50–100)<input id="diploma-note" inputmode="decimal" placeholder="Örn. 90,25" value="${profile.diplomaNote??''}"></label><label><input id="broken-obp" type="checkbox" style="width:auto" ${profile.brokenObp?'checked':''}> İlgili yılın kurallarına göre kırık OBP uygulanacak</label><div id="obp-preview" class="summary"></div><p class="muted">OBP = diploma notu × 5. Normal katkı × 0,12; uygun durumda kırık katkı × 0,06. Ek puan/istisnalar bu sürümde otomatik uygulanmaz.</p><button class="primary">Bilgileri kaydet</button></form></div>`;$('diploma-status').value=profile.diplomaStatus||'unknown';function preview(){const x=obpFromProfile({diplomaStatus:$('diploma-status').value,diplomaNote:$('diploma-note').value,brokenObp:$('broken-obp').checked});$('obp-preview').textContent=x?`OBP: ${format(x.obp)} · Katsayı: ${String(x.factor).replace('.',',')} · Yerleştirme katkısı: ${format(x.contribution)}${x.isEstimate?' (tahmini)':''}`:'OBP katkısı henüz hesaplanamıyor.'}$('diploma-status').onchange=preview;$('diploma-note').oninput=preview;$('broken-obp').onchange=preview;preview();$('profile-form').onsubmit=async e=>{e.preventDefault();const status=$('diploma-status').value,note=parseNumber($('diploma-note').value);if(status!=='unknown'&&(note===null||note<50||note>100)){notify('Diploma notu 50–100 arasında olmalıdır.',true);return}profile={diplomaStatus:status,diplomaNote:status==='unknown'?null:note,brokenObp:$('broken-obp').checked,updatedAt:serverTimestamp()};try{await setDoc(doc(db,'StudentProfile','mainStudent'),profile,{merge:true});notify('OBP bilgileri kaydedildi.');render()}catch(err){notify(err.message,true)}};}
function examNet(x){if(x.resultStatus==='pending'||(x.schemaVersion>=2&&x.toplamNet===null))return null;const n=normalizedExamTotals(x)?.totalNet??parseNumber(x.toplamNet);return n===null?null:n;}
function examNetText(x){const n=examNet(x);return n===null?'Sonuç bekleniyor':format(n);}
function sortedExams(){return [...exams].sort((a,b)=>(b.examDate||b.tarih?.toDate?.()?.toISOString()||'').localeCompare(a.examDate||a.tarih?.toDate?.()?.toISOString()||''))}
function openExamForEdit(id){const e=exams.find(x=>x.id===id);if(!e){notify('Deneme bulunamadı.',true);return;}
 editingExamId=id;draftType=e.denemeTuru||'TYT';draftMode=e.entryMode==='DY'?'DY':'NET';
 // Keep originally entered values, including zero. Mode switches clear draft, just like existing form.
 draft={};for(const [key,value] of Object.entries(e.results||{})){if(!value?.entered)continue;if(draftMode==='NET')draft[key]={net:String(value.net??'')};else if(value.correct!==null&&value.wrong!==null)draft[key]={correct:String(value.correct),wrong:String(value.wrong)};else draft[key]={net:String(value.net??'')};}
 draftMeta={name:e.denemeAdi||'',date:e.examDate||new Date().toLocaleDateString('sv-SE'),source:e.examSource||'Okul',publisher:e.publisher||'',official:e.reportedScore??''};view='exam';render();
}
function renderHistory(){const rows=sortedExams().map(x=>{const res=x.results||{};const pills=Object.keys(res).filter(k=>res[k]?.entered).map(k=>`<span class="pill">${esc(TESTS[k]?.label||k)} ${format(res[k].net)}</span>`).join('')||Object.entries(x.altNetler||{}).map(([k,v])=>`<span class="pill">${esc(k)} ${format(v)}</span>`).join('');const summary=x.indicator!==null&&x.indicator!==undefined?`${format(x.indicator)} (net göstergesi)`:x.schemaVersion===2?'Hesaplanmadı':'Eski kayıt: önceki yaklaşık puan hesabı';return `<tr><td>${esc(x.denemeAdi||'Deneme')}<br><small>${esc(x.denemeTuru||'')}</small></td><td>${esc(x.examSource||'Eski kayıt')}<br><small>${dateString(x.examDate||x.tarih)}</small></td><td>${pills||'<span class="pill">Sonuç bekleniyor</span>'}<br><button type="button" class="subtle" data-edit-exam="${esc(x.id)}">Sonuçları ekle / düzenle</button></td><td><strong>${examNetText(x)}</strong></td><td>${summary}</td></tr>`}).join('');$('content').innerHTML=`<div class="card"><h1>Deneme geçmişi</h1>${staff()?'<button type="button" class="primary" id="history-add">+ Sonuç ekle</button>':''}<p class="muted">Okul, kurs, ev ve Türkiye geneli denemeler tek yerde.</p><div class="tablewrap"><table><thead><tr><th>Deneme</th><th>Kaynak / Tarih</th><th>Ders netleri</th><th>Toplam</th><th>Gösterge</th></tr></thead><tbody>${rows||'<tr><td colspan="5">Henüz deneme yok.</td></tr>'}</tbody></table></div></div>`;if(staff())$('history-add').onclick=()=>{editingExamId=null;draft={};draftMeta={};view='exam';render()};document.querySelectorAll('[data-edit-exam]').forEach(button=>button.onclick=()=>openExamForEdit(button.dataset.editExam));}
function renderTest(){$('content').innerHTML=`<div class="card"><h1>${staff()?'Günlük çalışmalar':'Bugün soru çözdüm'}</h1>${staff()?'<p>Öğrencinin günlük çalışmalarını analiz sekmesinden inceleyebilirsin. Gerekirse burada çocuk adına kayıt girebilirsin.</p>':''}<p class="muted">Sade günlük çalışma girişi. Ödevle ilişkiliyse sonuç girmek için Ödevler bölümünü kullan.</p><form id="test-form"><div class="grid"><label>Ders<select id="test-subject">${Object.values(TESTS).map(t=>`<option>${esc(t.label)}</option>`).join('')}</select></label>${bookFields("test")}<label>Konu / Test<input id="test-topic" required></label><label>Çözüm tarihi<input id="test-date" type="date" required></label><label>Toplam soru<input id="test-count" type="number" min="1" step="1" required></label><label>Doğru<input id="test-correct" type="number" min="0" step="1" required></label><label>Yanlış<input id="test-wrong" type="number" min="0" step="1" required></label></div><div id="test-preview" class="summary">Doğru/yanlış girince net hesaplanır.</div><button class="primary">Çalışmayı kaydet</button></form></div>`;$('test-date').value=new Date().toLocaleDateString('sv-SE');function preview(){const q=parseNumber($('test-count').value),d=parseNumber($('test-correct').value),w=parseNumber($('test-wrong').value);$('test-preview').textContent=q!==null&&d!==null&&w!==null&&q>=d+w?`Boş ${q-d-w} · Net ${format(d-w/4)}`:'Toplam soru, doğru ve yanlış sayılarını gir.'}['test-count','test-correct','test-wrong'].forEach(k=>$(k).oninput=preview);$('test-form').onsubmit=async e=>{e.preventDefault();const q=parseNumber($('test-count').value),d=parseNumber($('test-correct').value),w=parseNumber($('test-wrong').value);if(![q,d,w].every(Number.isInteger)||q<1||d<0||w<0||d+w>q){notify('Soru sayıları geçersiz.',true);return}try{const book=readBook('test');await addDoc(collection(db,'TestEntries'),{schemaVersion:2,studentKey:'mainStudent',createdBy:user.uid,ders:$('test-subject').value,kitap:book.bookLabel,bookChoice:book.bookChoice,bookDetail:book.bookDetail,konu:$('test-topic').value.trim(),dogru:d,yanlis:w,bos:q-d-w,questionCount:q,net:d-w/4,studyDate:$('test-date').value,tarih:serverTimestamp()});notify('Çalışma kaydedildi.');view='home';render()}catch(err){notify(err.message,true)}};}
function renderTasks(){const list=[...tasks].sort((a,b)=>(a.dueDate||a.tarih||'').localeCompare(b.dueDate||b.tarih||''));$('content').innerHTML=`<div class="card"><h1>Ödevler</h1><p class="muted">Öğretmen, veli ve koçun verdiği çalışmalar tek yerde. Sonuçlar bütün rollerce görülebilir.</p>${canAssign()?`<details><summary><strong>+ Yeni ödev ata</strong></summary><form id="assignment-form"><div class="grid"><label>Ders<select id="task-subject">${assignmentSubjectOptions()}</select></label><label>Toplam soru<input id="task-q" type="number" min="1" step="1" required></label><label>Hedef doğru (opsiyonel)<input id="task-target" type="number" min="0" step="1"></label><label>Veriliş tarihi<input id="task-assigned-date" type="date" required></label><label>Bitiş tarihi<input id="task-date" type="date" required></label></div><label>Not<textarea id="task-note" rows="2"></textarea></label><button class="primary">Ödev ata</button></form></details>`:''}</div><div id="task-list"></div>`;if(canAssign()){ $('task-assigned-date').value=new Date().toLocaleDateString('sv-SE'); $('assignment-form').onsubmit=saveTask; }const listEl=$('task-list');if(!list.length){listEl.innerHTML='<div class="card">Henüz ödev atanmadı.</div>';return}for(const t of list){const legacy=!t.schemaVersion;const card=E('section',{className:'card'});card.innerHTML=`<div class="taskhead"><h3>${esc(assignmentSubjectName(t.ders))}${t.konu?' · '+esc(t.konu):''}</h3><span class="pill">${esc(assignmentStatus(t))}</span></div><p>${t.kitap?esc(t.kitap)+' · ':''}Veriliş: ${dateString(t.assignedDate||t.atanmaTarihi||t.tarih)} · Bitiş: ${dateString(t.dueDate||t.tarih)}</p><p class="muted">Atayan: ${esc(t.assignedByRole||'Eski kayıt')} ${t.questionCount?'· '+t.questionCount+' soru':''} ${t.targetCorrect!==null&&t.targetCorrect!==undefined?'· Hedef '+t.targetCorrect+' doğru':''}</p>${t.note?`<p>${esc(t.note)}</p>`:''}${t.result?`<div class="summary">${t.result.correct} doğru · ${t.result.wrong} yanlış · ${t.result.blank} boş · ${format(t.result.net)} net</div>${assignmentProgress(t)}`:''}${legacy?'<p class="warning">Eski ödev kaydı: soru sayısı ve sonuç alanları yok. Yeni formatta ödev oluşturabilirsiniz.</p>':''}`;
 if(legacy&&canAssign()){const buttons=E('div',{className:'buttons'});const del=E('button',{className:'danger-btn'},'Eski ödevi sil');del.onclick=()=>deleteTask(t);buttons.append(del);card.append(buttons)}if(!legacy){const controls=E('div',{className:'buttons'});{const b=E('button',{className:'secondary'},t.result?'Sonucu güncelle':'Sonuç gir');b.onclick=()=>showTaskResult(card,t);controls.append(b)}if(canAssign()){const edit=E('button',{className:'secondary'},'Ödevi değiştir');edit.onclick=()=>showTaskEdit(card,t);controls.append(edit);const del=E('button',{className:'danger-btn'},'Ödevi sil');del.onclick=()=>deleteTask(t);controls.append(del);const b=E('button',{className:'subtle'},t.review?'Değerlendirmeyi güncelle':'Değerlendir');b.onclick=()=>showTaskReview(card,t);controls.append(b)}card.append(controls);if(t.review)card.append(E('p',{className:'muted'},'Değerlendirme: '+t.review))}listEl.append(card)} }
function showTaskEdit(card,t){
 const old=card.querySelector('.task-edit-form');if(old){old.remove();return;}
 const form=E('form',{className:'task-edit-form'});
 form.innerHTML=`<h3>Ödevi düzenle</h3><div class="grid"><label>Ders<select name="subject">${assignmentSubjectOptions()}</select></label><label>Toplam soru<input name="q" type="number" min="1" step="1" required></label><label>Hedef doğru<input name="target" type="number" min="0" step="1"></label><label>Veriliş tarihi<input name="assigned" type="date" required></label><label>Bitiş tarihi<input name="due" type="date" required></label></div><label>Not<textarea name="note" rows="2"></textarea></label><button class="primary">Değişiklikleri kaydet</button>`;
 const available=Array.from(form.elements.subject.options).map(o=>o.value);
 if(!available.includes(t.ders)){const option=E('option',{value:t.ders},t.ders+' (önceki kayıt)');form.elements.subject.prepend(option)}
 form.elements.subject.value=t.ders;
 form.elements.q.value=t.questionCount||'';form.elements.target.value=t.targetCorrect??'';
 form.elements.assigned.value=t.assignedDate||dateISO(t.atanmaTarihi)||dateISO(t.tarih)||new Date().toLocaleDateString('sv-SE');
 form.elements.due.value=t.dueDate||dateISO(t.tarih)||new Date().toLocaleDateString('sv-SE');form.elements.note.value=t.note||'';
 form.onsubmit=async e=>{e.preventDefault();const q=parseNumber(form.elements.q.value),target=parseNumber(form.elements.target.value);
  if(!Number.isInteger(q)||q<1){notify('Atanan soru sayısı en az 1 olan tam sayı olmalı.',true);return;}
  if(target!==null&&(!Number.isInteger(target)||target<0||target>q)){notify('Hedef doğru 0 ile atanan soru sayısı arasında olmalı.',true);return;}
  if(form.elements.due.value<form.elements.assigned.value){notify('Bitiş tarihi veriliş tarihinden önce olamaz.',true);return;}
  // Atanan miktar hedef olduğundan, yeni hedef önceki gerçekleşmenin altında kalabilir.
  const patch={ders:form.elements.subject.value,questionCount:q,targetCorrect:target,assignedDate:form.elements.assigned.value,dueDate:form.elements.due.value,note:form.elements.note.value.trim(),editedBy:user.uid,editedAt:serverTimestamp()};
  if(t.result){const actual=Number(t.result.attempted||0);patch.result={...t.result,remaining:Math.max(0,q-actual)};patch.status=actual>=q?(t.review?'reviewed':'completed'):'in_progress';}
  try{await updateDoc(doc(db,'Assignments',t.id),patch);notify('Ödev güncellendi.')}catch(err){notify('Ödev değiştirilemedi: '+err.message,true)}
 };card.append(form);
}
async function deleteTask(t){
 if(!canAssign()){notify('Silme yetkiniz yok.',true);return;}
 if(!window.confirm(assignmentSubjectName(t.ders)+' ödevini kalıcı silmek istediğine emin misin?'))return;
 try{await deleteDoc(doc(db,'Assignments',t.id));notify('Ödev silindi.')}catch(err){notify('Ödev silinemedi: '+err.message,true)}
}
function dateISO(value){if(!value)return '';if(typeof value==='string')return value.slice(0,10);if(value.toDate)return value.toDate().toLocaleDateString('sv-SE');return '';}

async function saveTask(e){
 e.preventDefault();
 const q=parseNumber($('task-q').value),target=parseNumber($('task-target').value);
 if(!Number.isInteger(q)||q<1){notify('Atanan soru sayısı en az 1 olan tam sayı olmalı.',true);return;}
 if(target!==null&&(!Number.isInteger(target)||target<0||target>q)){notify('Hedef doğru, atanan soru sayısını aşamaz. Hedef alanını boş da bırakabilirsin.',true);return;}
 const submit=e.submitter;if(submit)submit.disabled=true;
 try{
  const subject=$('task-subject').value;
  const allowed=settings.assignmentSubjectMode==='detailed'
   ?Object.values(TESTS).map(t=>t.label):ASSIGNMENT_SIMPLE_SUBJECTS;
  if(!allowed.includes(subject))throw Error('Geçerli bir ders seçin.');
  if($('task-date').value < $('task-assigned-date').value)throw Error('Bitiş tarihi veriliş tarihinden önce olamaz.');
  await addDoc(collection(db,'Assignments'),{
   schemaVersion:3,studentKey:'mainStudent',ders:subject,
   subjectMode:settings.assignmentSubjectMode==='detailed'?'detailed':'simple',
   questionCount:q,targetCorrect:target,assignedDate:$('task-assigned-date').value,dueDate:$('task-date').value,
   note:$('task-note').value.trim(),status:'waiting',
   assignedBy:user.uid,assignedByRole:role,atanmaTarihi:serverTimestamp()
  });
  notify('Ödev atandı.');
 }catch(err){notify(err.message,true);}
 finally{if(submit)submit.disabled=false;}
}

function validateAssignmentResult(a,d,w){
 if(![a,d,w].every(Number.isInteger)||a<0||d<0||w<0)return 'Çözülen, doğru ve yanlış alanlarına sıfır veya pozitif tam sayı gir.';
 if(d+w>a)return `Doğru (${d}) + yanlış (${w}) = ${d+w}. Çözülen soru sayısı en az ${d+w} olmalı; atanan soru sayısına bağlı bir üst sınır yok.`;
 return '';
}
function showTaskResult(card,t){
 const old=card.querySelector('.task-editor');if(old){old.remove();return;}
 const editor=E('form',{className:'task-editor'});
 const existing=t.result||{};
 const priorActual=existing.attempted??(Number.isFinite(Number(existing.correct))&&Number.isFinite(Number(existing.wrong))&&Number.isFinite(Number(existing.blank))?Number(existing.correct)+Number(existing.wrong)+Number(existing.blank):'');
 editor.innerHTML=`<h3>Ödev sonucu</h3><p><strong>Atanan: ${esc(t.questionCount)} soru.</strong> Daha az veya daha çok çözebilirsin; atanan miktar üst sınır değildir. Çözülen, doğru + yanlış + boş toplamıdır. Eksik kalan ödev soruları “boş” sayılmaz.</p><div class="grid"><label>Çözülen toplam soru<input name="attempted" type="number" min="0" step="1" value="${esc(priorActual)}" required></label><label>Doğru<input name="correct" type="number" min="0" step="1" value="${esc(existing.correct??'')}" required></label><label>Yanlış<input name="wrong" type="number" min="0" step="1" value="${esc(existing.wrong??'')}" required></label></div><div class="summary" id="task-result-preview">Sonuç değerlerini gir.</div><label>Çözüm tarihi<input name="resultDate" type="date" required></label><button class="primary">Sonucu kaydet</button>`;
 editor.elements.resultDate.value=t.resultDate||dateISO(t.resultUpdatedAt)||new Date().toLocaleDateString('sv-SE');
 const read=()=>[parseNumber(editor.elements.attempted.value),parseNumber(editor.elements.correct.value),parseNumber(editor.elements.wrong.value)];
 const preview=()=>{
  const [a,d,w]=read(),message=validateAssignmentResult(a,d,w),host=editor.querySelector('#task-result-preview');
  if(message){host.textContent=message;return;}
  host.textContent=`Çözülen: ${a}/${t.questionCount} · ${format(a/Number(t.questionCount)*100)}% · ${a>=Number(t.questionCount)?(a>Number(t.questionCount)?'Tamamlandı · Hedef üstü':'Tamamlandı'):'Eksik'} · Boş: ${a-d-w} · Net: ${format(d-w/4)}`;
 };
 // As correct/wrong totals increase, bring solved total up to the minimum
 // instead of rejecting an extra-work result with the old assigned amount.
 const expandAttempted=()=>{
  const d=parseNumber(editor.elements.correct.value),w=parseNumber(editor.elements.wrong.value),a=parseNumber(editor.elements.attempted.value);
  if(Number.isInteger(d)&&Number.isInteger(w)&&d>=0&&w>=0&&(a===null||a<d+w))editor.elements.attempted.value=String(d+w);
  preview();
 };
 editor.elements.attempted.addEventListener('input',preview);
 editor.elements.correct.addEventListener('input',expandAttempted);
 editor.elements.wrong.addEventListener('input',expandAttempted);
 preview();
 editor.onsubmit=async e=>{
  e.preventDefault();const [a,d,w]=read(),message=validateAssignmentResult(a,d,w);
  if(message){notify(message,true);return;}
  const finished=a>=Number(t.questionCount),submit=e.submitter;if(submit)submit.disabled=true;
  try{await updateDoc(doc(db,'Assignments',t.id),{result:{attempted:a,correct:d,wrong:w,blank:a-d-w,remaining:Math.max(0,Number(t.questionCount)-a),net:d-w/4,updatedBy:user.uid},status:finished?(t.review?'reviewed':'completed'):'in_progress',resultDate:editor.elements.resultDate.value,resultUpdatedAt:serverTimestamp()});notify('Ödev sonucu kaydedildi.');}
  catch(err){notify('Ödev sonucu kaydedilemedi: '+err.message,true);}
  finally{if(submit)submit.disabled=false;}
 };
 card.append(editor);
}
function showTaskReview(card,t){const old=card.querySelector('.review-editor');if(old){old.remove();return}const form=E('form',{className:'review-editor'});form.innerHTML='<label>Ödev değerlendirmesi<textarea name="review" rows="3" required></textarea></label><button class="primary">Değerlendirmeyi kaydet</button>';form.elements.review.value=t.review||'';form.onsubmit=async e=>{e.preventDefault();try{await updateDoc(doc(db,'Assignments',t.id),{review:form.elements.review.value.trim(),reviewedBy:user.uid,reviewedByRole:role,reviewedAt:serverTimestamp(),status:assignmentMetrics(t).complete?'reviewed':t.status});notify('Değerlendirme kaydedildi.')}catch(err){notify(err.message,true)}};card.append(form)}
function weeklyDate(value){const iso=dateISO(value);return /^\d{4}-\d\d-\d\d$/.test(iso)?iso:null;}
function weekBounds(value){const anchor=new Date(value+'T12:00:00');if(Number.isNaN(+anchor))return null;const mon=new Date(anchor);mon.setDate(mon.getDate()-((mon.getDay()+6)%7));const sun=new Date(mon);sun.setDate(sun.getDate()+6);return [mon.toLocaleDateString('sv-SE'),sun.toLocaleDateString('sv-SE')];}
function weekRows(start,end){
 const sums=new Map();const add=(subject,q,d,w,b)=>{const name=assignmentSubjectName(subject);if(!name||![q,d,w,b].every(Number.isFinite)||q<0||d<0||w<0||b<0||d+w+b!==q)return;const r=sums.get(name)||{subject:name,q:0,d:0,w:0,b:0};r.q+=q;r.d+=d;r.w+=w;r.b+=b;sums.set(name,r);};
 for(const t of tests){const date=weeklyDate(t.studyDate||t.tarih);if(date&&date>=start&&date<=end){const d=Number(t.dogru),w=Number(t.yanlis),q=Number(t.questionCount??(d+w+Number(t.bos||0))),b=t.bos==null?q-d-w:Number(t.bos);add(t.ders,q,d,w,b);}}
 for(const t of tasks){if(!t.result)continue;const date=weeklyDate(t.resultDate||t.resultUpdatedAt);if(date&&date>=start&&date<=end){const d=Number(t.result.correct),w=Number(t.result.wrong),q=Number(t.result.attempted??(d+w+Number(t.result.blank||0))),b=t.result.blank==null?q-d-w:Number(t.result.blank);add(t.ders,q,d,w,b);}}
 return [...sums.values()].sort((a,b)=>{const ai=ASSIGNMENT_SIMPLE_SUBJECTS.indexOf(a.subject),bi=ASSIGNMENT_SIMPLE_SUBJECTS.indexOf(b.subject);return (ai<0?999:ai)-(bi<0?999:bi)||a.subject.localeCompare(b.subject,'tr');});
}
function renderWeeklyStats(date){const bounds=weekBounds(date);if(!bounds)return '<p>Geçersiz tarih.</p>';const [start,end]=bounds,rows=weekRows(start,end);const totals=rows.reduce((s,r)=>({q:s.q+r.q,d:s.d+r.d,w:s.w+r.w,b:s.b+r.b}),{q:0,d:0,w:0,b:0});return `<p class="muted">${dateString(start)} – ${dateString(end)} · Pazartesi–Pazar. Günlük çalışmalar ve sonuç girilmiş ödevler dahildir; deneme netleri dahil değildir. Ödevle aynı çözümü ayrıca günlük çalışma olarak kaydetmeyin.</p><div class="stats">${detail('Çözülen soru',totals.q)}${detail('Doğru',totals.d)}${detail('Yanlış',totals.w)}${detail('Boş',totals.b)}</div><div class="tablewrap"><table><thead><tr><th>Ders / Branş</th><th>Çözülen</th><th>Doğru</th><th>Yanlış</th><th>Boş</th><th>Net</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.subject)}</td><td>${r.q}</td><td>${r.d}</td><td>${r.w}</td><td>${r.b}</td><td>${format(r.d-r.w/4)}</td></tr>`).join('')||'<tr><td colspan="6">Bu haftaya ait sonuç bulunmuyor.</td></tr>'}</tbody><tfoot><tr><th scope="row">GENEL TOPLAM</th><th>${totals.q}</th><th>${totals.d}</th><th>${totals.w}</th><th>${totals.b}</th><th>${format(totals.d-totals.w/4)}</th></tr></tfoot></table></div>`;}
function attachWeeklyStats(){const host=$('weekly-results'),input=$('weekly-date');if(!host||!input)return;input.value=new Date().toLocaleDateString('sv-SE');const update=()=>{host.innerHTML=renderWeeklyStats(input.value)};input.onchange=update;update();}

function renderWeekly(){$('content').innerHTML='<div class="card"><h1>Haftalık ders / branş soru istatistiği</h1><label>Hafta içinden bir gün seç<input id="weekly-date" type="date"></label><div id="weekly-results"></div></div>';attachWeeklyStats();}
function renderAnalysis(){const ordered=[...exams].sort((a,b)=>(a.examDate||'').localeCompare(b.examDate||''));const unique=[...new Set(ordered.map(x=>x.denemeTuru||'TYT'))];const totals=ordered.map(examNet).filter(v=>v!==null);const avg=totals.length?totals.reduce((a,b)=>a+b,0)/totals.length:null;const topics={};for(const t of tests){const k=(t.ders||'')+' / '+(t.konu||'');const q=Number(t.questionCount??(Number(t.dogru||0)+Number(t.yanlis||0)+Number(t.bos||0)));if(!topics[k])topics[k]={correct:0,total:0,tests:0};topics[k].correct+=Number(t.dogru||0);topics[k].total+=q;topics[k].tests++}const cards=Object.entries(topics).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v.tests}</td><td>${v.total?format(100*v.correct/v.total)+'%':'—'}</td></tr>`).join('');const trend=unique.map(type=>{const data=ordered.filter(x=>(x.denemeTuru||'TYT')===type);const vals=data.map(examNet).filter(v=>v!==null);const last=vals.at(-1),first=vals[0];return `<tr><td>${esc(type)}</td><td>${data.length}</td><td>${format(last)}</td><td>${format(vals.length>=2?last-first:null)}</td></tr>`}).join('');$('content').innerHTML=`<div class="card"><h1>Öğrenci analizi</h1><p class="muted">Tek öğrencinin deneme, test ve ödev kayıtları. Farklı puan türlerinin netleri birbiriyle karıştırılmaz.</p><div class="stats">${detail('Deneme sayısı',exams.length)}${detail('Toplam çözülen günlük soru',tests.reduce((a,t)=>a+Number(t.questionCount??(Number(t.dogru||0)+Number(t.yanlis||0)+Number(t.bos||0))),0))}${detail('Tamamlanan ödev',`${completedAssignmentCount(tasks)}/${tasks.filter(t=>!assignmentMetrics(t).cancelled).length}`)}${detail('Kaydedilmiş test',tests.length)}</div></div><div class="card"><h2>Puan türüne göre net ilerleme</h2><div class="tablewrap"><table><thead><tr><th>Tür</th><th>Deneme</th><th>Son net</th><th>İlk-son farkı</th></tr></thead><tbody>${trend||'<tr><td colspan="4">Veri yok</td></tr>'}</tbody></table></div><p class="muted">Farklı zorluktaki denemeler birebir eşdeğer kabul edilmez.</p></div><div class="card"><h2>Günlük çalışma: konu doğru oranı</h2><div class="tablewrap"><table><thead><tr><th>Ders / Konu</th><th>Test sayısı</th><th>Doğru oranı</th></tr></thead><tbody>${cards||'<tr><td colspan="3">Henüz çalışma yok</td></tr>'}</tbody></table></div></div><div class="card"><h2>Ödev sonuçları</h2>${tasks.map(t=>`<div class="task"><strong>${esc(assignmentSubjectName(t.ders))}${t.konu?' · '+esc(t.konu):''}</strong><p class="muted">${esc(t.assignedByRole||'Eski kayıt')} · ${esc(assignmentStatus(t))}</p>${t.result?`${t.result.correct} doğru · ${t.result.wrong} yanlış · ${format(t.result.net)} net`: 'Sonuç girilmedi'}${t.review?`<p>${esc(t.review)}</p>`:''}</div>`).join('')||'Henüz ödev yok'}</div><div class="card"><h2>Haftalık ders / branş soru istatistiği</h2><label>Hafta içinden bir gün seç<input id="weekly-date" type="date"></label><div id="weekly-results"></div></div>`;attachWeeklyStats();}
function renderReports(){const op=obpFromProfile(profile);$('content').innerHTML=`<div class="card"><h1>Öğrenci durum raporu</h1><p class="muted">Tarayıcının Yazdır → PDF olarak kaydet seçeneğiyle bilgisayarda PDF oluşturulabilir.</p><div class="buttons noprint"><button id="print-report" class="primary">Yazdır / PDF</button><button id="export-json" class="secondary">JSON yedeği</button></div><hr><h2>Diploma / OBP</h2><p>${op?`Diploma notu: ${format(op.diploma)} · OBP: ${format(op.obp)} · Katkı: ${format(op.contribution)} ${op.isEstimate?'(tahmini)':''}`:'Diploma notu / OBP henüz bilinmiyor.'}</p><h2>Denemeler</h2><div class="tablewrap"><table><thead><tr><th>Deneme</th><th>Tür</th><th>Tarih</th><th>Net</th></tr></thead><tbody>${sortedExams().map(x=>`<tr><td>${esc(x.denemeAdi)}</td><td>${esc(x.denemeTuru)}</td><td>${dateString(x.examDate||x.tarih)}</td><td>${examNetText(x)}</td></tr>`).join('')||'<tr><td colspan="4">Veri yok</td></tr>'}</tbody></table></div><h2>Ödevler</h2>${tasks.map(t=>`<p>${esc(t.ders)} – ${esc(t.konu)} · ${esc(assignmentStatus(t))} ${t.result?'· '+format(t.result.net)+' net':''}</p>`).join('')||'<p>Henüz ödev yok.</p>'}</div>`;$('print-report').onclick=()=>window.print();$('export-json').onclick=()=>{const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),profile,exams,tasks,tests},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='YKS-Ogrenci-Yedek-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};}
function renderAdmin(){$('content').innerHTML=`<div class="card"><h1>Admin · Giriş parametreleri</h1><p class="muted">Tek öğrencinin deneme giriş yöntemi tüm kullanıcılara uygulanır. Daha önce kaydedilmiş denemeler değişmez.</p><form id="admin-form"><label>Deneme sonuç giriş yöntemi<select id="setting-mode"><option value="BOTH">Her iki yöntem</option><option value="NET">Yalnızca net</option><option value="DY">Yalnızca doğru / yanlış</option></select></label><label>Her iki yöntem açıkken varsayılan<select id="setting-default"><option value="NET">Hızlı net</option><option value="DY">Doğru / yanlış</option></select></label><label><input type="checkbox" id="setting-details" style="width:auto"> Öğrencinin detaylı analiz sekmesini göster</label><label><input type="checkbox" id="setting-sound" style="width:auto"> Öğrencinin alkış/tezahürat ses düğmesini göster</label><label>Ödev ders görünümü<select id="setting-assignment-subjects"><option value="simple">Sade (10 ders; TYT/AYT ayrımı yok)</option><option value="detailed">Ayrıntılı (TYT/AYT ve 1–2 ayrımı)</option></select></label><button class="primary">Ayarları kaydet</button></form></div>`;$('setting-mode').value=settings.examEntryMode||'BOTH';$('setting-default').value=settings.defaultEntryMode||'NET';$('setting-details').checked=settings.studentDetailedMode===true;$('setting-sound').checked=settings.studentCelebrationSound!==false;$('setting-assignment-subjects').value=settings.assignmentSubjectMode==='detailed'?'detailed':'simple';$('admin-form').onsubmit=async e=>{e.preventDefault();const patch={examEntryMode:$('setting-mode').value,defaultEntryMode:$('setting-default').value,studentDetailedMode:$('setting-details').checked,studentCelebrationSound:$('setting-sound').checked,assignmentSubjectMode:$('setting-assignment-subjects').value};try{await setDoc(doc(db,'Settings','SystemConfig'),patch,{merge:true});settings={...settings,...patch};draftMode=patch.examEntryMode==='BOTH'?patch.defaultEntryMode:patch.examEntryMode;draft={};notify('Admin parametreleri güncellendi.');render()}catch(err){notify(err.message,true)}};}

/* ================ TEKRARLANABİLİR TEST VERİSİ TEMİZLİĞİ ================
   Yalnızca çalışma koleksiyonları silinir. Kullanıcılar, öğrenci
   profili / diploma-OBP, kitaplar ve admin ayarları korunur.
*/
const WIPE_COLLECTIONS = ['Denemeler','TestEntries','Assignments'];
const WIPE_PHRASE = 'TEST VERİLERİNİ SİL';

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
    <h2>🧹 Test verilerini temizle (tekrar kullanılabilir)</h2>
    <p class="muted">Bu özellik test döneminde tekrar kullanılabilir. Temizlik gerçek kullanım moduna otomatik geçirmez. Kullanıcılar, diploma notu/OBP, kitaplar ve giriş parametreleri <strong>korunur.</strong></p>
    <p id="wipe-counts" class="summary">${wipeCounts()}</p>
    <p class="muted">Test kayıtlarını JSON olarak bilgisayarına al. Dosya indirmesini tarayıcında kontrol etmeden silme işlemine geçme.</p>
    <div class="buttons"><button type="button" id="test-backup" class="secondary">⬇ Test verilerini yedekle</button></div>
    <div class="cleanup-warning"><strong>Kalıcı işlem:</strong> Bütün Denemeler, TestEntries ve Assignments kayıtları kaldırılır. Eski tarihli kayıtlar da buna dahildir. Silme, güncel sonuçları da kapsar.</div>
      <button type="button" id="wipe-open" class="danger-btn">Test kayıtlarını temizle</button>
      <div id="wipe-confirm" class="wipe-confirm" hidden>
        <h3>Son onay</h3>
        <p id="wipe-confirm-counts"></p>
        <label class="checkline"><input id="wipe-backup-check" type="checkbox"> JSON yedeğini indirdim ve dosyayı kontrol ettim.</label>
        <p>Devam etmek için <strong>${WIPE_PHRASE}</strong> yaz.</p>
        <input id="wipe-phrase" autocomplete="off" placeholder="Onay ifadesini yaz" aria-label="Silme onayı">
        <label class="checkline"><input id="wipe-check" type="checkbox"> Seçilen kayıtların kalıcı olarak silineceğini anladım.</label>
        <div class="buttons"><button id="wipe-final" class="danger-btn" type="button" disabled>Kalıcı silmeyi onayla</button><button id="wipe-cancel" class="subtle" type="button">Vazgeç</button></div>
      </div>
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
  const open=pane.querySelector('#wipe-open'),area=pane.querySelector('#wipe-confirm');
  const phrase=pane.querySelector('#wipe-phrase'),check=pane.querySelector('#wipe-check'),backupCheck=pane.querySelector('#wipe-backup-check');
  const final=pane.querySelector('#wipe-final');
  const validate=()=>{final.disabled=wipeInProgress||phrase.value.trim()!==WIPE_PHRASE||!check.checked||!backupCheck.checked;};
  phrase.addEventListener('input',validate);check.addEventListener('change',validate);backupCheck.addEventListener('change',validate);
  open.onclick=()=>{area.hidden=false;pane.querySelector('#wipe-confirm-counts').textContent=wipeCounts();area.scrollIntoView({behavior:'smooth',block:'nearest'});};
  pane.querySelector('#wipe-cancel').onclick=()=>{area.hidden=true;phrase.value='';check.checked=false;backupCheck.checked=false;validate();};
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
      // Bu işlem kullanım modunu değiştirmez; yeni testler için silme açık kalır.
      showStatus('✅ Test kayıtları temizlendi. Yeni test kayıtları ekleyip tekrar temizleyebilirsiniz.');
      notify('Test kayıtları temizlendi.');
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

// Build marker for verifying GitHub Pages/browser caching.
document.title += ' · v11';


/* ================ v11: ADMIN RAPOR MERKEZİ ================
   Not: Tek öğrenci; sayılar sadece oturumdaki Firestore snapshot'larından.
   Atanan işin zamanı ve sonucunun çalışma zamanı ayrı filtrelenir.
   Verisi doğrulanamayan kayıtlar toplamları şişirmez.
*/
const ADMIN_REPORT_KINDS=[
 ['overview','Genel durum ve ödev gerçekleşmesi'],
 ['assignments','Ödev envanteri ve durumları'],
 ['overwork','Fazla / eksik çözülen sorular'],
 ['subjects','Ders / branş performansı'],
 ['work','Günlük çalışma ve ödev soru dökümü'],
 ['weekly','Haftalık çalışma özeti'],
 ['deadlines','Veriliş, bitiş ve gecikme'],
 ['targets','Doğru hedefleri ve başarı'],
 ['assigners','Ödevi atayan role göre dağılım'],
 ['exams','Deneme ve sonuç durumu'],
 ['quality','Eksik / çelişkili veri denetimi']
];
const adminReportState={kind:'overview',from:'',to:''};
const reportDate=x=>weeklyDate(x);
const reportBetween=(d,from,to)=>Boolean(d)&&(!from||d>=from)&&(!to||d<=to);
const reportNum=n=>Number.isFinite(n)?format(n):'—';
const reportTotal=(list,key)=>list.reduce((s,r)=>s+(Number(r[key])||0),0);
function reportResult(t){
 if(!t.result)return null;
 const r=t.result;
 const q=r.attempted===undefined||r.attempted===null||r.attempted===''?Number(r.correct)+Number(r.wrong)+Number(r.blank):Number(r.attempted);
 const d=Number(r.correct),w=Number(r.wrong),b=r.blank===undefined||r.blank===null?q-d-w:Number(r.blank);
 if(![q,d,w,b].every(Number.isInteger)||Math.min(q,d,w,b)<0||d+w+b!==q)return null;
 return {q,d,w,b,net:d-w/4};
}
function reportTestResult(t){
 const d=Number(t.dogru),w=Number(t.yanlis),q=t.questionCount==null?d+w+Number(t.bos||0):Number(t.questionCount),b=t.bos==null?q-d-w:Number(t.bos);
 if(![q,d,w,b].every(Number.isInteger)||Math.min(q,d,w,b)<0||d+w+b!==q)return null;
 return {q,d,w,b,net:d-w/4};
}
function reportRows(){
 const from=adminReportState.from,to=adminReportState.to;
 const assigned=tasks.filter(t=>reportBetween(reportDate(t.assignedDate||t.atanmaTarihi||t.tarih),from,to));
 const workTasks=tasks.filter(t=>reportBetween(reportDate(t.resultDate||t.resultUpdatedAt),from,to));
 const daily=tests.filter(t=>reportBetween(reportDate(t.studyDate||t.tarih),from,to));
 const examRows=exams.filter(t=>reportBetween(reportDate(t.examDate||t.tarih),from,to));
 return {assigned,workTasks,daily,examRows};
}
function reportTable(headers,rows){
 return `<div class="tablewrap"><table><thead><tr>${headers.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${headers.length}">Bu kapsamda kayıt yok.</td></tr>`}</tbody></table></div>`;
}
function reportMetricTotals(rows){return rows.reduce((a,r)=>({q:a.q+r.q,d:a.d+r.d,w:a.w+r.w,b:a.b+r.b,net:a.net+r.net}),{q:0,d:0,w:0,b:0,net:0});}
function reportWorkItems(data){
 const out=[];
 for(const t of data.workTasks){const r=reportResult(t);if(r)out.push({source:'Ödev',id:t.id,subject:assignmentSubjectName(t.ders),date:reportDate(t.resultDate||t.resultUpdatedAt),...r});}
 for(const t of data.daily){const r=reportTestResult(t);if(r)out.push({source:'Günlük çalışma',id:t.id,subject:assignmentSubjectName(t.ders),date:reportDate(t.studyDate||t.tarih),...r});}
 return out;
}
function reportAssignmentRows(data){
 return data.assigned.map(t=>{const m=assignmentMetrics(t),r=reportResult(t),q=Number(t.questionCount),validQ=Number.isInteger(q)&&q>0;
 return {t,m,r,q:validQ?q:null,actual:r?r.q:(m.valid?m.actual:null),date:reportDate(t.assignedDate||t.atanmaTarihi||t.tarih)};});
}
function adminReportBuild(kind,data){
 const ar=reportAssignmentRows(data),items=reportWorkItems(data);
 const fmt=reportNum,emp=n=>n===null?'—':String(n);
 const completed=ar.filter(x=>x.m.complete).length,active=ar.filter(x=>!x.m.cancelled),validated=ar.filter(x=>x.q!==null&&x.actual!==null);
 const over=validated.filter(x=>!x.m.cancelled&&x.actual>x.q),under=validated.filter(x=>!x.m.cancelled&&x.actual<x.q);
 const sum=reportMetricTotals(items);
 const assignedQs=ar.filter(x=>x.q!==null).reduce((s,x)=>s+x.q,0);
 const heading=`<p class="muted">Tarih filtresi: Ödev envanterinde veriliş, çalışma raporunda sonuç/çalışma, denemelerde sınav tarihi esas alınır. Tüm ödevlerin tamamlanma oranı, veriliş tarihine göre seçilen kayıtlar içindir.</p>`;
 const tableAssignments=(arr)=>reportTable(['Ders','Veriliş','Bitiş','Atanan','Gerçekleşen','Fark','Gerçekleşme','Durum'],arr.map(x=>[assignmentSubjectName(x.t.ders),dateString(x.t.assignedDate||x.t.atanmaTarihi||x.t.tarih),dateString(x.t.dueDate||x.t.tarih),emp(x.q),emp(x.actual),x.q===null||x.actual===null?'—':(x.actual-x.q>0?'+':'')+(x.actual-x.q),x.q&&x.actual!==null?fmt(100*x.actual/x.q)+'%':'—',assignmentStatus(x.t)]));
 const workTable=(list)=>reportTable(['Tarih','Kaynak','Ders','Toplam','Doğru','Yanlış','Boş','Net'],list.map(x=>[dateString(x.date),x.source,x.subject,x.q,x.d,x.w,x.b,fmt(x.net)]));
 if(kind==='overview')return heading+`<div class="stats">${detail('Toplam ödev',active.length)}${detail('Tamamlanan ödev',completed+'/'+active.length)}${detail('Eksik ödev',under.length)}${detail('Hedef üstü ödev',over.length)}${detail('Atanan soru',assignedQs)}${detail('Gerçekleşen ödev sorusu',reportTotal(items.filter(x=>x.source==='Ödev'),'q'))}${detail('Tüm çalışma sorusu',sum.q)}${detail('Toplam net',fmt(sum.net))}</div><p class="muted">Tamamlanan ödev sayısı, mevcut kartlar ve öğrenci analizindeki ortak hesaplamayla aynıdır. İptal edilenler paydaya alınmaz. Çalışmalar denemeleri kapsamaz.</p>`+tableAssignments(ar);
 if(kind==='assignments')return heading+tableAssignments(ar);
 if(kind==='overwork')return heading+`<div class="stats">${detail('Fazla çözülen soru',over.reduce((s,x)=>s+x.actual-x.q,0))}${detail('Eksik kalan soru',under.reduce((s,x)=>s+x.q-x.actual,0))}${detail('Hedef üstü ödev',over.length)}${detail('Eksik ödev',under.length)}</div><p class="muted">Eksik kalan sorular “Boş” kabul edilmez. Geçerli sonucu olmayan ödevler fark hesabına katılmaz.</p>`+tableAssignments([...over,...under]);
 if(kind==='subjects'){
  const groups=new Map();for(const it of items){const row=groups.get(it.subject)||{subject:it.subject,q:0,d:0,w:0,b:0,net:0,records:0};for(const k of ['q','d','w','b','net'])row[k]+=it[k];row.records++;groups.set(it.subject,row);}
  const rows=[...groups.values()].sort((a,b)=>ASSIGNMENT_SIMPLE_SUBJECTS.indexOf(a.subject)-ASSIGNMENT_SIMPLE_SUBJECTS.indexOf(b.subject));
  return heading+reportTable(['Ders','Kayıt','Toplam','Doğru','Yanlış','Boş','Net','Doğru oranı'],rows.map(r=>[r.subject,r.records,r.q,r.d,r.w,r.b,fmt(r.net),r.q?fmt(100*r.d/r.q)+'%':'—']).concat(rows.length?[['GENEL TOPLAM',items.length,sum.q,sum.d,sum.w,sum.b,fmt(sum.net),sum.q?fmt(100*sum.d/sum.q)+'%':'—']]:[]));
 }
 if(kind==='work')return heading+`<div class="stats">${detail('Toplam soru',sum.q)}${detail('Doğru',sum.d)}${detail('Yanlış',sum.w)}${detail('Boş',sum.b)}${detail('Net',fmt(sum.net))}</div>`+workTable(items);
 if(kind==='weekly'){
  const groups=new Map();for(const it of items){const bounds=weekBounds(it.date);if(!bounds)continue;const key=bounds[0],r=groups.get(key)||{start:key,end:bounds[1],q:0,d:0,w:0,b:0,net:0};for(const k of ['q','d','w','b','net'])r[k]+=it[k];groups.set(key,r);}
  return heading+reportTable(['Hafta','Toplam soru','Doğru','Yanlış','Boş','Net'],[...groups.values()].sort((a,b)=>a.start.localeCompare(b.start)).map(r=>[dateString(r.start)+' – '+dateString(r.end),r.q,r.d,r.w,r.b,fmt(r.net)]));
 }
 if(kind==='deadlines'){
  const today=new Date().toLocaleDateString('sv-SE');const late=ar.filter(x=>!x.m.cancelled&&!x.m.complete&&reportDate(x.t.dueDate||x.t.tarih)&&reportDate(x.t.dueDate||x.t.tarih)<today);
  return heading+`<div class="stats">${detail('Süresi geçen eksik ödev',late.length)}${detail('Atanmış ödev',active.length)}</div>`+reportTable(['Ders','Veriliş','Bitiş','Gün farkı','Durum'],late.map(x=>[assignmentSubjectName(x.t.ders),dateString(x.t.assignedDate||x.t.tarih),dateString(x.t.dueDate||x.t.tarih),Math.floor((new Date(today+'T12:00:00')-new Date(reportDate(x.t.dueDate||x.t.tarih)+'T12:00:00'))/86400000),assignmentStatus(x.t)]));
 }
 if(kind==='targets'){
  const withTargets=ar.filter(x=>x.t.targetCorrect!==null&&x.t.targetCorrect!==undefined&&x.t.targetCorrect!==''&&Number.isFinite(Number(x.t.targetCorrect)));
  const known=withTargets.filter(x=>x.r),hit=known.filter(x=>x.r.d>=Number(x.t.targetCorrect));
  return heading+`<div class="stats">${detail('Hedef tanımlı',withTargets.length)}${detail('Sonuçlu hedef',known.length)}${detail('Hedefe ulaşılan',hit.length)}${detail('Hedefe ulaşılamayan',known.length-hit.length)}</div>`+reportTable(['Ders','Hedef doğru','Gerçek doğru','Fark','Hedef durumu'],withTargets.map(x=>[assignmentSubjectName(x.t.ders),x.t.targetCorrect,x.r?x.r.d:'—',x.r?x.r.d-Number(x.t.targetCorrect):'—',!x.r?'Sonuç yok':x.r.d>=Number(x.t.targetCorrect)?'Ulaşıldı':'Ulaşılamadı']));
 }
 if(kind==='assigners'){
  const groups=new Map();for(const x of ar){const k=x.t.assignedByRole||'Belirtilmemiş';const r=groups.get(k)||{total:0,complete:0,question:0,over:0};r.total++;r.complete+=x.m.complete?1:0;r.question+=x.q||0;r.over+=x.q!==null&&x.actual!==null?Math.max(0,x.actual-x.q):0;groups.set(k,r);}
  return heading+reportTable(['Atayan rol','Ödev','Tamamlanan','Atanan soru','Fazla çözülen'],[...groups.entries()].map(([k,r])=>[k,r.total,r.complete,r.question,r.over]));
 }
 if(kind==='exams'){
  const pending=data.examRows.filter(x=>x.resultStatus==='pending'||!x.results||!Object.values(x.results).some(r=>r&&r.entered)).length;
  return heading+`<div class="stats">${detail('Deneme kaydı',data.examRows.length)}${detail('Sonuç bekleyen',pending)}${detail('Sonuçlu',data.examRows.length-pending)}</div>`+reportTable(['Deneme','Tarih','Tür','Kaynak','Net','Sonuç durumu'],data.examRows.map(x=>[x.denemeAdi||'—',dateString(x.examDate||x.tarih),x.denemeTuru||'—',x.examSource||'—',examNetText(x),x.resultStatus==='pending'?'Sonuç bekleniyor':x.complete?'Tam':'Kısmi / eski kayıt']));
 }
 if(kind==='quality'){
  const bad=[];for(const x of reportAssignmentRows({assigned:tasks})){if(x.q===null)bad.push(['Ödev',x.t.id,'Atanan soru sayısı geçersiz veya yok']);if(x.t.result&&!reportResult(x.t))bad.push(['Ödev',x.t.id,'Sonuç D+Y+B toplamı veya sayılar geçersiz']);if(x.t.result&&!reportDate(x.t.resultDate||x.t.resultUpdatedAt))bad.push(['Ödev',x.t.id,'Sonuç tarihi yok; haftalık rapora giremez']);if(!x.date)bad.push(['Ödev',x.t.id,'Veriliş tarihi yok; filtrelenemez']);}
  for(const t of tests){if(!reportTestResult(t))bad.push(['Günlük çalışma',t.id,'Soru sonuçları tutarsız']);if(!reportDate(t.studyDate||t.tarih))bad.push(['Günlük çalışma',t.id,'Çalışma tarihi yok']);}
  return `<p class="muted">Veri denetimi tarih filtresinden bağımsızdır; tüm mevcut kayıtları inceler. Eski sonuçsuz ödevlerde sonuç bulunmaması tek başına hata değildir.</p><div class="stats">${detail('Tespit edilen konu',bad.length)}</div>`+reportTable(['Kaynak','Kayıt kimliği','Açıklama'],bad);
 }
 return heading;
}
function reportCSV(kind,data){
 const ar=reportAssignmentRows(data),work=reportWorkItems(data);
 const rows=kind==='work'||kind==='weekly'||kind==='subjects'?
  [['Tarih','Kaynak','Ders','Toplam','Doğru','Yanlış','Boş','Net'],...work.map(x=>[x.date,x.source,x.subject,x.q,x.d,x.w,x.b,x.net])]:
  [['Ders','Veriliş','Bitiş','Atanan','Gerçekleşen','Fark','Durum','Doğru','Yanlış','Boş','Net'],...ar.map(x=>[assignmentSubjectName(x.t.ders),x.date,reportDate(x.t.dueDate||x.t.tarih),x.q??'',x.actual??'',x.q===null||x.actual===null?'':x.actual-x.q,assignmentStatus(x.t),x.r?.d??'',x.r?.w??'',x.r?.b??'',x.r?.net??''])];
 return '\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(';')).join('\r\n');
}
function reportDownload(content,name,type){const blob=new Blob([content],{type});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
const previousRenderReports=renderReports;
renderReports=function(){
 if(!canAdmin()){previousRenderReports();return;}
 $('content').innerHTML=`<section class="card"><h1>Admin · Rapor merkezi</h1><p class="muted">Tek öğrenci · tarih aralığı ve rapor türüne göre rapor. PDF için yazdır; CSV bilgisayarında Excel ile açılabilir. Kayıtları değiştirmez.</p><div class="grid"><label>Rapor türü<select id="admin-report-kind">${ADMIN_REPORT_KINDS.map(([v,l])=>`<option value="${v}">${esc(l)}</option>`).join('')}</select></label><label>Başlangıç<input id="admin-report-from" type="date"></label><label>Bitiş<input id="admin-report-to" type="date"></label></div><div class="buttons"><button class="primary" id="admin-report-pdf">Yazdır / PDF</button><button class="secondary" id="admin-report-csv">CSV indir</button><button class="secondary" id="admin-report-json">JSON yedeği</button><button class="subtle" id="admin-report-reset">Tarih filtresini kaldır</button></div></section><section class="card" id="admin-report-output"></section>`;
 const kind=$('admin-report-kind'),from=$('admin-report-from'),to=$('admin-report-to');kind.value=adminReportState.kind;from.value=adminReportState.from;to.value=adminReportState.to;
 const draw=()=>{adminReportState.kind=kind.value;adminReportState.from=from.value;adminReportState.to=to.value;
  if(from.value&&to.value&&from.value>to.value){$('admin-report-output').innerHTML='<p class="error">Başlangıç tarihi bitiş tarihinden sonra olamaz.</p>';return false;}
  $('admin-report-output').innerHTML=`<h2>${esc(ADMIN_REPORT_KINDS.find(x=>x[0]===kind.value)?.[1])}</h2><p class="muted">${from.value?dateString(from.value):'Tüm geçmiş'} – ${to.value?dateString(to.value):'Bugün ve sonrası dahil'}</p>`+adminReportBuild(kind.value,reportRows());return true;};
 for(const inp of [kind,from,to])inp.onchange=draw;
 $('admin-report-reset').onclick=()=>{from.value='';to.value='';draw();};
 $('admin-report-pdf').onclick=()=>{if(draw())window.print();};
 $('admin-report-csv').onclick=()=>{if(draw())reportDownload(reportCSV(kind.value,reportRows()),'YKS-Admin-'+kind.value+'-'+new Date().toLocaleDateString('sv-SE')+'.csv','text/csv;charset=utf-8')};
 $('admin-report-json').onclick=()=>reportDownload(JSON.stringify({exportedAt:new Date().toISOString(),exams,tasks,tests,profile},null,2),'YKS-Admin-Yedek-'+new Date().toLocaleDateString('sv-SE')+'.json','application/json;charset=utf-8');
 draw();
};
