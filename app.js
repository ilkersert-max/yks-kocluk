import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, updatePassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M",
    authDomain: "tayt-bbbbe.firebaseapp.com",
    projectId: "tayt-bbbbe",
    storageBucket: "tayt-bbbbe.firebasestorage.app",
    messagingSenderId: "367442443596",
    appId: "1:367442443596:web:be954f464173e2abe5e3e9",
    measurementId: "G-NVXGR7ZP1Q"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elementleri
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const loginForm = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');
const welcomeText = document.getElementById('welcome-text');
const roleText = document.getElementById('role-text');
const logoutBtn = document.getElementById('logout-btn');

const studentPanel = document.getElementById('student-panel');
const teacherAssignPanel = document.getElementById('teacher-assign-panel');
const studentAssignmentCard = document.getElementById('student-assignment-card');
const adminPanel = document.getElementById('admin-panel');
const testEntryForm = document.getElementById('test-entry-form');
const assignmentForm = document.getElementById('assignment-form');
const saveSuccess = document.getElementById('save-success');

const matrixInputSection = document.getElementById('matrix-input-section');
const manualInputSection = document.getElementById('manual-input-section');

const denemeForm = document.getElementById('deneme-form');
const adminDuyuruInput = document.getElementById('admin-duyuru-input');
const duyuruBanner = document.getElementById('duyuru-banner');
const duyuruText = document.getElementById('duyuru-text');

const konuMatrisiCard = document.getElementById('konu-matrisi-card');
const grafikCard = document.getElementById('grafik-card');
const motivationBanner = document.getElementById('motivation-banner');
const motivationText = document.getElementById('motivation-text');

// Admin Switch Elementleri
const studentModeSwitch = document.getElementById('student-mode-switch');
const veliAssignSwitch = document.getElementById('veli-assign-switch');
const matrixInputSwitch = document.getElementById('matrix-input-switch');
const matrisSwitch = document.getElementById('matris-switch');

let myChart = null;
let currentUserRole = "";

let isStudentDetailedMode = false;
let isVeliAssignAllowed = false;
let isMatrixInputEnabled = true;
let isMatrisVisible = false;

// Soru Izgarası Veri Durumu
let mainGridState = [];
let modalGridState = [];

const defaultBooks = [
    { name: "ÜçDörtBeş TYT Türkçe Soru Bankası", sinav: "TYT", ders: "Türkçe" },
    { name: "Bilgi Sarmal TYT Paragraf", sinav: "TYT", ders: "Türkçe" },
    { name: "3D TYT Türkçe Soru Bankası", sinav: "TYT", ders: "Türkçe" },
    { name: "ÜçDörtBeş TYT Matematik Soru Bankası", sinav: "TYT", ders: "Matematik" },
    { name: "AllStar TYT Matematik Soru Bankası", sinav: "TYT", ders: "Matematik" },
    { name: "3D TYT Matematik Soru Bankası", sinav: "TYT", ders: "Matematik" },
    { name: "ÜçDörtBeş AYT Matematik Soru Bankası", sinav: "AYT", ders: "Matematik" },
    { name: "AllStar AYT Matematik Soru Bankası", sinav: "AYT", ders: "Matematik" },
    { name: "3D TYT Geometri Soru Bankası", sinav: "TYT", ders: "Geometri" },
    { name: "3D AYT Geometri Soru Bankası", sinav: "AYT", ders: "Geometri" },
    { name: "ÜçDörtBeş TYT Fizik Soru Bankası", sinav: "TYT", ders: "Fizik" },
    { name: "AllStar TYT Fizik Soru Bankası", sinav: "TYT", ders: "Fizik" },
    { name: "ÜçDörtBeş AYT Fizik Soru Bankası", sinav: "AYT", ders: "Fizik" },
    { name: "ÜçDörtBeş TYT Kimya Soru Bankası", sinav: "TYT", ders: "Kimya" },
    { name: "ÜçDörtBeş AYT Kimya Soru Bankası", sinav: "AYT", ders: "Kimya" },
    { name: "ÜçDörtBeş TYT Biyoloji Soru Bankası", sinav: "TYT", ders: "Biyoloji" },
    { name: "ÜçDörtBeş AYT Biyoloji Soru Bankası", sinav: "AYT", ders: "Biyoloji" },
    { name: "Apotemi TYT Tarih Soru Bankası", sinav: "TYT", ders: "Tarih" },
    { name: "Bilgi Sarmal TYT Coğrafya", sinav: "TYT", ders: "Coğrafya" },
    { name: "Modadil YDT İngilizce Soru Bankası", sinav: "YDT", ders: "İngilizce" }
];

const motivationQuotes = [
    "🚀 Gelecek, bugün ne yaptığına bağlıdır. Hayallerin için bir adım daha at!",
    "🔥 Şampiyonlar salonda değil, içlerindeki tutkuda üretilir. Çalışmaya devam!",
    "🎯 Yapabileceğinize inandığınızda, yolun yarısını zaten tamamlamış olursunuz.",
    "⭐ Büyük başarılar, küçük adımların istikrarlı toplamıdır. Bugün de başardın!",
    "🏆 Derece yapanlar hiç yorulmayanlar değil, pes etmeyenlerdir!",
    "💡 Zorluklar, başarının değerini artıran süslerdir. İnançla devam et!"
];

window.playClapSound = function() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const bufferSize = ctx.sampleRate * 0.08;
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let j = 0; j < bufferSize; j++) { data[j] = Math.random() * 2 - 1; }
                const noise = ctx.createBufferSource(); noise.buffer = buffer;
                const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 1000 + Math.random() * 800;
                const gain = ctx.createGain(); gain.gain.setValueAtTime(0.3, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
                noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
                noise.start();
            }, i * (60 + Math.random() * 40));
        }
    } catch(e) {}
}

