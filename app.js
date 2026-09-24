import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, serverTimestamp, query, orderBy, where } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M",
    authDomain: "tayt-bbbbe.firebaseapp.com",
    projectId: "tayt-bbbbe",
    storageBucket: "tayt-bbbbe.firebasestorage.app",
    messagingSenderId: "367442443596",
    appId: "1:367442443596:web:be954f464173e2abe5e3e9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// YÖK Atlas Verileri
const yokAtlasReferanslari = {
    "boun-ceng": { yil: 2025, puanTuru: "SAY", katsayi: "0.12", obp: 485.50, netler: { "TYT Türkçe": 36.5, "TYT Sosyal": 15.2, "TYT Matematik": 38.5, "TYT Fen": 18.0, "AYT Matematik": 39.0, "AYT Fizik": 12.5, "AYT Kimya": 13.0, "AYT Biyoloji": 12.0 } },
    "gs-hukuk": { yil: 2025, puanTuru: "EA", katsayi: "0.12", obp: 470.20, netler: { "TYT Türkçe": 35.0, "TYT Sosyal": 16.5, "TYT Matematik": 34.0, "TYT Fen": 10.0, "AYT Matematik": 35.5, "AYT TDE": 22.0, "AYT Tarih-1": 8.5, "AYT Coğrafya-1": 5.0 } },
    "boun-tde": { yil: 2025, puanTuru: "SÖZ", katsayi: "0.12", obp: 460.00, netler: { "TYT Türkçe": 37.0, "TYT Sosyal": 17.5, "TYT Matematik": 25.0, "TYT Fen": 5.0, "AYT TDE": 23.0, "AYT Tarih-1": 9.0, "AYT Coğrafya-1": 6.0, "AYT Tarih-2": 9.5, "AYT Coğrafya-2": 10.0, "AYT Felsefe Grubu": 10.5, "AYT Din": 5.0 } },
    "odtu-ing": { yil: 2025, puanTuru: "DİL", katsayi: "0.12", obp: 440.00, netler: { "TYT Türkçe": 33.0, "TYT Sosyal": 14.5, "TYT Matematik": 22.0, "TYT Fen": 6.0, "YDT Dil": 75.5 } }
};

let currentUserRole = "";
let sonDenemeVerisi = null;
let isStudentDetailedMode = false;
let isMatrixInputEnabled = true;
let mainGridState = [];
let myChart = null;

// ROL YÖNETİMİ VE ARAYÜZ GÖSTERİMİ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-screen').classList.remove('d-none');
        
        try {
            const docRef = doc(db, "Users", user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                currentUserRole = (data.Rol || "Öğrenci").trim();
                document.getElementById('welcome-text').innerText = "Hoş Geldin, " + (data.AdSoyad || 'Kullanıcı') + "!";
                document.getElementById('role-text').innerText = currentUserRole;
            } else {
                currentUserRole = "Öğrenci";
                document.getElementById('role-text').innerText = currentUserRole;
            }

            await loadAdminSettings();
            applyRoleBasedUI(currentUserRole);
            loadDenemeler();
            loadAssignments();
            loadBireyselTestAnalizi();
            loadDuyuru();
        } catch (error) {}
    } else {
        document.getElementById('login-screen').classList.remove('d-none');
        document.getElementById('main-screen').classList.add('d-none');
    }
});

