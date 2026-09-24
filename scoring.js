export const TESTS = {
 'tyt-turkce':{label:'TYT Türkçe',q:40,group:'TYT'},'tyt-sosyal':{label:'TYT Sosyal',q:20,group:'TYT'},'tyt-mat':{label:'TYT Matematik',q:40,group:'TYT'},'tyt-fen':{label:'TYT Fen',q:20,group:'TYT'},
 'ayt-mat':{label:'AYT Matematik',q:40,group:'AYT'},'ayt-fizik':{label:'AYT Fizik',q:14,group:'AYT'},'ayt-kimya':{label:'AYT Kimya',q:13,group:'AYT'},'ayt-biyo':{label:'AYT Biyoloji',q:13,group:'AYT'},
 'ayt-tde':{label:'AYT Türk Dili ve Edebiyatı',q:24,group:'AYT'},'ayt-tar1':{label:'AYT Tarih-1',q:10,group:'AYT'},'ayt-cog1':{label:'AYT Coğrafya-1',q:6,group:'AYT'},
 'ayt-tar2':{label:'AYT Tarih-2',q:11,group:'AYT'},'ayt-cog2':{label:'AYT Coğrafya-2',q:11,group:'AYT'},'ayt-felsefe':{label:'AYT Felsefe Grubu',q:12,group:'AYT'},'ayt-din':{label:'AYT Din / İlave Felsefe',q:6,group:'AYT'},'ydt-dil':{label:'YDT Yabancı Dil',q:80,group:'YDT'}
};
export const TYPES={TYT:['tyt-turkce','tyt-sosyal','tyt-mat','tyt-fen'],SAY:['ayt-mat','ayt-fizik','ayt-kimya','ayt-biyo'],EA:['ayt-mat','ayt-tde','ayt-tar1','ayt-cog1'],SOZ:['ayt-tde','ayt-tar1','ayt-cog1','ayt-tar2','ayt-cog2','ayt-felsefe','ayt-din'],DIL:['ydt-dil']};
export const idsFor=type=>type==='TYT'?[...TYPES.TYT]:[...TYPES.TYT,...(TYPES[type]||[])];
export const parseNumber=value=>{if(value===null||value===undefined||String(value).trim()==='')return null;const s=String(value).trim().replace(',','.');if(!/^-?\d+(\.\d+)?$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null;};
export const format=value=>value===null||value===undefined?'—':Number(value).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
export function computeTest(raw,id,mode){const q=TESTS[id].q;if(mode==='NET'){const n=parseNumber(raw?.net);if(n===null)return {entered:false,net:null,correct:null,wrong:null,blank:null,questionCount:q};if(n< -q/4||n>q||Math.abs(n*4-Math.round(n*4))>1e-7)throw Error(`${TESTS[id].label}: Net -${q/4} ile ${q} arasında, 0,25 adımlı olmalıdır.`);return{entered:true,net:n,correct:null,wrong:null,blank:null,questionCount:q};}
 const d=parseNumber(raw?.correct),w=parseNumber(raw?.wrong);if(d===null&&w===null)return{entered:false,net:null,correct:null,wrong:null,blank:null,questionCount:q};if(d===null||w===null||!Number.isInteger(d)||!Number.isInteger(w)||d<0||w<0||d+w>q)throw Error(`${TESTS[id].label}: Doğru ve yanlış tam sayı olmalı; toplam ${q} soruyu aşmamalıdır.`);return{entered:true,net:d-w/4,correct:d,wrong:w,blank:q-d-w,questionCount:q};}
export function computeExam(type,mode,raw){const results={};let tyt=0,field=0,complete=true,any=false;for(const id of idsFor(type)){const r=computeTest(raw[id],id,mode);results[id]=r;if(r.entered){any=true;if(TESTS[id].group==='TYT')tyt+=r.net;else field+=r.net;}else complete=false;}return{results,tytNet:any?tyt:null,fieldNet:any?field:null,totalNet:any?tyt+field:null,complete:any&&complete,any};}
// Legacy denemelerde, ders netleri tam ise kaydedilmiş toplamı doğrula.
// Eksik veya kısmi kayıtları tamamlanmış gibi gösterme; veritabanına kendiliğinden yazma.
export function normalizedExamTotals(exam){
 const type=exam?.denemeTuru;
 if(!TYPES[type]) return null;
 const ids=idsFor(type);
 const numbers=[];
 for(const id of ids){
  const item=exam.results?.[id];
  if(item?.entered===false) return null;
  let n=item?.entered===true?parseNumber(item.net):null;
  if(n===null){
   const label=TESTS[id].label;
   const keys=id==='ayt-tde'?[label,'AYT TDE','AYT Türkçe']:[label];
   for(const key of keys){n=parseNumber(exam.altNetler?.[key]);if(n!==null)break;}
  }
  if(n===null) return null;
  numbers.push([id,n]);
 }
 const tytNet=numbers.filter(([id])=>TESTS[id].group==='TYT').reduce((s,[,n])=>s+n,0);
 const fieldNet=numbers.filter(([id])=>TESTS[id].group!=='TYT').reduce((s,[,n])=>s+n,0);
 const totalNet=tytNet+fieldNet;
 return {tytNet,fieldNet,totalNet,storedTotal:parseNumber(exam.toplamNet),
  differs:parseNumber(exam.toplamNet)!==null&&Math.abs(totalNet-parseNumber(exam.toplamNet))>1e-7};
}
export function obpFromProfile(profile){if(profile?.diplomaStatus==='unknown'||!profile?.diplomaStatus)return null;const diploma=parseNumber(profile.diplomaNote);if(diploma===null||diploma<50||diploma>100)return null;const obp=diploma*5;const factor=profile.brokenObp?0.06:0.12;return{diploma,obp,factor,contribution:obp*factor,isEstimate:profile.diplomaStatus==='estimated'};}
// Net başarısı uygulama içi göstergedir: resmi/tahmini ÖSYM puanı DEĞİLDİR.
export function successIndicator(type,exam){if(!exam.complete)return null;const w={'tyt-turkce':.132,'tyt-sosyal':.068,'tyt-mat':.132,'tyt-fen':.068};if(type==='TYT'){w['tyt-turkce']=.33;w['tyt-sosyal']=.17;w['tyt-mat']=.33;w['tyt-fen']=.17;}if(type==='SAY')Object.assign(w,{'ayt-mat':.30,'ayt-fizik':.10,'ayt-kimya':.10,'ayt-biyo':.10});if(type==='EA')Object.assign(w,{'ayt-mat':.30,'ayt-tde':.18,'ayt-tar1':.07,'ayt-cog1':.05});if(type==='SOZ')Object.assign(w,{'ayt-tde':.18,'ayt-tar1':.07,'ayt-cog1':.05,'ayt-tar2':.08,'ayt-cog2':.08,'ayt-felsefe':.09,'ayt-din':.05});if(type==='DIL')w['ydt-dil']=.60;return 100+400*Object.entries(w).reduce((a,[id,weight])=>a+weight*exam.results[id].net/TESTS[id].q,0);}