window.generateQuestionGrid = function(count) {
    const container = document.getElementById('question-grid-container');
    if (!container) return;
    const total = parseInt(count) || 12;
    mainGridState = [];
    container.innerHTML = "";
    for (let i = 1; i <= total; i++) {
        mainGridState.push({ no: i, status: 'D' });
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-success grid-btn';
        btn.id = `q-btn-${i}`;
        btn.innerText = `${i}: D`;
        btn.onclick = () => toggleQuestionStatus(i, 'main');
        container.appendChild(btn);
    }
    updateGridStats('main');
}

window.generateModalGrid = function(count) {
    const container = document.getElementById('modal-grid-container');
    if (!container) return;
    const total = parseInt(count) || 12;
    modalGridState = [];
    container.innerHTML = "";
    for (let i = 1; i <= total; i++) {
        modalGridState.push({ no: i, status: 'D' });
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-success grid-btn';
        btn.id = `m-q-btn-${i}`;
        btn.innerText = `${i}: D`;
        btn.onclick = () => toggleQuestionStatus(i, 'modal');
        container.appendChild(btn);
    }
    updateGridStats('modal');
}

function toggleQuestionStatus(qNo, target) {
    let state = target === 'main' ? mainGridState : modalGridState;
    let btnPrefix = target === 'main' ? 'q-btn-' : 'm-q-btn-';
    let qObj = state.find(q => q.no === qNo);
    if (!qObj) return;
    const btn = document.getElementById(`${btnPrefix}${qNo}`);
    
    if (qObj.status === 'D') {
        qObj.status = 'Y';
        btn.className = 'btn btn-danger grid-btn';
        btn.innerText = `${qNo}: Y`;
    } else if (qObj.status === 'Y') {
        qObj.status = 'B';
        btn.className = 'btn btn-warning text-dark grid-btn';
        btn.innerText = `${qNo}: B`;
    } else {
        qObj.status = 'D';
        btn.className = 'btn btn-success grid-btn';
        btn.innerText = `${qNo}: D`;
    }
    updateGridStats(target);
}

function updateGridStats(target) {
    let state = target === 'main' ? mainGridState : modalGridState;
    let d = state.filter(q => q.status === 'D').length;
    let y = state.filter(q => q.status === 'Y').length;
    let b = state.filter(q => q.status === 'B').length;
    let net = (d - (y / 4)).toFixed(2);

    if (target === 'main') {
        document.getElementById('stat-d').innerText = d;
        document.getElementById('stat-y').innerText = y;
        document.getElementById('stat-b').innerText = b;
        document.getElementById('stat-net').innerText = net;
    } else {
        document.getElementById('m-stat-d').innerText = d;
        document.getElementById('m-stat-y').innerText = y;
        document.getElementById('m-stat-b').innerText = b;
        document.getElementById('m-stat-net').innerText = net;
    }
}

if(testEntryForm) {
    testEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ders = document.getElementById('ders').value;
        const selectBook = document.getElementById('kaynak-kitap-select').value;
        const customBook = document.getElementById('kaynak-kitap-custom').value.trim();
        let kaynakKitap = selectBook === "__YENI_KITAP__" ? customBook : selectBook;
        const konu = document.getElementById('konu').value.trim();

        let dogru, yanlis, bos, net, sure, yanlisSorular = [], bosSorular = [];

        if (isMatrixInputEnabled) {
            sure = parseInt(document.getElementById('sure').value) || 0;
            if(!sure) { alert("Lütfen süreyi giriniz."); return; }
            dogru = mainGridState.filter(q => q.status === 'D').length;
            yanlis = mainGridState.filter(q => q.status === 'Y').length;
            bos = mainGridState.filter(q => q.status === 'B').length;
            yanlisSorular = mainGridState.filter(q => q.status === 'Y').map(q => q.no);
            bosSorular = mainGridState.filter(q => q.status === 'B').map(q => q.no);
        } else {
            dogru = parseInt(document.getElementById('dogru').value) || 0;
            yanlis = parseInt(document.getElementById('yanlis').value) || 0;
            bos = parseInt(document.getElementById('bos').value) || 0;
            sure = parseInt(document.getElementById('manual-sure').value) || 0;
        }

        net = parseFloat((dogru - (yanlis / 4)).toFixed(2));
        const toplamSoru = isMatrixInputEnabled ? mainGridState.length : (dogru + yanlis + bos);

        const user = auth.currentUser;
        if(user && kaynakKitap) {
            try {
                await addDoc(collection(db, "TestEntries"), {
                    userId: user.uid, ders, kaynakKitap, konu, 
                    toplamSoru, dogru, yanlis, bos, net, sure,
                    yanlisSorular, bosSorular, 
                    isOdev: false,
                    tarih: serverTimestamp()
                });
                
                await addNewBookIfNotExist(kaynakKitap, 'TYT', ders);
                testEntryForm.reset();
                document.getElementById('kaynak-kitap-custom').classList.add('d-none');
                if(isMatrixInputEnabled) generateQuestionGrid(12);

                if(saveSuccess) saveSuccess.classList.remove('d-none');
                setTimeout(() => { if(saveSuccess) saveSuccess.classList.add('d-none'); }, 3000);
                
                loadStudentTests();
                loadKonuMatrisiAndAnaliz();
                loadStudentSelfTestsHistory();
            } catch (error) { alert("Test kaydedilemedi!"); }
        }
    });
}

window.openSolveModal = function(assignmentId, sinav, ders, kaynak, konu) {
    document.getElementById('modal-assignment-id').value = assignmentId;
    document.getElementById('modal-assignment-title').innerText = `${sinav} - ${ders}: ${kaynak}`;
    document.getElementById('modal-assignment-sub').innerText = `Konu/Sayfa: ${konu}`;
    generateModalGrid(12);
    const modalEl = document.getElementById('solveAssignmentModal');
    if (modalEl) { const modal = new bootstrap.Modal(modalEl); modal.show(); }
}