function applyRoleBasedUI(role) {
    const adminPnl = document.getElementById('admin-panel');
    const teachPnl = document.getElementById('teacher-assign-panel');
    const studPnl = document.getElementById('student-panel');
    const studAssignPnl = document.getElementById('student-assignment-card');
    const analizPnl = document.getElementById('analiz-panel');
    const yeniDenemeBtn = document.getElementById('yeni-deneme-btn');

    [adminPnl, teachPnl, studPnl, studAssignPnl, analizPnl].forEach(p => p.classList.add('d-none'));

    if (role === "Admin") {
        adminPnl.classList.remove('d-none'); teachPnl.classList.remove('d-none'); analizPnl.classList.remove('d-none');
        yeniDenemeBtn.classList.remove('d-none');
    } 
    else if (role === "Öğretmen" || role === "Koç" || role === "Ogretmen") {
        teachPnl.classList.remove('d-none'); analizPnl.classList.remove('d-none');
        yeniDenemeBtn.classList.add('d-none'); 
    } 
    else if (role === "Veli") {
        analizPnl.classList.remove('d-none'); studAssignPnl.classList.remove('d-none');
        yeniDenemeBtn.classList.add('d-none');
    } 
    else {
        studPnl.classList.remove('d-none'); studAssignPnl.classList.remove('d-none');
        yeniDenemeBtn.classList.remove('d-none');
        document.getElementById('motivation-banner').classList.remove('d-none');
        if (isStudentDetailedMode) analizPnl.classList.remove('d-none');
        generateQuestionGrid(12);
    }
}

// AYARLAR VE MATRİS IZGARASI (HATA DEFTERİ)
async function loadAdminSettings() {
    try {
        const snap = await getDoc(doc(db, "Settings", "SystemConfig"));
        if (snap.exists()) {
            const d = snap.data();
            isStudentDetailedMode = d.studentDetailedMode === true;
            isMatrixInputEnabled = d.matrixInputEnabled !== false;
        }
        document.getElementById('student-mode-switch').checked = isStudentDetailedMode;
        document.getElementById('matrix-input-switch').checked = isMatrixInputEnabled;
        toggleMatrixUI();

        document.getElementById('student-mode-switch').onchange = async function() {
            isStudentDetailedMode = this.checked; await setDoc(doc(db, "Settings", "SystemConfig"), { studentDetailedMode: isStudentDetailedMode, matrixInputEnabled: isMatrixInputEnabled });
            applyRoleBasedUI(currentUserRole);
        };
        document.getElementById('matrix-input-switch').onchange = async function() {
            isMatrixInputEnabled = this.checked; await setDoc(doc(db, "Settings", "SystemConfig"), { studentDetailedMode: isStudentDetailedMode, matrixInputEnabled: isMatrixInputEnabled });
            toggleMatrixUI();
        };
    } catch(e) {}
}

function toggleMatrixUI() {
    if (isMatrixInputEnabled) {
        document.getElementById('matrix-input-section').classList.remove('d-none');
        document.getElementById('manual-input-section').classList.add('d-none');
    } else {
        document.getElementById('matrix-input-section').classList.add('d-none');
        document.getElementById('manual-input-section').classList.remove('d-none');
    }
}

window.generateQuestionGrid = function(count) {
    const container = document.getElementById('question-grid-container');
    if (!container) return;
    const total = parseInt(count) || 12;
    mainGridState = []; container.innerHTML = "";
    for (let i = 1; i <= total; i++) {
        mainGridState.push({ no: i, status: 'D' });
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'btn btn-success grid-btn'; btn.innerText = `${i}: D`;
        btn.onclick = () => {
            let q = mainGridState.find(x => x.no === i);
            if(q.status === 'D') { q.status = 'Y'; btn.className = 'btn btn-danger grid-btn'; btn.innerText = `${i}: Y`; }
            else if(q.status === 'Y') { q.status = 'B'; btn.className = 'btn btn-warning text-dark grid-btn'; btn.innerText = `${i}: B`; }
            else { q.status = 'D'; btn.className = 'btn btn-success grid-btn'; btn.innerText = `${i}: D`; }
        };
        container.appendChild(btn);
    }
}

