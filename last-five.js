/* Son beş deneme hesapları; Firebase/DOM bağımlılığı yoktur. */
export const EXAM_TYPES = ['TYT','SAY','EA','SOZ','DIL'];
export const TYPE_NAMES = {TYT:'TYT',SAY:'AYT Sayısal',EA:'AYT Eşit Ağırlık',SOZ:'AYT Sözel',DIL:'YDT Dil'};

function validNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function examDate(exam) {
  if (typeof exam.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(exam.examDate)) return exam.examDate;
  if (exam.tarih?.toDate) return exam.tarih.toDate().toISOString().slice(0,10);
  if (typeof exam.tarih === 'string' && /^\d{4}-\d{2}-\d{2}/.test(exam.tarih)) return exam.tarih.slice(0,10);
  return '';
}
function examTime(exam) {
  if (exam.tarih?.toMillis) return exam.tarih.toMillis();
  if (exam.tarih?.seconds) return exam.tarih.seconds * 1000;
  return 0;
}
export function testNet(exam, id, label) {
  const result = exam.results?.[id];
  if (result?.entered === true) return validNumber(result.net);
  if (result?.entered === false) return null;
  return validNumber(exam.altNetler?.[label]);
}
export function lastFiveAnalysis(exams, type, tests) {
  if (!EXAM_TYPES.includes(type)) throw Error('Geçersiz deneme türü');
  const subjectIds = Object.keys(tests).filter(id =>
    tests[id].group === 'TYT' || (type === 'DIL' ? id === 'ydt-dil' : type === 'SAY'
      ? ['ayt-mat','ayt-fizik','ayt-kimya','ayt-biyo'].includes(id)
      : type === 'EA' ? ['ayt-mat','ayt-tde','ayt-tar1','ayt-cog1'].includes(id)
      : type === 'SOZ' ? ['ayt-tde','ayt-tar1','ayt-cog1','ayt-tar2','ayt-cog2','ayt-felsefe','ayt-din'].includes(id)
      : false));
  const eligible = exams.filter(e => e.denemeTuru === type && e.complete !== false &&
    validNumber(e.toplamNet) !== null &&
    // Eski kayıtlar da desteklenir; ancak yalnızca eksiksiz ders netleri varsa.
    subjectIds.every(id => testNet(e, id, tests[id].label) !== null));
  eligible.sort((a,b) => examDate(a).localeCompare(examDate(b)) ||
    examTime(a)-examTime(b) || String(a.id??'').localeCompare(String(b.id??'')));
  const records = eligible.slice(-5);
  const values = records.map(e => Number(e.toplamNet));
  const latest = values.length ? values.at(-1) : null;
  const average = values.length ? values.reduce((a,b)=>a+b,0)/values.length : null;
  const highest = values.length ? Math.max(...values) : null;
  const change = values.length > 1 ? latest-values[0] : null;
  const subjects = subjectIds.map(id => {
    const nets = records.map(e=>testNet(e,id,tests[id].label));
    return {id,label:tests[id].label,first:nets.length?nets[0]:null,last:nets.length?nets.at(-1):null,
      change:nets.length>1?nets.at(-1)-nets[0]:null,values:nets};
  });
  const allOfType = exams.filter(e=>e.denemeTuru===type);
  return {type,records,values,latest,average,highest,change,subjects,
    excluded:allOfType.length-eligible.length,count:records.length};
}