window.submitAssignmentResult = async function() {
    const assignmentId = document.getElementById('modal-assignment-id').value;
    const sure = parseInt(document.getElementById('modal-sure').value) || 0;
    if (!sure) { alert("Lütfen harcadığınız süreyi giriniz!"); return; }

    let dogru = modalGridState.filter(q => q.status === 'D').length;
    let yanlis = modalGridState.filter(q => q.status === 'Y').length;
    let bos = modalGridState.filter(q => q.status === 'B').length;
    let net = parseFloat((dogru - (yanlis / 4)).toFixed(2));
    let yanlisSorular = modalGridState.filter(q => q.status === 'Y').map(q => q.no);
    let bosSorular = modalGridState.filter(q => q.status === 'B').map(q => q.no);
    let toplamSoru = modalGridState.length;

    try {
        await updateDoc(doc(db, "Assignments", assignmentId), {
            durum: "Tamamlandı",
            toplamSoru, dogru, yanlis, bos, net, sure,
            yanlisSorular, bosSorular,
            tamamlanmaTarihi: serverTimestamp()
        });

        const user = auth.currentUser;
        if (user) {
            const assignSnap = await getDoc(doc(db, "Assignments", assignmentId));
            if(assignSnap.exists()) {
                const assignData = assignSnap.data();
                await addDoc(collection(db, "TestEntries"), {
                    userId: user.uid, ders: assignData.ders, kaynakKitap: assignData.kaynak, konu: assignData.konu, 
                    toplamSoru, dogru, yanlis, bos, net, sure,
                    yanlisSorular, bosSorular, 
                    isOdev: true,
                    tarih: serverTimestamp()
                });
            }
        }

        alert("Harika! Ödev sonucun kaydedildi ve tamamlandı! 👏");
        const modalEl = document.getElementById('solveAssignmentModal');
        if (modalEl) { const modal = bootstrap.Modal.getInstance(modalEl); if (modal) modal.hide(); }

        loadAssignments();
        loadStudentTests();
        loadKonuMatrisiAndAnaliz();
        loadStudentSelfTestsHistory();
    } catch(e) { alert("Ödev sonucu kaydedilirken hata oluştu!"); }
}

if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sinav = document.getElementById('assignment-sinav').value;
        const ders = document.getElementById('assignment-ders').value;
        const kaynak = document.getElementById('assignment-kitap-select').value;
        const konu = document.getElementById('assignment-konu-input').value.trim();
        const tarih = document.getElementById('assignment-date').value;
        try {
            await addDoc(collection(db, "Assignments"), {
                sinav, ders, kaynak, konu, tarih, durum: "Bekliyor", atanmaTarihi: serverTimestamp()
            });
            alert("Ödev öğrenciye başarıyla atandı!");
            assignmentForm.reset();
            loadAssignments();
        } catch(error) { alert("Ödev atanırken hata oluştu!"); }
    });
}

async function loadAssignments() {
    const teacherListEl = document.getElementById('teacher-assignment-list');
    const studentListEl = document.getElementById('student-assignment-list');

    try {
        const querySnapshot = await getDocs(collection(db, "Assignments"));
        if (teacherListEl) teacherListEl.innerHTML = "";
        if (studentListEl) studentListEl.innerHTML = "";

        if (querySnapshot.empty) {
            if (teacherListEl) teacherListEl.innerHTML = "<li class='list-group-item text-muted py-3'>Henüz öğrenciye atanmış ödev yok.</li>";
            if (studentListEl) studentListEl.innerHTML = "<li class='list-group-item text-muted py-3'>Atanmış aktif ödeviniz bulunmuyor. 🎉</li>";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;
            const isTamamlandi = data.durum === "Tamamlandı";
            const badgeClass = isTamamlandi ? "bg-success" : "bg-warning text-dark";

            let performansDetayi = "";
            if (isTamamlandi && data.toplamSoru) {
                const hasYanlis = data.yanlisSorular && data.yanlisSorular.length > 0;
                const hasBos = data.bosSorular && data.bosSorular.length > 0;

                let detayMetni = "";

                if (!hasYanlis && !hasBos) {
                    detayMetni = `<br><span class="text-success fw-bold">🌟 Tebrikler! Sıfır Hata, Kusursuz Test! 🎯 Toplam ${data.toplamSoru} Soruda Yanlış ve Boş Yok! 👏🥳🎉</span>`;
                } else {
                    if (hasYanlis) {
                        let etiket = data.yanlisSorular.length > 1 ? "❌ Yanlış Yapılanlar:" : "❌ Yanlış Yapılan:";
                        let liste = data.yanlisSorular.map(s => `Soru ${s}`).join(', ');
                        detayMetni += `<br><span class="text-danger fw-bold">${etiket} ${liste}</span>`;
                    } else {
                        detayMetni += `<br><span class="text-success small">👏 Yanlış Yapılan Soru Yok! 😊</span>`;
                    }

                    if (hasBos) {
                        let etiket = data.bosSorular.length > 1 ? "⚠️ Boş Bırakılanlar:" : "⚠️ Boş Bırakılan:";
                        let liste = data.bosSorular.map(s => `Soru ${s}`).join(', ');
                        detayMetni += `<br><span class="text-warning text-dark fw-bold">${etiket} ${liste}</span>`;
                    } else {
                        detayMetni += `<br><span class="text-success small">👏 Boş Bırakılan Soru Yok! 😊</span>`;
                    }
                }

                performansDetayi = `<div class="mt-2 p-2 bg-white rounded border border-success small">
                                        📊 <strong>Sonuç:</strong> ${data.toplamSoru} Soru | <span class="text-success">${data.dogru}D</span> <span class="text-danger">${data.yanlis}Y</span> <span class="text-warning text-dark">${data.bos}B</span> | <strong>${data.net} Net</strong> | Süre: ${data.sure} Dk
                                        ${detayMetni}
                                    </div>`;
            }

            if (teacherListEl) {
                teacherListEl.innerHTML += `
                    <li class='list-group-item d-flex justify-content-between align-items-center py-3 bg-light'>
                        <div class="w-75">
                            <span class="badge bg-primary me-2">${data.sinav || 'TYT'}</span>
                            <strong class="text-dark">${data.ders}</strong> - ${data.kaynak}
                            <br><small class='text-muted'>Konu/Sayfa: ${data.konu} | Son Teslim: ${data.tarih}</small>
                            ${performansDetayi}
                        </div>
                        <div class="text-end">
                            <span class='badge ${badgeClass} fs-6 mb-2 d-block'>${data.durum}</span>
                            <button class="btn btn-sm btn-outline-danger w-100" onclick="deleteAssignment('${id}')">Sil</button>
                        </div>
                    </li>`;
            }

            if (studentListEl) {
                studentListEl.innerHTML += `
                    <li class='list-group-item d-flex justify-content-between align-items-center py-3'>
                        <div>
                            <span class="badge bg-primary me-2">${data.sinav || 'TYT'}</span>
                            <strong class="text-dark">${data.ders}</strong> - ${data.kaynak}
                            <br><small class='text-muted'>Konu: ${data.konu} | Son Tarih: ${data.tarih}</small>
                        </div>
                        <div>
                            ${isTamamlandi 
                                ? `<span class="badge bg-success fs-6">✅ Tamamlandı</span>` 
                                : `<button class="btn btn-sm btn-success fw-bold" onclick="openSolveModal('${id}', '${data.sinav}', '${data.ders}', '${data.kaynak}', '${data.konu}')">📝 Ödevi Çöz & Sonuç Gir</button>`}
                        </div>
                    </li>`;
            }
        });
    } catch (error) {}
}

