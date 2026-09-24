import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

let currentUserRole = "";
let isStudentDetailedMode = false;
let isMatrixInputEnabled = true;
let mainGridState = [];
let myChart = null;

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
        if(yeniDenemeBtn) yeniDenemeBtn.classList.remove('d-none');
    } 
    else if (role === "Öğretmen" || role === "Koç" || role === "Ogretmen") {
        teachPnl.classList.remove('d-none'); analizPnl.classList.remove('d-none');
        if(yeniDenemeBtn) yeniDenemeBtn.classList.add('d-none'); 
    } 
    else if (role === "Veli") {
        analizPnl.classList.remove('d-none'); studAssignPnl.classList.remove('d-none');
        if(yeniDenemeBtn) yeniDenemeBtn.classList.add('d-none');
    } 
    else {
        studPnl.classList.remove('d-none'); studAssignPnl.classList.remove('d-none');
        if(yeniDenemeBtn) yeniDenemeBtn.classList.remove('d-none');
        document.getElementById('motivation-banner').classList.remove('d-none');
        if (isStudentDetailedMode) analizPnl.classList.remove('d-none');
        generateQuestionGrid(12);
    }
}

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

// DENEME KAYIT (Hızlı Net veya Detaylı D/Y Seçimine Göre Çalışır, Küsürat Korunur, OBP Şeffaf Gösterilir)
document.getElementById('deneme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const denemeAdi = document.getElementById('deneme-adi').value.trim();
    const denemeTuru = document.getElementById('deneme-turu').value;
    const isHizli = document.getElementById('hizli-net-switch').checked;

    let ogrenciObpInput = document.getElementById('ogrenci-obp').value;
    let obpPuani = 0;
    if (ogrenciObpInput) {
        let val = parseFloat(ogrenciObpInput);
        obpPuani = val <= 100 ? val * 5 : val; 
    }

    let tytTurkce = 0, tytSosyal = 0, tytMat = 0, tytFen = 0;
    let altNetler = {};

    if (isHizli) {
        tytTurkce = parseFloat(document.getElementById('hizli-turkce').value) || 0;
        tytSosyal = parseFloat(document.getElementById('hizli-sosyal').value) || 0;
        tytMat = parseFloat(document.getElementById('hizli-mat').value) || 0;
        tytFen = parseFloat(document.getElementById('hizli-fen').value) || 0;
    } else {
        const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;
        tytTurkce = parseNet('tyt-turkce');
        tytSosyal = parseNet('tyt-sosyal');
        tytMat = parseNet('tyt-mat');
        tytFen = parseNet('tyt-fen');
    }

    let toplamNet = tytTurkce + tytSosyal + tytMat + tytFen;
    altNetler = { "TYT Türkçe": tytTurkce, "TYT Sosyal": tytSosyal, "TYT Matematik": tytMat, "TYT Fen": tytFen };

    const tytPuan = (tytTurkce * 3.3) + (tytSosyal * 3.4) + (tytMat * 3.3) + (tytFen * 3.4) + 100;
    let hamPuanStr = `${tytPuan.toFixed(2)} TYT`;
    
    let yerlestirmePuanStr = obpPuani > 0 
        ? `${(t => t.toFixed(2))(tytPuan + (obpPuani * 0.12))} Y-TYT <br><small class="text-muted">(OBP: ${obpPuani})</small>` 
        : `Hesaplanamadı <br><small class="text-muted">(OBP Girilmedi)</small>`;

    if (denemeTuru === "SAY") {
        let mat = 0, fiz = 0, kim = 0, biy = 0;
        if (isHizli) {
            mat = parseFloat(document.getElementById('hizli-ayt-mat').value) || 0;
            fiz = parseFloat(document.getElementById('hizli-ayt-fizik').value) || 0;
            kim = parseFloat(document.getElementById('hizli-ayt-kimya').value) || 0;
            biy = parseFloat(document.getElementById('hizli-ayt-biyo').value) || 0;
        } else {
            const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;
            mat = parseNet('ayt-mat'); fiz = parseNet('ayt-fizik'); kim = parseNet('ayt-kimya'); biy = parseNet('ayt-biyo');
        }
        toplamNet += (mat + fiz + kim + biy);
        altNetler["AYT Matematik"] = mat; altNetler["AYT Fizik"] = fiz; altNetler["AYT Kimya"] = kim; altNetler["AYT Biyoloji"] = biy;
        let p = (tytPuan * 0.4) + (mat * 3.0) + (fiz * 2.8) + (kim * 2.8) + (biy * 2.8) + 100;
        hamPuanStr = `${p.toFixed(2)} SAY`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(t => t.toFixed(2))(p + (obpPuani * 0.12))} Y-SAY <br><small class="text-muted">(OBP: ${obpPuani})</small>` : "Hesaplanamadı";

    } else if (denemeTuru === "EA") {
        let mat = 0, tde = 0, tar1 = 0, cog1 = 0;
        if (isHizli) {
            mat = parseFloat(document.getElementById('hizli-ayt-mat').value) || 0;
            tde = parseFloat(document.getElementById('hizli-ayt-tde').value) || 0;
            tar1 = parseFloat(document.getElementById('hizli-ayt-tar1').value) || 0;
            cog1 = parseFloat(document.getElementById('hizli-ayt-cog1').value) || 0;
        } else {
            const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;
            mat = parseNet('ayt-mat'); tde = parseNet('ayt-tde'); tar1 = parseNet('ayt-tar1'); cog1 = parseNet('ayt-cog1');
        }
        toplamNet += (mat + tde + tar1 + cog1);
        altNetler["AYT Matematik"] = mat; altNetler["AYT TDE"] = tde; altNetler["AYT Tarih-1"] = tar1; altNetler["AYT Coğrafya-1"] = cog1;
        let p = (tytPuan * 0.4) + (mat * 3.0) + (tde * 3.0) + (tar1 * 2.8) + (cog1 * 2.8) + 100;
        hamPuanStr = `${p.toFixed(2)} EA`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(t => t.toFixed(2))(p + (obpPuani * 0.12))} Y-EA <br><small class="text-muted">(OBP: ${obpPuani})</small>` : "Hesaplanamadı";
    }

    try {
        await addDoc(collection(db, "Denemeler"), {
            denemeAdi, denemeTuru, toplamNet: toplamNet.toFixed(2), altNetler, hamPuanStr, yerlestirmePuanStr, obpPuani, tarih: serverTimestamp()
        });
        document.getElementById('deneme-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('denemeModal')).hide();
        loadDenemeler();
    } catch(err) { alert("Kaydedilemedi."); }
});

async function loadDenemeler() {
    const tbody = document.getElementById('deneme-list-table');
    try {
        const q = query(collection(db, "Denemeler"), orderBy("tarih", "desc"));
        const snap = await getDocs(q);
        tbody.innerHTML = "";
        
        if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>Henüz sınav girilmedi.</td></tr>"; return; }
        
        snap.forEach(docSnap => {
            const d = docSnap.data();
            let rozetler = "";
            for (const [ders, net] of Object.entries(d.altNetler)) {
                rozetler += `<span class="badge bg-light text-dark border deneme-badge">${ders}: <strong>${net}</strong></span> `;
            }
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold align-middle">${d.denemeAdi}<br><span class="badge bg-secondary mt-1">${d.denemeTuru}</span></td>
                    <td class="align-middle text-start">${rozetler}</td>
                    <td class="align-middle"><span class="badge bg-primary fs-6">${d.toplamNet}</span></td>
                    <td class="align-middle text-primary fw-bold">${d.hamPuanStr || 'Hesaplanamadı'}</td>
                    <td class="align-middle text-success fw-bold">${d.yerlestirmePuanStr || 'Hesaplanamadı'}</td>
                </tr>`;
        });
    } catch(e) {}
}

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