// BİREYSEL TEST GİRİŞİ (ÖĞRENCİ)
document.getElementById('test-entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ders = document.getElementById('ders').value;
    const kitap = document.getElementById('kaynak-kitap').value;
    const konu = document.getElementById('konu').value;
    let dogru = 0, yanlis = 0, bos = 0;

    if (isMatrixInputEnabled) {
        dogru = mainGridState.filter(q => q.status === 'D').length;
        yanlis = mainGridState.filter(q => q.status === 'Y').length;
        bos = mainGridState.filter(q => q.status === 'B').length;
    } else {
        dogru = parseInt(document.getElementById('dogru').value) || 0;
        yanlis = parseInt(document.getElementById('yanlis').value) || 0;
        bos = parseInt(document.getElementById('bos').value) || 0;
    }

    const net = parseFloat((dogru - (yanlis / 4)).toFixed(2));
    try {
        await addDoc(collection(db, "TestEntries"), { ders, kitap, konu, dogru, yanlis, bos, net, tarih: serverTimestamp() });
        document.getElementById('test-entry-form').reset();
        if (isMatrixInputEnabled) generateQuestionGrid(12);
        loadBireyselTestAnalizi();
        alert("Günlük testiniz kaydedildi!");
    } catch(err) { alert("Test kaydedilemedi!"); }
});

// DENEME GİRİŞİ (D/Y)
document.getElementById('deneme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const denemeAdi = document.getElementById('deneme-adi').value;
    const denemeTuru = document.getElementById('deneme-turu').value;
    const obpInput = document.getElementById('ogrenci-obp').value;
    let obpPuani = obpInput ? (parseFloat(obpInput) <= 100 ? parseFloat(obpInput) * 5 : parseFloat(obpInput)) : 0;

    const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;
    const tytPuan = (parseNet('tyt-turkce')*3.3) + (parseNet('tyt-sosyal')*3.4) + (parseNet('tyt-mat')*3.3) + (parseNet('tyt-fen')*3.4) + 100;
    
    let toplamNet = parseNet('tyt-turkce') + parseNet('tyt-sosyal') + parseNet('tyt-mat') + parseNet('tyt-fen');
    let altNetler = { "TYT Türkçe": parseNet('tyt-turkce'), "TYT Sosyal": parseNet('tyt-sosyal'), "TYT Matematik": parseNet('tyt-mat'), "TYT Fen": parseNet('tyt-fen') };
    let ham = `${tytPuan.toFixed(2)} TYT`, yerl = obpPuani > 0 ? `${(tytPuan + (obpPuani * 0.12)).toFixed(2)} Y-TYT` : "-";

    if(denemeTuru === "SAY") {
        toplamNet += parseNet('ayt-mat') + parseNet('ayt-fizik') + parseNet('ayt-kimya') + parseNet('ayt-biyo');
        altNetler["AYT Matematik"] = parseNet('ayt-mat'); altNetler["AYT Fizik"] = parseNet('ayt-fizik'); altNetler["AYT Kimya"] = parseNet('ayt-kimya'); altNetler["AYT Biyoloji"] = parseNet('ayt-biyo');
        let p = (tytPuan*0.4) + (parseNet('ayt-mat')*3) + (parseNet('ayt-fizik')*2.8) + (parseNet('ayt-kimya')*2.8) + (parseNet('ayt-biyo')*2.8) + 100;
        ham = `${p.toFixed(2)} SAY`; yerl = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-SAY` : "-";
    } else if(denemeTuru === "EA") {
        toplamNet += parseNet('ayt-mat') + parseNet('ayt-tde') + parseNet('ayt-tar1') + parseNet('ayt-cog1');
        altNetler["AYT Matematik"] = parseNet('ayt-mat'); altNetler["AYT TDE"] = parseNet('ayt-tde'); altNetler["AYT Tarih-1"] = parseNet('ayt-tar1'); altNetler["AYT Coğrafya-1"] = parseNet('ayt-cog1');
        let p = (tytPuan*0.4) + (parseNet('ayt-mat')*3) + (parseNet('ayt-tde')*3) + (parseNet('ayt-tar1')*2.8) + (parseNet('ayt-cog1')*2.8) + 100;
        ham = `${p.toFixed(2)} EA`; yerl = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-EA` : "-";
    }

    try {
        await addDoc(collection(db, "Denemeler"), { denemeAdi, denemeTuru, toplamNet: toplamNet.toFixed(2), altNetler, hamPuanStr: ham, yerlestirmePuanStr: yerl, tarih: serverTimestamp() });
        document.getElementById('deneme-form').reset(); bootstrap.Modal.getInstance(document.getElementById('denemeModal')).hide(); loadDenemeler();
    } catch(err) {}
});