window.deleteAssignment = async function(assignmentId) {
    if (confirm("Bu ödevi silmek istediğinize emin misiniz?")) {
        try {
            await deleteDoc(doc(db, "Assignments", assignmentId));
            loadAssignments();
        } catch(e) {}
    }
}

async function loadStudentSelfTestsHistory() {
    const tbody = document.getElementById('teacher-test-history-list');
    if(!tbody) return;

    try {
        const snap = await getDocs(collection(db, "TestEntries"));
        if (snap.empty) {
            tbody.innerHTML = "<tr><td colspan='7' class='text-muted py-3'>Öğrenci henüz sisteme test girmemiş.</td></tr>";
            return;
        }

        let tests = [];
        snap.forEach(d => tests.push(d.data()));

        tests.sort((a,b) => {
            let ta = a.tarih ? a.tarih.toMillis() : 0;
            let tb = b.tarih ? b.tarih.toMillis() : 0;
            return tb - ta;
        });

        let recentTests = tests.slice(0, 15);
        tbody.innerHTML = "";

        recentTests.forEach(t => {
            let dateStr = t.tarih ? new Date(t.tarih.toDate()).toLocaleDateString('tr-TR') : '-';
            
            let yStr = (t.yanlisSorular && t.yanlisSorular.length > 0) 
                ? t.yanlisSorular.map(s => `Soru ${s}`).join(', ') 
                : '👏 Yok 😊';
                
            let bStr = (t.bosSorular && t.bosSorular.length > 0) 
                ? t.bosSorular.map(s => `Soru ${s}`).join(', ') 
                : '👏 Yok 😊';

            if ((!t.yanlisSorular || t.yanlisSorular.length === 0) && (!t.bosSorular || t.bosSorular.length === 0)) {
                yStr = '🌟 Kusursuz';
                bStr = '🌟 Kusursuz';
            }

            let odevBadge = t.isOdev ? `<br><span class="badge bg-info mt-1">Ödevden</span>` : `<br><span class="badge bg-secondary mt-1">Bireysel</span>`;

            tbody.innerHTML += `
                <tr>
                    <td class="align-middle"><small>${dateStr}</small>${odevBadge}</td>
                    <td class="align-middle text-start"><strong>${t.ders}</strong><br><small class="text-muted">${t.konu}</small></td>
                    <td class="align-middle"><small>${t.kaynakKitap}</small></td>
                    <td class="align-middle">
                        <span class="text-success fw-bold">${t.dogru || 0}D</span> 
                        <span class="text-danger fw-bold">${t.yanlis || 0}Y</span> 
                        <span class="text-warning text-dark fw-bold">${t.bos || 0}B</span>
                        <br><strong class="text-primary">${t.net || 0} Net</strong>
                    </td>
                    <td class="align-middle">${t.sure || 0} Dk</td>
                    <td class="align-middle text-danger fw-bold small">${yStr}</td>
                    <td class="align-middle text-warning text-dark fw-bold small">${bStr}</td>
                </tr>`;
        });

    } catch(e) {}
}

