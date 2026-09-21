import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, updatePassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, deleteDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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
const adminPanel = document.getElementById('admin-panel');
const testEntryForm = document.getElementById('test-entry-form');
const saveSuccess = document.getElementById('save-success');
const assignmentForm = document.getElementById('assignment-form');
const assignmentSuccess = document.getElementById('assignment-success');

const studyTimeForm = document.getElementById('study-time-form');
const kocNotuForm = document.getElementById('koc-notu-form');
const kocNotuInput = document.getElementById('koc-notu-input');
const kocNotuSuccess = document.getElementById('koc-notu-success');
const studentKocNotuCard = document.getElementById('student-koc-notu-card');
const studentKocNotuText = document.getElementById('student-koc-notu-text');

const denemeForm = document.getElementById('deneme-form');
const soruNotuForm = document.getElementById('soru-notu-form');
const soruNotuInput = document.getElementById('soru-notu-input');
const soruNotlariList = document.getElementById('soru-notlari-list');
const studentSoruBox = document.getElementById('student-soru-box');

const sifreDegisForm = document.getElementById('sifre-degis-form');
const yeniSifreInput = document.getElementById('yeni-sifre');
const sifreSuccess = document.getElementById('sifre-success');

const adminDuyuruForm = document.getElementById('admin-duyuru-form');
const adminDuyuruInput = document.getElementById('admin-duyuru-input');
const duyuruBanner = document.getElementById('duyuru-banner');
const duyuruText = document.getElementById('duyuru-text');

let myChart = null;
let activeAssignmentDocId = null;

// --- OTURUM KONTROLÜ VE ROL YÖNETİMİ ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        loginScreen.classList.add('d-none');
        mainScreen.classList.remove('d-none');
        
        const docRef = doc(db, "Users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            welcomeText.innerText = "Hoş Geldin, " + (userData.AdSoyad || 'Kullanıcı') + "!";
            
            const rol = (userData.Rol || "").trim();
            roleText.innerText = rol;

            studentPanel.classList.add('d-none');
            teacherAssignPanel.classList.add('d-none');
            adminPanel.classList.add('d-none');
            studentKocNotuCard.classList.add('d-none');
            studentSoruBox.classList.add('d-none');

            if (rol === "Admin") {
                adminPanel.classList.remove('d-none');
                loadAdminKpi();
            } else if (rol === "Öğretmen" || rol === "Ogretmen") {
                teacherAssignPanel.classList.remove('d-none');
            } else if (rol === "Öğrenci" || rol === "Ogrenci") {
                studentPanel.classList.remove('d-none');
                studentKocNotuCard.classList.remove('d-none');
                studentSoruBox.classList.remove('d-none');
            }
            
            loadStudentTests();
            loadAssignments();
            loadKocNotu();
            loadDenemeler();
            loadSoruNotlari();
            loadKonuMatrisi();
            loadDuyuru();
            hesaplaYksSayac();
        }
    } else {
        loginScreen.classList.remove('d-none');
        mainScreen.classList.add('d-none');
    }
});

// --- GİRİŞ / ÇIKIŞ ---
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    signInWithEmailAndPassword(auth, email, password).catch(() => {
        errorMsg.classList.remove('d-none'); 
    });
});

logoutBtn.addEventListener('click', () => {
    signOut(auth);
});

// --- ŞİFRE DEĞİŞTİRME ---
if(sifreDegisForm) {
    sifreDegisForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const yeniSifre = yeniSifreInput.value;
        const user = auth.currentUser;
        if(user) {
            try {
                await updatePassword(user, yeniSifre);
                sifreSuccess.classList.remove('d-none');
                setTimeout(() => {
                    sifreSuccess.classList.add('d-none');
                    sifreDegisForm.reset();
                }, 3000);
            } catch (error) {
                alert("Şifre değiştirilemedi! Güvenlik nedeniyle tekrar giriş yapmanız gerekebilir.");
            }
        }
    });
}

// --- ADMIN: DUYURU YÖNETİMİ ---
if(adminDuyuruForm) {
    adminDuyuruForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const metin = adminDuyuruInput.value.trim();
        try {
            await setDoc(doc(db, "Settings", "Duyuru"), { metin, tarih: serverTimestamp() });
            adminDuyuruForm.reset();
            alert("Duyuru başarıyla yayınlandı!");
            loadDuyuru();
        } catch(e) { alert("Duyuru yayınlanamadı!"); }
    });
}

