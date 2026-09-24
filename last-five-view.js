import {lastFiveAnalysis, EXAM_TYPES, TYPE_NAMES} from './last-five.js';

const tr = n => n === null ? '—' : n.toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2});
const html = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const signed = n => n===null?'—':(n>0?'+':'')+tr(n);
const date = e => e.examDate || (e.tarih?.toDate?.()?.toLocaleDateString('tr-TR') ?? '—');

function lineChart(data) {
  if (!data.length) return '<div class="empty-state">Grafik için deneme bekleniyor.</div>';
  const w=660,h=194, left=40,right=18,top=23,bottom=35;
  const min=Math.min(0,...data),max=Math.max(1,...data),span=Math.max(1,max-min);
  const x=i=>data.length===1?w/2:left+i*(w-left-right)/(data.length-1);
  const y=n=>h-bottom-(n-min)/span*(h-top-bottom);
  const points=data.map((n,i)=>`${x(i)},${y(n)}`).join(' ');
  const circles=data.map((n,i)=>`<circle cx="${x(i)}" cy="${y(n)}" r="5" fill="#2563eb" stroke="white" stroke-width="2"/><text x="${x(i)}" y="${Math.max(15,y(n)-12)}" text-anchor="middle" font-size="12" fill="#174ea6">${html(tr(n))}</text><text x="${x(i)}" y="${h-7}" text-anchor="middle" font-size="12" fill="#64748b">${i+1}</text>`).join('');
  return `<div class="last5-chart"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="Son ${data.length} denemenin net çizgi grafiği" preserveAspectRatio="xMidYMid meet"><line x1="${left}" y1="${h-bottom}" x2="${w-right}" y2="${h-bottom}" stroke="#cbd5e1"/><polyline points="${points}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}</svg></div>`;
}
export function lastFiveWidget(exams, testDefinitions, initialType='TYT') {
  const type=EXAM_TYPES.includes(initialType)?initialType:'TYT';
  const analysis=lastFiveAnalysis(exams,type,testDefinitions);
  const {records,latest,average,highest,change,subjects,excluded,count,values}=analysis;
  const rows=records.map((e,i)=>`<tr><td>${i+1}</td><td>${html(e.denemeAdi||'Deneme')}<br><small>${html(date(e))}</small></td><td>${html(e.examSource||'Belirtilmemiş')}</td><td>${tr(Number(e.tytNet??0))}</td><td>${type==='TYT'?'—':tr(Number(e.fieldNet??0))}</td><td><strong>${tr(Number(e.toplamNet))}</strong></td></tr>`).join('');
  const subjectRows=subjects.map(s=>`<tr><td>${html(s.label)}</td><td>${tr(s.first)}</td><td>${tr(s.last)}</td><td class="${s.change>0?'trend-up':s.change<0?'trend-down':''}">${signed(s.change)}</td></tr>`).join('');
  const up=subjects.filter(s=>s.change>0).sort((a,b)=>b.change-a.change)[0];
  const down=subjects.filter(s=>s.change<0).sort((a,b)=>a.change-b.change)[0];
  const changeText=change===null?'Karşılaştırma için en az iki tam deneme gerekiyor.':change>0?`İlk ve son deneme arasında ${tr(change)} net artış var.`:change<0?`İlk ve son deneme arasında ${tr(-change)} net azalış var.`:'İlk ve son denemenin toplam neti aynı.';
  return `<section class="card last5-panel"><div class="last5-heading"><div><h2>📈 Son 5 Deneme Analizi</h2><p class="muted">Aynı puan türündeki son ${count} tam deneme; eski sonuçlar dahil.</p></div><label>Deneme türü<select id="last5-type">${EXAM_TYPES.map(t=>`<option value="${t}" ${t===type?'selected':''}>${html(TYPE_NAMES[t])}</option>`).join('')}</select></label></div>
    <div class="stats">${[['Son net',latest],['Son 5 ortalaması',average],['En yüksek net',highest],['İlk–son farkı',change]].map(([k,v])=>`<div class="stat"><small>${k}</small><strong>${k==='İlk–son farkı'?signed(v):tr(v)}</strong></div>`).join('')}</div>
    ${count?lineChart(values):'<div class="empty-state">Bu puan türünde henüz tam deneme bulunmuyor.</div>'}
    ${excluded?`<p class="muted">${excluded} eksik/kısmi veya net ayrıntıları bulunmayan kayıt bu karşılaştırmaya alınmadı.</p>`:''}
    <div class="analysis-note">${html(changeText)} ${up?`${html(up.label)}: ${signed(up.change)} net.`:''} ${down?`${html(down.label)}: ${signed(down.change)} net.`:''}</div>
    <h3>Deneme bazında sonuçlar</h3><div class="tablewrap"><table><thead><tr><th>#</th><th>Deneme / Tarih</th><th>Kaynak</th><th>TYT</th><th>Alan</th><th>Toplam</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Henüz kayıt yok.</td></tr>'}</tbody></table></div>
    <h3>Derslerin ilk ve son deneme farkı</h3><div class="tablewrap"><table><thead><tr><th>Ders</th><th>İlk</th><th>Son</th><th>Değişim</th></tr></thead><tbody>${subjectRows}</tbody></table></div>
    <p class="muted">Net farkı, farklı güçlükteki denemelerin eşdeğer olduğu veya değişimin nedeninin bilindiği anlamına gelmez. Net başarı göstergesi ÖSYM puanı değildir.</p>
   </section>`;
}