async function filterBookList(sinavTur, dersAdi, targetSelectId) {
    const selectEl = document.getElementById(targetSelectId);
    if (!selectEl) return;
    if (!dersAdi) { selectEl.innerHTML = `<option value="">Önce Ders Seçiniz...</option>`; return; }
    try {
        let allBooks = [...defaultBooks];
        const snap = await getDocs(collection(db, "BookList"));
        snap.forEach(d => {
            const b = d.data();
            if (b.name) allBooks.push({ name: b.name, sinav: b.sinav || "TYT", ders: b.ders || dersAdi });
        });
        const filteredBooks = allBooks.filter(b => {
            const dersMatch = b.ders.toLowerCase() === dersAdi.toLowerCase();
            const sinavMatch = !sinavTur || b.sinav.toLowerCase() === sinavTur.toLowerCase();
            return dersMatch && sinavMatch;
        });
        let optionsHTML = `<option value="">${dersAdi} Kitabı Seçiniz...</option>`;
        if (filteredBooks.length > 0) {
            filteredBooks.forEach(b => { optionsHTML += `<option value="${b.name}">${b.name}</option>`; });
        }
        optionsHTML += `<option value="__YENI_KITAP__">➕ Listede Yok (Yeni ${dersAdi} Kitabı Ekle)</option>`;
        selectEl.innerHTML = optionsHTML;
    } catch(e) {}
}

async function addNewBookIfNotExist(bookName, sinav, ders) {
    if (!bookName || bookName === "__YENI_KITAP__") return;
    try {
        const exists = defaultBooks.some(b => b.name === bookName);
        if (!exists) await addDoc(collection(db, "BookList"), { name: bookName, sinav: sinav || "TYT", ders: ders || "Genel" });
    } catch(e) {}
}

function dersIsminiTemizle(ders) {
    if (!ders) return "";
    return ders.toString().replace(/^(TYT|AYT)\s+/i, "").trim();
}

function setupDynamicBookFilters() {
    const studentDers = document.getElementById('ders');
    if (studentDers) {
        studentDers.addEventListener('change', (e) => { filterBookList('TYT', e.target.value, 'kaynak-kitap-select'); });
    }
    const assignSinav = document.getElementById('assignment-sinav');
    const assignDers = document.getElementById('assignment-ders');
    const updateAssignBooks = () => {
        const sTur = assignSinav ? assignSinav.value : 'TYT';
        const dAdi = assignDers ? assignDers.value : '';
        filterBookList(sTur, dAdi, 'assignment-kitap-select');
    };
    if (assignSinav) assignSinav.addEventListener('change', updateAssignBooks);
    if (assignDers) assignDers.addEventListener('change', updateAssignBooks);
}

async function loadAdminSettings() {
    try {
        const snap = await getDoc(doc(db, "Settings", "SystemConfig"));
        if (snap.exists()) {
            const d = snap.data();
            isStudentDetailedMode = d.studentDetailedMode === true;
            isVeliAssignAllowed = d.veliAssignAllowed === true;
            isMatrixInputEnabled = d.matrixInputEnabled !== false;
            isMatrisVisible = d.matrisVisible === true;
        }

        if (studentModeSwitch) {
            studentModeSwitch.checked = isStudentDetailedMode;
            studentModeSwitch.onchange = async function() {
                isStudentDetailedMode = this.checked; await updateSystemConfig();
                alert(`Öğrenci Ekranı Detaylı Modu ${isStudentDetailedMode ? 'AÇILDI' : 'KAPATILDI'}.`);
            };
        }
        if (veliAssignSwitch) {
            veliAssignSwitch.checked = isVeliAssignAllowed;
            veliAssignSwitch.onchange = async function() {
                isVeliAssignAllowed = this.checked; await updateSystemConfig();
                alert(`Veli Ödev Atama Yetkisi ${isVeliAssignAllowed ? 'AÇILDI' : 'KAPATILDI'}.`);
            };
        }
        if (matrixInputSwitch) {
            matrixInputSwitch.checked = isMatrixInputEnabled;
            matrixInputSwitch.onchange = async function() {
                isMatrixInputEnabled = this.checked; await updateSystemConfig();
                alert(`Soru Bazlı Tıklamalı Izgara ${isMatrixInputEnabled ? 'AÇILDI' : 'KAPATILDI'}.`);
                toggleMatrixUI();
            };
        }
        if (matrisSwitch) {
            matrisSwitch.checked = isMatrisVisible;
            matrisSwitch.onchange = async function() {
                isMatrisVisible = this.checked; await updateSystemConfig();
                alert(`Konu İlerleme Haritası ${isMatrisVisible ? 'AÇILDI' : 'KAPATILDI'}.`);
            };
        }
        toggleMatrixUI();
    } catch(e) {}
}

function toggleMatrixUI() {
    if (matrixInputSection && manualInputSection) {
        if (isMatrixInputEnabled) {
            matrixInputSection.classList.remove('d-none');
            manualInputSection.classList.add('d-none');
        } else {
            matrixInputSection.classList.add('d-none');
            manualInputSection.classList.remove('d-none');
        }
    }
}