async function loadDuyuru() {
    try {
        const snap = await getDoc(doc(db, "Settings", "Duyuru"));
        if(snap.exists() && snap.data().metin) {
            duyuruBanner.classList.remove('d-none');
            duyuruText.innerText = snap.data().metin;
            if(adminDuyuruInput) adminDuyuruInput.value = snap.data().metin;
        }
    } catch(e) {}
}

// --- ADMIN: YKS GERİ SAYIM SAYACI ---
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

// --- ADMIN: KPI ÖZET KARTLARI ---
async function loadAdminKpi() {
    try {
        const testSnap = await getDocs(collection(db, "TestEntries"));
        let toplamTest = testSnap.size;
        let toplamNet = 0;
        testSnap.forEach(d => toplamNet += d.data().net || 0);
        let ortNet = toplamTest > 0 ? (toplamNet / toplamTest).toFixed(2) : "0.00";

        document.getElementById('kpi-toplam-test').innerText = toplamTest;
        document.getElementById('kpi-ortalama-net').innerText = ortNet;

        const sureSnap = await getDocs(collection(db, "StudyTimes"));
        let toplamDk = 0;
        sureSnap.forEach(d => toplamDk += d.data().dakika || 0);
        document.getElementById('kpi-toplam-sure').innerText = toplamDk + " Dk";

        const odevSnap = await getDocs(collection(db, "Assignments"));
        let tamamOdev = 0;
        odevSnap.forEach(d => { if(d.data().durum === "Tamamlandı") tamamOdev++; });
        document.getElementById('kpi-tamam-odev').innerText = tamamOdev;
    } catch(e) {}
}