async function loadDenemeler() {
    const tbody = document.getElementById('deneme-list-table');
    const snap = await getDocs(query(collection(db, "Denemeler"), orderBy("tarih", "desc")));
    tbody.innerHTML = "";
    if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>Veri yok.</td></tr>"; return; }
    
    let isFirst = true;
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if(isFirst) { sonDenemeVerisi = d.altNetler; isFirst = false; }
        let rozetler = "";
        for(const [ders, net] of Object.entries(d.altNetler)) rozetler += `<span class="badge bg-light text-dark border deneme-badge">${ders}: <strong>${net}</strong></span> `;
        tbody.innerHTML += `<tr><td class="fw-bold align-middle">${d.denemeAdi}<br><span class="badge bg-secondary mt-1">${d.denemeTuru}</span></td><td class="align-middle text-start">${rozetler}</td><td class="align-middle"><span class="badge bg-primary fs-6">${d.toplamNet}</span></td><td class="align-middle fw-bold text-primary">${d.hamPuanStr || '-'}</td><td class="align-middle fw-bold text-success">${d.yerlestirmePuanStr || '-'}</td></tr>`;
    });
}

// ÖDEV ATAMA & LİSTELEME
document.getElementById('assignment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await addDoc(collection(db, "Assignments"), { 
            ders: document.getElementById('assignment-ders').value, kitap: document.getElementById('assignment-kitap').value,
            konu: document.getElementById('assignment-konu-input').value, tarih: document.getElementById('assignment-date').value, durum: "Bekliyor", atanmaTarihi: serverTimestamp()
        });
        document.getElementById('assignment-form').reset(); loadAssignments(); alert("Ödev Atandı!");
    } catch(err) {}
});

async function loadAssignments() {
    const teachList = document.getElementById('teacher-assignment-list');
    const studList = document.getElementById('student-assignment-list');
    const snap = await getDocs(collection(db, "Assignments"));
    if(teachList) teachList.innerHTML = ""; if(studList) studList.innerHTML = "";
    if(snap.empty) {
        if(teachList) teachList.innerHTML = "<li class='list-group-item text-muted'>Atanmış ödev yok.</li>";
        if(studList) studList.innerHTML = "<li class='list-group-item text-muted'>Aktif ödeviniz yok.</li>"; return;
    }
    snap.forEach(docSnap => {
        const d = docSnap.data();
        if(teachList) teachList.innerHTML += `<li class='list-group-item d-flex justify-content-between align-items-center bg-light'><div><strong>${d.ders}</strong> - ${d.konu}<br><small>${d.kitap} | Son Tarih: ${d.tarih}</small></div><span class='badge bg-warning text-dark'>${d.durum}</span></li>`;
        if(studList) studList.innerHTML += `<li class='list-group-item d-flex justify-content-between align-items-center'><div><strong>${d.ders}</strong> - ${d.konu}<br><small>${d.kitap} | Son Tarih: ${d.tarih}</small></div><button class='btn btn-sm btn-outline-success'>Tamamla</button></li>`;
    });
}