async function updateSystemConfig() {
    try {
        await setDoc(doc(db, "Settings", "SystemConfig"), {
            studentDetailedMode: isStudentDetailedMode,
            veliAssignAllowed: isVeliAssignAllowed,
            matrixInputEnabled: isMatrixInputEnabled,
            matrisVisible: isMatrisVisible
        });
    } catch(e) {}
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        if(loginScreen) loginScreen.classList.add('d-none');
        if(mainScreen) mainScreen.classList.remove('d-none');
        
        try {
            const docRef = doc(db, "Users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();
                if(welcomeText) welcomeText.innerText = "Hoş Geldin, " + (userData.AdSoyad || 'Kullanıcı') + "!";
                
                currentUserRole = (userData.Rol || "").trim();
                if(roleText) roleText.innerText = currentUserRole;

                if(studentPanel) studentPanel.classList.add('d-none');
                if(teacherAssignPanel) teacherAssignPanel.classList.add('d-none');
                if(studentAssignmentCard) studentAssignmentCard.classList.add('d-none');
                if(adminPanel) adminPanel.classList.add('d-none');
                if(motivationBanner) motivationBanner.classList.add('d-none');

                await loadAdminSettings();
                setupDynamicBookFilters();
                generateQuestionGrid(12);

                const analizPanel = document.getElementById('analiz-panel');

                if (currentUserRole === "Admin") {
                    if(adminPanel) adminPanel.classList.remove('d-none');
                    if(teacherAssignPanel) teacherAssignPanel.classList.remove('d-none');
                    if(analizPanel) analizPanel.classList.remove('d-none');
                    loadAdminKpi();
                } else if (currentUserRole === "Öğretmen" || currentUserRole === "Ogretmen" || currentUserRole === "Veli") {
                    if (currentUserRole === "Öğretmen" || currentUserRole === "Ogretmen" || isVeliAssignAllowed) {
                        if(teacherAssignPanel) teacherAssignPanel.classList.remove('d-none');
                    }
                    if(analizPanel) analizPanel.classList.remove('d-none');
                } else if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                    if(studentPanel) studentPanel.classList.remove('d-none');
                    if(studentAssignmentCard) studentAssignmentCard.classList.remove('d-none');

                    if (motivationBanner && motivationText) {
                        const randomQuote = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
                        motivationText.innerText = randomQuote;
                        motivationBanner.classList.remove('d-none');
                        setTimeout(() => { playClapSound(); }, 600);
                    }

                    if (isStudentDetailedMode) {
                        if(analizPanel) analizPanel.classList.remove('d-none');
                    } else {
                        if(analizPanel) analizPanel.classList.add('d-none');
                    }
                }

                if (konuMatrisiCard) {
                    if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                        if (isMatrisVisible && isStudentDetailedMode) konuMatrisiCard.classList.remove('d-none');
                        else konuMatrisiCard.classList.add('d-none');
                    } else {
                        if (isMatrisVisible) konuMatrisiCard.classList.remove('d-none');
                        else konuMatrisiCard.classList.add('d-none');
                    }
                }

                if (grafikCard) {
                    if ((currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") && !isStudentDetailedMode) {
                        grafikCard.classList.add('d-none');
                    } else {
                        grafikCard.classList.remove('d-none');
                    }
                }

                loadStudentTests();
                loadAssignments();
                loadDenemeler();
                loadKonuMatrisiAndAnaliz();
                loadSonDenemelerAnalizi();
                loadDuyuru();
                hesaplaYksSayac();
                
                if (currentUserRole !== "Öğrenci" && currentUserRole !== "Ogrenci") {
                    loadStudentSelfTestsHistory();
                }
            }
        } catch (error) {}
    } else {
        if(loginScreen) loginScreen.classList.remove('d-none');
        if(mainScreen) mainScreen.classList.add('d-none');
    }
});

if(loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        signInWithEmailAndPassword(auth, email, password)
            .then(() => { if(errorMsg) errorMsg.classList.add('d-none'); })
            .catch(() => { if(errorMsg) errorMsg.classList.remove('d-none'); });
    });
}

if(logoutBtn) { logoutBtn.addEventListener('click', () => { signOut(auth); }); }

window.tumTestVerileriniSil = async function() {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) { confirmBtn.innerText = "Siliniyor..."; confirmBtn.disabled = true; }
    try {
        const collectionsToClear = ["TestEntries", "Assignments", "Denemeler", "HataDefteri", "StudyTimes"];
        for (const colName of collectionsToClear) {
            const snap = await getDocs(collection(db, colName));
            const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, colName, docSnap.id)));
            await Promise.all(deletePromises);
        }
        alert("Tüm test, deneme ve ödev verileri temizlendi!");
        window.location.reload();
    } catch(e) {}
}

// -----------------------------------------------------------
// DENEME KAYIT VE EKRANA BASMA (SÜTUN DETAYLI)
// -----------------------------------------------------------
if(denemeForm) {
    denemeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const denemeAdi = document.getElementById('deneme-adi').value;
        const denemeTuru = document.getElementById('deneme-turu').value;

        // TYT Netleri
        const tytTurkce = parseFloat(document.getElementById('d-tyt-turkce').value) || 0;
        const tytSosyal = parseFloat(document.getElementById('d-tyt-sosyal').value) || 0;
        const tytMat = parseFloat(document.getElementById('d-tyt-mat').value) || 0;
        const tytFen = parseFloat(document.getElementById('d-tyt-fen').value) || 0;
        const tytToplamNet = tytTurkce + tytSosyal + tytMat + tytFen;
        const tytPuan = (tytTurkce * 3.3) + (tytSosyal * 3.4) + (tytMat * 3.3) + (tytFen * 3.4) + 100;

        let alanPuanMetni = `${tytPuan.toFixed(2)} TYT`;
        let toplamNet = tytToplamNet;

        // Alt Ders Netleri Haritası
        let altNetler = {
            "Türkçe": tytTurkce,
            "Sosyal": tytSosyal,
            "Matematik": tytMat,
            "Fen": tytFen
        };

        if (denemeTuru === "AYT_EA") {
            const aytMat = parseFloat(document.getElementById('d-ayt-mat').value) || 0;
            const aytEdebiyat = parseFloat(document.getElementById('d-ayt-edebiyat').value) || 0;
            toplamNet += (aytMat + aytEdebiyat);
            alanPuanMetni = `EA: ${((tytPuan * 0.4) + (aytMat * 3.0) + (aytEdebiyat * 3.0) + 100).toFixed(2)} Puan`;
            altNetler["AYT Mat"] = aytMat;
            altNetler["AYT Edebiyat"] = aytEdebiyat;

        } else if (denemeTuru === "AYT_SAY") {
            const aytMat = parseFloat(document.getElementById('d-ayt-mat').value) || 0;
            const aytFen = parseFloat(document.getElementById('d-ayt-fen').value) || 0;
            toplamNet += (aytMat + aytFen);
            alanPuanMetni = `SAY: ${((tytPuan * 0.4) + (aytMat * 3.0) + (aytFen * 2.8) + 100).toFixed(2)} Puan`;
            altNetler["AYT Mat"] = aytMat;
            altNetler["AYT Fen"] = aytFen;

        } else if (denemeTuru === "AYT_SOZ") {
            const aytEdebiyat = parseFloat(document.getElementById('d-ayt-edebiyat').value) || 0;
            const aytSos2 = parseFloat(document.getElementById('d-ayt-sos2').value) || 0;
            toplamNet += (aytEdebiyat + aytSos2);
            alanPuanMetni = `SÖZ: ${((tytPuan * 0.4) + (aytEdebiyat * 3.0) + (aytSos2 * 2.9) + 100).toFixed(2)} Puan`;
            altNetler["AYT Edebiyat"] = aytEdebiyat;
            altNetler["AYT Sos-2"] = aytSos2;

        } else if (denemeTuru === "YDT") {
            const ydtDil = parseFloat(document.getElementById('d-ydt-dil').value) || 0;
            toplamNet += ydtDil;
            alanPuanMetni = `DİL: ${((tytPuan * 0.4) + (ydtDil * 3.0) + 100).toFixed(2)} Puan`;
            altNetler["YDT Dil"] = ydtDil;
        }

        try {
            await addDoc(collection(db, "Denemeler"), { 
                denemeAdi, 
                denemeTuru, 
                toplamNet: toplamNet.toFixed(2), 
                alanPuanMetni, 
                altNetler,
                tarih: serverTimestamp() 
            });
            denemeForm.reset();
            const modalEl = document.getElementById('denemeModal');
            if(modalEl) { const modal = bootstrap.Modal.getInstance(modalEl); if(modal) modal.hide(); }
            loadDenemeler(); 
            loadSonDenemelerAnalizi();
        } catch(error) {}
    });
}