// --- ADMIN: CSV EXCEL İHRACI ---
window.exportToCSV = async function() {
    try {
        const querySnapshot = await getDocs(collection(db, "TestEntries"));
        if(querySnapshot.empty) {
            alert("İndirilecek test verisi bulunmuyor.");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,Ders,Konu,Dogru,Yanlis,Bos,Net,Sure\n";
        querySnapshot.forEach(doc => {
            const d = doc.data();
            csvContent += `"${d.ders}","${d.konu}",${d.dogru},${d.yanlis},${d.bos},${d.net},${d.sure || 0}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "yks_test_raporu.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(e) { alert("Rapor indirilemedi!"); }
}

// --- ADMIN: GÜVENLİK DOĞRULAMALI TEST VE DENEME VERİLERİNİ SİLME ---
window.tumTestVerileriniSil = async function() {
    try {
        const testSnap = await getDocs(collection(db, "TestEntries"));
        for (const d of testSnap.docs) {
            await deleteDoc(doc(db, "TestEntries", d.id));
        }

        const denemeSnap = await getDocs(collection(db, "Denemeler"));
        for (const d of denemeSnap.docs) {
            await deleteDoc(doc(db, "Denemeler", d.id));
        }

        const studySnap = await getDocs(collection(db, "StudyTimes"));
        for (const d of studySnap.docs) {
            await deleteDoc(doc(db, "StudyTimes", d.id));
        }

        // Modalı kapat ve sayfayı yenile
        const modalEl = document.getElementById('resetConfirmModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if(modal) modal.hide();

        alert("✅ Tüm test ve deneme verileri başarıyla temizlendi!");
        location.reload();
    } catch (error) {
        alert("Veriler silinirken hata oluştu!");
    }
}

// --- ÇALIŞMA SAATİ GİRİŞİ ---
if(studyTimeForm) {
    studyTimeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ders = document.getElementById('study-ders').value;
        const dakika = parseInt(document.getElementById('study-dakika').value) || 0;
        const user = auth.currentUser;
        if(user && dakika > 0) {
            try {
                await addDoc(collection(db, "StudyTimes"), {
                    userId: user.uid, ders, dakika, tarih: serverTimestamp()
                });
                studyTimeForm.reset();
                alert(`Harika! ${ders} dersinden ${dakika} dakika çalışma süresi kaydedildi.`);
            } catch (error) { alert("Çalışma süresi kaydedilemedi!"); }
        }
    });
}

// --- HAFTALIK KOÇ NOTU ---
if(kocNotuForm) {
    kocNotuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const notMetni = kocNotuInput.value.trim();
        try {
            await setDoc(doc(db, "Settings", "KocNotu"), {
                metin: notMetni, guncelleme: serverTimestamp()
            });
            kocNotuSuccess.classList.remove('d-none');
            setTimeout(() => kocNotuSuccess.classList.add('d-none'), 3000);
        } catch (error) { alert("Koç notu kaydedilemedi!"); }
    });
}

async function loadKocNotu() {
    try {
        const snap = await getDoc(doc(db, "Settings", "KocNotu"));
        if(snap.exists()) {
            const data = snap.data();
            if(data.metin) {
                studentKocNotuText.innerText = data.metin;
                if(kocNotuInput) kocNotuInput.value = data.metin;
            }
        }
    } catch(e) {}
}

// --- DENEME KARNESİ ---
if(denemeForm) {
    denemeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const denemeAdi = document.getElementById('deneme-adi').value;
        const turkce = parseFloat(document.getElementById('d-turkce').value) || 0;
        const sosyal = parseFloat(document.getElementById('d-sosyal').value) || 0;
        const mat = parseFloat(document.getElementById('d-mat').value) || 0;
        const fen = parseFloat(document.getElementById('d-fen').value) || 0;
        const toplamNet = turkce + sosyal + mat + fen;

        try {
            await addDoc(collection(db, "Denemeler"), {
                denemeAdi, turkce, sosyal, mat, fen, toplamNet, tarih: serverTimestamp()
            });
            denemeForm.reset();
            const modalEl = document.getElementById('denemeModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
            loadDenemeler();
        } catch(error) { alert("Deneme kaydedilemedi!"); }
    });
}

async function loadDenemeler() {
    const tbody = document.getElementById('deneme-list-table');
    try {
        const querySnapshot = await getDocs(collection(db, "Denemeler"));
        tbody.innerHTML = "";
        if(querySnapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='6' class='text-center text-muted'>Henüz girilmiş deneme sınavı yok.</td></tr>";
            return;
        }
        querySnapshot.forEach(docSnap => {
            const d = docSnap.data();
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${d.denemeAdi}</td>
                    <td>${d.turkce}</td>
                    <td>${d.sosyal}</td>
                    <td>${d.mat}</td>
                    <td>${d.fen}</td>
                    <td><span class="badge bg-success fs-6">${d.toplamNet.toFixed(2)}</span></td>
                </tr>`;
        });
    } catch(e) {
        tbody.innerHTML = "<tr><td colspan='6' class='text-center text-danger'>Denemeler yüklenemedi.</td></tr>";
    }
}

// --- KONU MATRİSİ ---
async function loadKonuMatrisi() {
    const container = document.getElementById('konu-matris-container');
    const ornekKonular = {
        "Matematik": ["Temel Kavramlar", "Fonksiyonlar", "Türev", "İntegral", "Trigonometri"],
        "Geometri": ["Üçgenler", "Çember", "Analitik Geometri"]
    };
    container.innerHTML = "";
    for (const [ders, konular] of Object.entries(ornekKonular)) {
        let konularHTML = konular.map(k => `<span class="badge bg-warning text-dark m-1 p-2">${k} (Çalışılıyor)</span>`).join('');
        container.innerHTML += `
            <div class="col-md-6 mb-3">
                <div class="border p-3 rounded bg-white shadow-sm">
                    <h6 class="text-primary fw-bold">${ders} Konuları</h6>
                    <div>${konularHTML}</div>
                </div>
            </div>`;
    }
}

// --- KOÇUMA SORU NOTLARI ---
if(soruNotuForm) {
    soruNotuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const soruNotu = soruNotuInput.value.trim();
        try {
            await addDoc(collection(db, "SoruNotlari"), {
                notu: soruNotu, durum: "Bekliyor", tarih: serverTimestamp()
            });
            soruNotuForm.reset();
            loadSoruNotlari();
        } catch(e) { alert("Not gönderilemedi!"); }
    });
}

async function loadSoruNotlari() {
    try {
        const snap = await getDocs(collection(db, "SoruNotlari"));
        soruNotlariList.innerHTML = "";
        if(snap.empty) {
            soruNotlariList.innerHTML = "<li class='list-group-item text-muted'>Çözülemeyen soru notu bulunmuyor.</li>";
            return;
        }
        snap.forEach(docSnap => {
            const d = docSnap.data();
            soruNotlariList.innerHTML += `
                <li class='list-group-item d-flex justify-content-between align-items-center'>
                    <span>📌 ${d.notu}</span>
                    <span class='badge bg-danger'>Çözülecek</span>
                </li>`;
        });
    } catch(e) {}
}