// YÖK ATLAS HEDEF KARŞILAŞTIRMA
window.hedefKarsilastir = function() {
    const secim = document.getElementById('hedef-program-select').value;
    const tbody = document.getElementById('karsilastirma-body');
    if (!secim || !sonDenemeVerisi) return alert("Lütfen hedef seçin ve en az 1 deneme girdiğinizden emin olun.");
    const ref = yokAtlasReferanslari[secim];
    document.getElementById('ref-yil-turu').innerText = `${ref.yil} - ${ref.puanTuru}`;
    document.getElementById('ref-katsayi').innerText = ref.katsayi; document.getElementById('ref-obp').innerText = ref.obp;
    document.getElementById('referans-bilgi-alani').classList.remove('d-none'); document.getElementById('karsilastirma-container').classList.remove('d-none');
    tbody.innerHTML = "";
    for (const [ders, refNet] of Object.entries(ref.netler)) {
        const ogrenciNet = sonDenemeVerisi.hasOwnProperty(ders) ? sonDenemeVerisi[ders] : null; 
        let fark = ogrenciNet !== null ? (ogrenciNet - refNet).toFixed(2) : null;
        let durum = fark === null ? `<span class="badge bg-secondary">Tıraş/Null</span>` : (fark >= 0 ? `<span class="badge bg-success">+${fark}</span>` : `<span class="badge bg-danger">${fark}</span>`);
        tbody.innerHTML += `<tr><td class="fw-bold">${ders}</td><td>${ogrenciNet !== null ? ogrenciNet : '-'}</td><td>${refNet}</td><td>${durum}</td></tr>`;
    }
}

// ZAYIF KONU & GRAFİK ANALİZİ
async function loadBireyselTestAnalizi() {
    const list = document.getElementById('zayif-konular-listesi');
    const snap = await getDocs(collection(db, "TestEntries"));
    let konuStat = {}, labels = [], data = [];
    if(snap.empty) { if(list) list.innerHTML = "<li class='list-group-item text-muted'>Veri yok.</li>"; return; }
    
    let count = 1;
    snap.forEach(d => {
        const t = d.data(); labels.push(`Test ${count++}`); data.push(t.net);
        const toplamSoru = (t.dogru||0) + (t.yanlis||0) + (t.bos||0);
        if(!konuStat[t.konu]) konuStat[t.konu] = { d:0, t:0 };
        konuStat[t.konu].d += t.dogru||0; konuStat[t.konu].t += toplamSoru;
    });
    
    if(list) {
        list.innerHTML = "";
        for(const [k, s] of Object.entries(konuStat)) {
            const oran = Math.round((s.d / s.t) * 100);
            if(oran < 65) list.innerHTML += `<li class="list-group-item d-flex justify-content-between"><strong>${k}</strong> <span class="badge bg-danger">%${oran} Başarı</span></li>`;
        }
    }
    
    const ctx = document.getElementById('netChart');
    if(ctx) {
        if(myChart) myChart.destroy();
        myChart = new Chart(ctx.getContext('2d'), { type: 'line', data: { labels, datasets: [{ label: 'Bireysel Net Grafiği', data, borderColor: 'blue', fill: true }] } });
    }
}

// ADMIN İŞLEMLERİ
window.tumTestVerileriniSil = async function() {
    document.getElementById('confirm-delete-btn').innerText = "Siliniyor...";
    try {
        for(let col of ["TestEntries", "Denemeler", "Assignments"]) {
            const s = await getDocs(collection(db, col));
            await Promise.all(s.docs.map(docSnap => deleteDoc(doc(db, col, docSnap.id))));
        }
        alert("Sıfırlandı!"); location.reload();
    } catch(e) {}
}

document.getElementById('admin-duyuru-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await setDoc(doc(db, "Settings", "Duyuru"), { metin: document.getElementById('admin-duyuru-input').value });
    alert("Yayınlandı!"); loadDuyuru();
});

async function loadDuyuru() {
    const s = await getDoc(doc(db, "Settings", "Duyuru"));
    if(s.exists() && s.data().metin) {
        document.getElementById('duyuru-banner').classList.remove('d-none');
        document.getElementById('duyuru-text').innerText = s.data().metin;
    }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault(); signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value).catch(() => document.getElementById('error-msg').classList.remove('d-none'));
});
document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth).then(() => location.reload()); });