async function loadDenemeler() {
    const tbody = document.getElementById('deneme-list-table');
    if(!tbody) return;
    try {
        const querySnapshot = await getDocs(collection(db, "Denemeler"));
        tbody.innerHTML = "";
        if(querySnapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='5' class='text-center text-muted py-3'>Henüz girilmiş deneme sınavı yok.</td></tr>";
            return;
        }
        querySnapshot.forEach(docSnap => {
            const d = docSnap.data();
            
            // Ders Netleri Rozetleri
            let netRozetleri = "";
            if (d.altNetler && Object.keys(d.altNetler).length > 0) {
                for (const [ders, netVal] of Object.entries(d.altNetler)) {
                    netRozetleri += `<span class="badge bg-light text-dark border p-1 me-1 mb-1" style="font-size:0.85rem;">${ders}: <strong class="text-primary">${netVal}</strong></span> `;
                }
            } else {
                netRozetleri = `<span class="text-muted small">Eski kayıt (Net detayı yok)</span>`;
            }

            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-start ps-3 align-middle">${d.denemeAdi}</td>
                    <td class="align-middle"><span class="badge bg-secondary">${d.denemeTuru || 'TYT'}</span></td>
                    <td class="align-middle text-start px-3">${netRozetleri}</td>
                    <td class="align-middle"><span class="badge bg-primary fs-6">${d.toplamNet} Net</span></td>
                    <td class="align-middle"><span class="badge bg-success fs-6">${d.alanPuanMetni || '-'}</span></td>
                </tr>`;
        });
    } catch(e) {}
}

async function loadSonDenemelerAnalizi() {
    const container = document.getElementById('son-deneme-cards-container');
    if(!container) return;
    try {
        const denemeSnap = await getDocs(collection(db, "Denemeler"));
        if(denemeSnap.empty) {
            container.innerHTML = `<div class="col-12 text-muted small py-2 bg-light rounded border">⚠️ Henüz sisteme girilmiş deneme sınavı bulunmuyor.</div>`;
            return;
        }
        let denemeler = [];
        denemeSnap.forEach(d => denemeler.push(d.data()));
        const son3 = denemeler.slice(-3).reverse();
        container.innerHTML = "";
        son3.forEach((d, idx) => {
            let miniNetler = "";
            if (d.altNetler) {
                for (const [ders, netVal] of Object.entries(d.altNetler)) {
                    miniNetler += `<small class="d-inline-block bg-white px-1 border rounded me-1 mb-1">${ders}: <b>${netVal}</b></small>`;
                }
            }

            container.innerHTML += `
                <div class="col-md-4 mb-2">
                    <div class="p-3 bg-light rounded border border-primary shadow-sm text-start">
                        <small class="text-muted fw-bold d-block">${idx + 1}. Son Deneme</small>
                        <strong class="text-dark d-block text-truncate mb-1">${d.denemeAdi}</strong>
                        <div class="mb-2">${miniNetler}</div>
                        <div>
                            <span class="badge bg-primary fs-6">${d.toplamNet} Net</span>
                            <span class="badge bg-success fs-6 ms-1">${d.alanPuanMetni || '-'}</span>
                        </div>
                    </div>
                </div>`;
        });
    } catch(e) {}
}

async function loadKonuMatrisiAndAnaliz() {
    const barlarContainer = document.getElementById('alan-basari-barlari');
    const zayifList = document.getElementById('zayif-konular-listesi');
    if(!barlarContainer || !zayifList) return;
    try {
        const testSnap = await getDocs(collection(db, "TestEntries"));
        if (testSnap.empty) {
            barlarContainer.innerHTML = `<div class="text-muted small p-2 bg-light rounded border">⚠️ Henüz çözülen test verisi bulunmuyor.</div>`;
            zayifList.innerHTML = `<li class="list-group-item text-muted small py-2">⚠️ Analiz için henüz test girilmedi.</li>`;
            return;
        }
        const alanlar = {
            "Sayısal (Mat, Geo, Fiz, Kim, Biyo)": { dogru: 0, toplam: 0 },
            "Eşit Ağırlık / Sözel (Tük, Edeb, Tar, Coğ)": { dogru: 0, toplam: 0 },
            "YDT / Yabancı Dil": { dogru: 0, toplam: 0 }
        };
        const konuIstatistik = {};
        testSnap.forEach(docSnap => {
            const d = docSnap.data();
            const ders = dersIsminiTemizle(d.ders);
            const konu = d.konu || "Genel";
            const toplamSoru = (d.dogru || 0) + (d.yanlis || 0) + (d.bos || 0);

            if (toplamSoru > 0) {
                if (["Matematik", "Geometri", "Fizik", "Kimya", "Biyoloji"].includes(ders)) {
                    alanlar["Sayısal (Mat, Geo, Fiz, Kim, Biyo)"].dogru += d.dogru || 0;
                    alanlar["Sayısal (Mat, Geo, Fiz, Kim, Biyo)"].toplam += toplamSoru;
                } else if (["Türkçe", "Tarih", "Coğrafya", "Edebiyat"].includes(ders)) {
                    alanlar["Eşit Ağırlık / Sözel (Tük, Edeb, Tar, Coğ)"].dogru += d.dogru || 0;
                    alanlar["Eşit Ağırlık / Sözel (Tük, Edeb, Tar, Coğ)"].toplam += toplamSoru;
                } else if (["İngilizce", "Dil", "YDT"].includes(ders)) {
                    alanlar["YDT / Yabancı Dil"].dogru += d.dogru || 0;
                    alanlar["YDT / Yabancı Dil"].toplam += toplamSoru;
                }
                if (!konuIstatistik[konu]) konuIstatistik[konu] = { ders: ders, dogru: 0, toplam: 0 };
                konuIstatistik[konu].dogru += d.dogru || 0;
                konuIstatistik[konu].toplam += toplamSoru;
            }
        });
        barlarContainer.innerHTML = "";
        for (const [alanAdi, stat] of Object.entries(alanlar)) {
            if (stat.toplam > 0) {
                const oran = Math.round((stat.dogru / stat.toplam) * 100);
                let barColor = oran >= 75 ? "bg-success" : (oran >= 50 ? "bg-warning" : "bg-danger");
                barlarContainer.innerHTML += `
                    <div class="mb-3">
                        <div class="d-flex justify-content-between small fw-bold mb-1">
                            <span>${alanAdi}</span>
                            <span>%${oran} Başarı (${stat.toplam} Soru Çözüldü)</span>
                        </div>
                        <div class="progress" style="height: 12px;"><div class="progress-bar ${barColor}" style="width: ${oran}%"></div></div>
                    </div>`;
            }
        }
        zayifList.innerHTML = "";
        for (const [konu, stat] of Object.entries(konuIstatistik)) {
            const oran = Math.round((stat.dogru / stat.toplam) * 100);
            if (oran < 65) {
                zayifList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                        <div><strong class="text-dark">${konu}</strong><br><small class="text-muted">${stat.ders}</small></div>
                        <span class="badge bg-danger rounded-pill">%${oran} Başarı</span>
                    </li>`;
            }
        }
    } catch(e) {}
}