// --- TEST KAYDETME ---
testEntryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ders = document.getElementById('ders').value;
    const konu = document.getElementById('konu').value;
    const dogru = parseInt(document.getElementById('dogru').value) || 0;
    const yanlis = parseInt(document.getElementById('yanlis').value) || 0;
    const bos = parseInt(document.getElementById('bos').value) || 0;
    const sure = parseInt(document.getElementById('sure').value) || 0;
    const net = dogru - (yanlis / 4);
    
    const user = auth.currentUser;
    if(user) {
        try {
            await addDoc(collection(db, "TestEntries"), {
                userId: user.uid, ders, konu, dogru, yanlis, bos, net, sure, tarih: serverTimestamp()
            });
            testEntryForm.reset();
            saveSuccess.classList.remove('d-none');
            setTimeout(() => saveSuccess.classList.add('d-none'), 3000);
            loadStudentTests();
        } catch (error) { alert("Kaydedilirken hata oluştu!"); }
    }
});

// --- ÖDEV ATAMA ---
if(assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sinav = document.getElementById('assignment-sinav').value;
        const ders = document.getElementById('assignment-ders').value;
        let konu = document.getElementById('assignment-konu-select').value;
        const konuManuel = document.getElementById('assignment-konu-manuel').value;
        if (konu.includes("Diğer") && konuManuel.trim() !== "") { konu = konuManuel.trim(); }

        const tarih = document.getElementById('assignment-date').value;
        const ogretmenNotu = document.getElementById('assignment-not').value.trim();
        const motivasyon = document.getElementById('assignment-motivasyon').value;

        try {
            await addDoc(collection(db, "Assignments"), {
                sinav, ders, konu, tarih, durum: "Bekliyor",
                ogretmenNotu: ogretmenNotu || "-", motivasyon: motivasyon || "-",
                sonucNotu: "-", yanlisSorular: "-", aciklama: "-", olusturmaTarihi: serverTimestamp()
            });
            assignmentForm.reset();
            document.getElementById('assignment-konu-manuel').classList.add('d-none');
            document.getElementById('assignment-konu-select').innerHTML = '<option value="">Önce ders seçiniz...</option>';
            assignmentSuccess.classList.remove('d-none');
            setTimeout(() => assignmentSuccess.classList.add('d-none'), 3000);
            loadAssignments();
        } catch (error) { alert("Ödev atanamadı!"); }
    });
}

// --- ÖDEVLERİ LİSTELEME ---
async function loadAssignments() {
    const listEl = document.getElementById('assignment-list');
    const user = auth.currentUser;
    let userRole = "";
    if(user) {
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if(userDoc.exists()) userRole = userDoc.data().Rol;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "Assignments"));
        listEl.innerHTML = "";
        if (querySnapshot.empty) {
            listEl.innerHTML = "<li class='list-group-item text-muted'>Atanmış aktif ödev bulunmuyor.</li>";
            return;
        }

        querySnapshot.forEach((documentSnap) => {
            const data = documentSnap.data();
            const docId = documentSnap.id;
            let badgeClass = "bg-warning text-dark";
            if (data.durum === "Tamamlandı") badgeClass = "bg-success";

            let actionButton = "";
            if ((userRole === "Öğrenci" || userRole === "Ogrenci") && data.durum === "Bekliyor") {
                actionButton = `<button class='btn btn-sm btn-success ms-3' onclick='openCompleteModal("${docId}")'>Tamamla & Analiz Gir ✓</button>`;
            }

            let ekBilgilerHTML = "";
            if (data.ogretmenNotu && data.ogretmenNotu !== "-") {
                ekBilgilerHTML += `<br><small class='text-secondary'>📝 <strong>Not:</strong> ${data.ogretmenNotu}</small>`;
            }
            if (data.motivasyon && data.motivasyon !== "-") {
                ekBilgilerHTML += `<br><small class='text-success fw-bold'>${data.motivasyon}</small>`;
            }

            let detayHTML = "";
            if (data.durum === "Tamamlandı") {
                detayHTML = `<br><small class='text-primary fw-bold'>Özet: ${data.sonucNotu || '-'}</small>`;
                if (data.yanlisSorular && data.yanlisSorular !== "-") {
                    detayHTML += `<br><small class='text-danger'>❌ Yanlış Sorular: <strong>${data.yanlisSorular}</strong></small>`;
                }
                if (data.aciklama && data.aciklama !== "-") {
                    detayHTML += `<br><small class='text-muted'>💬 Öğrenci Notu: ${data.aciklama}</small>`;
                }
            }

            listEl.innerHTML += `
                <li class='list-group-item d-flex justify-content-between align-items-center py-3'>
                    <div>
                        <span class="badge bg-secondary me-2">${data.sinav || 'TYT'}</span>
                        <strong>${data.ders}</strong> - ${data.konu}
                        <br><small class='text-muted'>Son Teslim: ${data.tarih}</small>
                        ${ekBilgilerHTML}
                        ${detayHTML}
                    </div>
                    <div class='d-flex align-items-center'>
                        <span class='badge ${badgeClass}'>${data.durum}</span>
                        ${actionButton}
                    </div>
                </li>`;
        });
    } catch (error) {
        listEl.innerHTML = "<li class='list-group-item text-danger'>Ödevler yüklenemedi.</li>";
    }
}