async function loadStudentTests() {
    const user = auth.currentUser;
    if(!user) return;
    try {
        let testQuery = collection(db, "TestEntries");
        if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
            testQuery = query(collection(db, "TestEntries"), where("userId", "==", user.uid));
        }
        const querySnapshot = await getDocs(testQuery);
        let testLabels = [], netData = [], sayac = 1;
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            testLabels.push(`${data.ders} (${sayac})`); netData.push(data.net); sayac++;
        });
        updateChart(testLabels, netData);
    } catch (error) {}
}

function updateChart(labels, data) {
    const canvas = document.getElementById('netChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    if (myChart) { myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Çözülen Testlerin Net Grafiği', data: data, borderColor: 'rgb(13, 110, 253)', backgroundColor: 'rgba(13, 110, 253, 0.1)', borderWidth: 2, tension: 0.2, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
    });
}

function hesaplaYksSayac() {
    const sayacEl = document.getElementById('yks-sayac');
    if(!sayacEl) return;
    const yksTarihi = new Date('2027-06-19T10:15:00').getTime();
    const simdi = new Date().getTime();
    const fark = yksTarihi - simdi;
    if(fark > 0) {
        const gun = Math.floor(fark / (1000 * 60 * 60 * 24));
        const saat = Math.floor((fark % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        sayacEl.innerText = `${gun} Gün, ${saat} Saat kaldı 🚀`;
    } else {
        sayacEl.innerText = "YKS Sınav Vakti Geldi!";
    }
}

async function loadAdminKpi() {
    try {
        const testSnap = await getDocs(collection(db, "TestEntries"));
        let toplamTest = testSnap.size;
        let toplamNet = 0;
        testSnap.forEach(d => toplamNet += d.data().net || 0);
        let ortNet = toplamTest > 0 ? (toplamNet / toplamTest).toFixed(2) : "0.00";
        const el1 = document.getElementById('kpi-toplam-test');
        const el2 = document.getElementById('kpi-ortalama-net');
        if(el1) el1.innerText = toplamTest;
        if(el2) el2.innerText = ortNet;
    } catch(e) {}
}

async function loadDuyuru() {
    try {
        const snap = await getDoc(doc(db, "Settings", "Duyuru"));
        if(snap.exists() && snap.data().metin) {
            if(duyuruBanner) duyuruBanner.classList.remove('d-none');
            if(duyuruText) duyuruText.innerText = snap.data().metin;
            if(adminDuyuruInput) adminDuyuruInput.value = snap.data().metin;
        }
    } catch(e) {}
}