// --- MODAL YÖNETİMİ ---
window.openCompleteModal = function(docId) {
    activeAssignmentDocId = docId;
    document.getElementById('modal-dogru').value = '';
    document.getElementById('modal-yanlis').value = '';
    document.getElementById('modal-bos').value = '';
    document.getElementById('modal-yanlis-sorular').value = '';
    document.getElementById('modal-aciklama').value = '';
    document.getElementById('modal-net-preview').innerText = '0.00';
    const myModal = new bootstrap.Modal(document.getElementById('completeAssignmentModal'));
    myModal.show();
}

window.kaydetVeTamamla = async function() {
    if (!activeAssignmentDocId) return;
    const dogru = parseInt(document.getElementById('modal-dogru').value) || 0;
    const yanlis = parseInt(document.getElementById('modal-yanlis').value) || 0;
    const bos = parseInt(document.getElementById('modal-bos').value) || 0;
    const net = dogru - (yanlis / 4);
    const yanlisSorular = document.getElementById('modal-yanlis-sorular').value.trim() || "-";
    const aciklama = document.getElementById('modal-aciklama').value.trim() || "-";
    const sonucMetni = `${dogru} Doğru, ${yanlis} Yanlış, ${bos} Boş (${net.toFixed(2)} Net)`;

    try {
        const assignmentRef = doc(db, "Assignments", activeAssignmentDocId);
        await updateDoc(assignmentRef, {
            durum: "Tamamlandı", sonucNotu: sonucMetni, yanlisSorular: yanlisSorular, aciklama: aciklama
        });
        const modalEl = document.getElementById('completeAssignmentModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        loadAssignments();
    } catch (error) { alert("Ödev durumu değiştirilemedi!"); }
}

// --- TESTLERİ LİSTELEME VE GRAFİK ---
async function loadStudentTests() {
    const tableBody = document.getElementById('test-list-table');
    tableBody.innerHTML = "<tr><td colspan='7' class='text-center'>Yükleniyor...</td></tr>";
    try {
        const querySnapshot = await getDocs(collection(db, "TestEntries"));
        tableBody.innerHTML = ""; 
        if (querySnapshot.empty) {
            tableBody.innerHTML = "<tr><td colspan='7' class='text-center text-muted'>Henüz girilmiş bir test sonucu yok.</td></tr>";
            updateChart([], []);
            return;
        }
        let testLabels = [];
        let netData = [];
        let sayac = 1;
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            tableBody.innerHTML += `<tr>
                <td><strong>${data.ders}</strong></td>
                <td>${data.konu}</td>
                <td class='text-success fw-bold'>${data.dogru}</td>
                <td class='text-danger fw-bold'>${data.yanlis}</td>
                <td class='text-secondary'>${data.bos}</td>
                <td><span class='badge bg-primary'>${data.net.toFixed(2)}</span></td>
                <td>${data.sure ? data.sure + ' dk' : '-'}</td>
            </tr>`;
            testLabels.push(`${data.ders} (${sayac})`);
            netData.push(data.net);
            sayac++;
        });
        updateChart(testLabels, netData);
    } catch (error) {
        tableBody.innerHTML = "<tr><td colspan='7' class='text-center text-danger'>Veriler yüklenirken hata oluştu!</td></tr>";
    }
}

function updateChart(labels, data) {
    const ctx = document.getElementById('netChart').getContext('2d');
    if (myChart) { myChart.destroy(); }
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Çözülen Testlerin Net Grafiği',
                data: data,
                borderColor: 'rgb(13, 110, 253)',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                borderWidth: 2, tension: 0.2, fill: true
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}