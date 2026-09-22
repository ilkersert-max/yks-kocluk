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
const adminPanel = document.getElementById('admin-panel');
const testEntryForm = document.getElementById('test-entry-form');
const saveSuccess = document.getElementById('save-success');

const denemeForm = document.getElementById('deneme-form');
const adminDuyuruInput = document.getElementById('admin-duyuru-input');
const duyuruBanner = document.getElementById('duyuru-banner');
const duyuruText = document.getElementById('duyuru-text');

const konuMatrisiCard = document.getElementById('konu-matrisi-card');
const matrisSwitch = document.getElementById('matris-switch');
const motivationBanner = document.getElementById('motivation-banner');
const motivationText = document.getElementById('motivation-text');

let myChart = null;
let currentUserRole = "";
let showStudentMatris = false;

// İLİŞKİSEL KİTAP LİSTESİ VERİ TABANI (Sınav Türü + Ders Filtreli)
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
    { name: "AllStar AYT Fizik Soru Bankası", sinav: "AYT", ders: "Fizik" },
    
    { name: "ÜçDörtBeş TYT Kimya Soru Bankası", sinav: "TYT", ders: "Kimya" },
    { name: "ÜçDörtBeş AYT Kimya Soru Bankası", sinav: "AYT", ders: "Kimya" },
    
    { name: "ÜçDörtBeş TYT Biyoloji Soru Bankası", sinav: "TYT", ders: "Biyoloji" },
    { name: "ÜçDörtBeş AYT Biyoloji Soru Bankası", sinav: "AYT", ders: "Biyoloji" },

    { name: "Apotemi TYT Tarih Soru Bankası", sinav: "TYT", ders: "Tarih" },
    { name: "3D TYT Tarih Soru Bankası", sinav: "TYT", ders: "Tarih" },
    { name: "Limit AYT Tarih Soru Bankası", sinav: "AYT", ders: "Tarih" },

    { name: "Bilgi Sarmal TYT Coğrafya", sinav: "TYT", ders: "Coğrafya" },
    { name: "Limit AYT Coğrafya", sinav: "AYT", ders: "Coğrafya" },

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

                for (let j = 0; j < bufferSize; j++) {
                    data[j] = Math.random() * 2 - 1;
                }

                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1000 + Math.random() * 800;

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                noise.start();
            }, i * (60 + Math.random() * 40));
        }
    } catch(e) {}
}

// SINAV TÜRÜ VE DERS BAZLI DİNAMİK KİTAP FİLTRELEME
async function filterBookList(sinavTur, dersAdi, targetSelectId) {
    const selectEl = document.getElementById(targetSelectId);
    if (!selectEl) return;

    if (!dersAdi) {
        selectEl.innerHTML = `<option value="">Önce Ders Seçiniz...</option>`;
        return;
    }

    try {
        let allBooks = [...defaultBooks];
        const snap = await getDocs(collection(db, "BookList"));
        
        snap.forEach(d => {
            const b = d.data();
            if (b.name) {
                allBooks.push({
                    name: b.name,
                    sinav: b.sinav || "TYT",
                    ders: b.ders || dersAdi
                });
            }
        });

        // Seçilen Ders ve Sınav Türüne Göre Filtrele
        const filteredBooks = allBooks.filter(b => {
            const dersMatch = b.ders.toLowerCase() === dersAdi.toLowerCase();
            const sinavMatch = !sinavTur || b.sinav.toLowerCase() === sinavTur.toLowerCase();
            return dersMatch && sinavMatch;
        });

        let optionsHTML = `<option value="">${dersAdi} Kitabı Seçiniz...</option>`;
        
        if (filteredBooks.length > 0) {
            filteredBooks.forEach(b => {
                optionsHTML += `<option value="${b.name}">${b.name}</option>`;
            });
        }

        optionsHTML += `<option value="__YENI_KITAP__">➕ Listede Yok (Yeni ${dersAdi} Kitabı Ekle)</option>`;
        selectEl.innerHTML = optionsHTML;

    } catch(e) {
        console.error("Kitap filtreleme hatası:", e);
    }
}

async function addNewBookIfNotExist(bookName, sinav, ders) {
    if (!bookName || bookName === "__YENI_KITAP__") return;
    try {
        const exists = defaultBooks.some(b => b.name === bookName);
        if (!exists) {
            await addDoc(collection(db, "BookList"), { 
                name: bookName, 
                sinav: sinav || "TYT", 
                ders: ders || "Genel" 
            });
        }
    } catch(e) {}
}

function dersIsminiTemizle(ders) {
    if (!ders) return "";
    return ders.toString().replace(/^(TYT|AYT)\s+/i, "").trim();
}

function metniTemizle(str) {
    if (!str) return "";
    return str.toString().trim()
        .replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i")
        .replace(/Ğ/g, "g").replace(/ğ/g, "g")
        .replace(/Ü/g, "u").replace(/ü/g, "u")
        .replace(/Ş/g, "s").replace(/ş/g, "s")
        .replace(/Ö/g, "o").replace(/ö/g, "o")
        .replace(/Ç/g, "c").replace(/ç/g, "c")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// FORM ELEMANLARININ DİNAMİK DİNLENMESİ (EVENT LISTENERS)
function setupDynamicBookFilters() {
    // Öğrenci Test Giriş Formu Dinleyicisi
    const studentDers = document.getElementById('ders');
    if (studentDers) {
        studentDers.addEventListener('change', (e) => {
            filterBookList('TYT', e.target.value, 'kaynak-kitap-select');
        });
    }

    // Ödev Atama Formu Dinleyicisi (Sınav Türü + Ders)
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

// OTURUM KONTROLÜ
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
                if(adminPanel) adminPanel.classList.add('d-none');
                if(motivationBanner) motivationBanner.classList.add('d-none');

                await loadMatrisSettings();
                setupDynamicBookFilters();

                if (currentUserRole === "Admin") {
                    if(adminPanel) adminPanel.classList.remove('d-none');
                    loadAdminKpi();
                } else if (currentUserRole === "Öğretmen" || currentUserRole === "Ogretmen") {
                    if(teacherAssignPanel) teacherAssignPanel.classList.remove('d-none');
                } else if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                    if(studentPanel) studentPanel.classList.remove('d-none');

                    if (motivationBanner && motivationText) {
                        const randomQuote = motivationQuotes[Math.floor(Math.random() * motivationQuotes.length)];
                        motivationText.innerText = randomQuote;
                        motivationBanner.classList.remove('d-none');
                        setTimeout(() => { playClapSound(); }, 600);
                    }
                }

                if (konuMatrisiCard) {
                    if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                        if (showStudentMatris) konuMatrisiCard.classList.remove('d-none');
                        else konuMatrisiCard.classList.add('d-none');
                    } else {
                        konuMatrisiCard.classList.remove('d-none');
                    }
                }

                loadStudentTests();
                loadAssignments();
                loadKocNotu();
                loadDenemeler();
                loadKonuMatrisiAndAnaliz();
                loadSonDenemelerAnalizi();
                loadDuyuru();
                hesaplaYksSayac();
            }
        } catch (error) {
            console.error("Kullanıcı okuma hatası:", error);
        }
    } else {
        if(loginScreen) loginScreen.classList.remove('d-none');
        if(mainScreen) mainScreen.classList.add('d-none');
    }
});

async function loadMatrisSettings() {
    try {
        const snap = await getDoc(doc(db, "Settings", "MatrisConfig"));
        if (snap.exists()) {
            showStudentMatris = snap.data().showToStudent === true;
        } else {
            showStudentMatris = false;
        }
        if (matrisSwitch) {
            matrisSwitch.checked = showStudentMatris;
            matrisSwitch.onchange = async function() {
                const isChecked = this.checked;
                try {
                    await setDoc(doc(db, "Settings", "MatrisConfig"), { showToStudent: isChecked });
                    showStudentMatris = isChecked;
                    alert(`Konu İlerleme Haritası öğrenci ekranında ${isChecked ? 'AÇILDI' : 'KAPATILDI'}.`);
                } catch(e) { alert("Ayar kaydedilemedi!"); }
            };
        }
    } catch(e) {}
}

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

if(logoutBtn) {
    logoutBtn.addEventListener('click', () => { signOut(auth); });
}

window.tumTestVerileriniSil = async function() {
    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) {
        confirmBtn.innerText = "Siliniyor...";
        confirmBtn.disabled = true;
    }

    try {
        const collectionsToClear = ["TestEntries", "Assignments", "Denemeler", "HataDefteri", "StudyTimes"];

        for (const colName of collectionsToClear) {
            const snap = await getDocs(collection(db, colName));
            const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, colName, docSnap.id)));
            await Promise.all(deletePromises);
        }

        alert("Tüm test, deneme ve ödev verileri temizlendi!");

        const modalEl = document.getElementById('resetConfirmModal');
        if(modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();
        }

        window.location.reload();
    } catch(e) {
        alert("Veriler silinirken hata oluştu!");
        if (confirmBtn) {
            confirmBtn.innerText = "Kalıcı Olarak Temizle";
            confirmBtn.disabled = false;
        }
    }
}

// SON 3 DENEME ANALİZ KARTLARI FONKSİYONU
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
            container.innerHTML += `
                <div class="col-md-4 mb-2">
                    <div class="p-3 bg-light rounded border border-primary shadow-sm">
                        <small class="text-muted fw-bold d-block">${idx + 1}. Son Deneme</small>
                        <strong class="text-dark d-block text-truncate">${d.denemeAdi}</strong>
                        <div class="mt-2">
                            <span class="badge bg-primary fs-6">${d.toplamNet} Net</span>
                            <span class="badge bg-success fs-6 ms-1">${d.alanPuanMetni || '-'}</span>
                        </div>
                    </div>
                </div>`;
        });
    } catch(e) {}
}

// ALAN BAZLI ANALİZ
async function loadKonuMatrisiAndAnaliz() {
    const barlarContainer = document.getElementById('alan-basari-barlari');
    const zayifList = document.getElementById('zayif-konular-listesi');
    const zayifBaslik = document.getElementById('zayif-konu-baslik');

    if(!barlarContainer || !zayifList) return;

    try {
        const testSnap = await getDocs(collection(db, "TestEntries"));

        if (testSnap.empty) {
            barlarContainer.innerHTML = `<div class="text-muted small p-2 bg-light rounded border">⚠️ Henüz çözülen test verisi bulunmuyor.</div>`;
            zayifList.innerHTML = `<li class="list-group-item text-muted small py-2">⚠️ Analiz için henüz test girilmedi.</li>`;
            if(zayifBaslik) {
                zayifBaslik.className = "fw-bold text-secondary";
                zayifBaslik.innerText = "📋 Zayıf Konu Analizi";
            }
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
                        <div class="progress" style="height: 12px;">
                            <div class="progress-bar ${barColor}" role="progressbar" style="width: ${oran}%"></div>
                        </div>
                    </div>`;
            }
        }

        zayifList.innerHTML = "";
        let zayifSayisi = 0;

        for (const [konu, stat] of Object.entries(konuIstatistik)) {
            const oran = Math.round((stat.dogru / stat.toplam) * 100);
            if (oran < 65) {
                zayifSayisi++;
                zayifList.innerHTML += `
                    <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                        <div>
                            <strong class="text-dark">${konu}</strong>
                            <br><small class="text-muted">${stat.ders}</small>
                        </div>
                        <span class="badge bg-danger rounded-pill">%${oran} Başarı</span>
                    </li>`;
            }
        }

        if (zayifSayisi === 0) {
            if(zayifBaslik) {
                zayifBaslik.className = "fw-bold text-success";
                zayifBaslik.innerText = "🎉 Zayıf Konu Bulunmuyor";
            }
            zayifList.innerHTML = "<li class='list-group-item text-success small py-2'>Tüm konularda başarı %65 üzerinde!</li>";
        } else {
            if(zayifBaslik) {
                zayifBaslik.className = "fw-bold text-danger";
                zayifBaslik.innerText = `🚨 Dikkat Edilmeli: ${zayifSayisi} Zayıf Konu Var`;
            }
        }

    } catch(e) {
        console.error("Analiz yükleme hatası:", e);
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
        const dogru = parseInt(document.getElementById('dogru').value) || 0;
        const yanlis = parseInt(document.getElementById('yanlis').value) || 0;
        const bos = parseInt(document.getElementById('bos').value) || 0;
        const sure = parseInt(document.getElementById('sure').value) || 0;
        const net = dogru - (yanlis / 4);

        const user = auth.currentUser;
        if(user && kaynakKitap) {
            try {
                await addDoc(collection(db, "TestEntries"), {
                    userId: user.uid, ders, kaynakKitap, konu, dogru, yanlis, bos, net, sure, tarih: serverTimestamp()
                });
                
                await addNewBookIfNotExist(kaynakKitap, 'TYT', ders);

                testEntryForm.reset();
                document.getElementById('kaynak-kitap-custom').classList.add('d-none');
                if(saveSuccess) saveSuccess.classList.remove('d-none');
                setTimeout(() => { if(saveSuccess) saveSuccess.classList.add('d-none'); }, 3000);
                loadStudentTests();
                loadKonuMatrisiAndAnaliz();
            } catch (error) { alert("Test kaydedilemedi!"); }
        }
    });
}

if(denemeForm) {
    denemeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const denemeAdi = document.getElementById('deneme-adi').value;
        const denemeTuru = document.getElementById('deneme-turu').value;

        const tytTurkce = parseFloat(document.getElementById('d-tyt-turkce').value) || 0;
        const tytSosyal = parseFloat(document.getElementById('d-tyt-sosyal').value) || 0;
        const tytMat = parseFloat(document.getElementById('d-tyt-mat').value) || 0;
        const tytFen = parseFloat(document.getElementById('d-tyt-fen').value) || 0;
        const tytToplamNet = tytTurkce + tytSosyal + tytMat + tytFen;

        const tytPuan = (tytTurkce * 3.3) + (tytSosyal * 3.4) + (tytMat * 3.3) + (tytFen * 3.4) + 100;

        let alanPuanMetni = `${tytPuan.toFixed(2)} TYT`;
        let toplamNet = tytToplamNet;

        if (denemeTuru === "AYT_EA") {
            const aytMat = parseFloat(document.getElementById('d-ayt-mat').value) || 0;
            const aytEdebiyat = parseFloat(document.getElementById('d-ayt-edebiyat').value) || 0;
            toplamNet += (aytMat + aytEdebiyat);
            const eaPuan = (tytPuan * 0.4) + (aytMat * 3.0) + (aytEdebiyat * 3.0) + 100;
            alanPuanMetni = `EA: ${eaPuan.toFixed(2)} Puan`;
        } else if (denemeTuru === "AYT_SAY") {
            const aytMat = parseFloat(document.getElementById('d-ayt-mat').value) || 0;
            const aytFen = parseFloat(document.getElementById('d-ayt-fen').value) || 0;
            toplamNet += (aytMat + aytFen);
            const sayPuan = (tytPuan * 0.4) + (aytMat * 3.0) + (aytFen * 2.8) + 100;
            alanPuanMetni = `SAY: ${sayPuan.toFixed(2)} Puan`;
        } else if (denemeTuru === "AYT_SOZ") {
            const aytEdebiyat = parseFloat(document.getElementById('d-ayt-edebiyat').value) || 0;
            const aytSos2 = parseFloat(document.getElementById('d-ayt-sos2').value) || 0;
            toplamNet += (aytEdebiyat + aytSos2);
            const sozPuan = (tytPuan * 0.4) + (aytEdebiyat * 3.0) + (aytSos2 * 2.9) + 100;
            alanPuanMetni = `SÖZ: ${sozPuan.toFixed(2)} Puan`;
        } else if (denemeTuru === "YDT") {
            const ydtDil = parseFloat(document.getElementById('d-ydt-dil').value) || 0;
            toplamNet += ydtDil;
            const dilPuan = (tytPuan * 0.4) + (ydtDil * 3.0) + 100;
            alanPuanMetni = `DİL: ${dilPuan.toFixed(2)} Puan`;
        }

        try {
            await addDoc(collection(db, "Denemeler"), {
                denemeAdi, denemeTuru, toplamNet: toplamNet.toFixed(2), alanPuanMetni, tarih: serverTimestamp()
            });
            denemeForm.reset();
            const modalEl = document.getElementById('denemeModal');
            if(modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
            }
            loadDenemeler();
            loadSonDenemelerAnalizi();
        } catch(error) { alert("Deneme kaydedilemedi!"); }
    });
}

async function loadDenemeler() {
    const tbody = document.getElementById('deneme-list-table');
    if(!tbody) return;
    try {
        const querySnapshot = await getDocs(collection(db, "Denemeler"));
        tbody.innerHTML = "";
        if(querySnapshot.empty) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>Henüz girilmiş deneme sınavı yok.</td></tr>";
            return;
        }
        querySnapshot.forEach(docSnap => {
            const d = docSnap.data();
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold text-start ps-3">${d.denemeAdi}</td>
                    <td><span class="badge bg-secondary">${d.denemeTuru || 'TYT'}</span></td>
                    <td><span class="badge bg-primary fs-6">${d.toplamNet} Net</span></td>
                    <td><span class="badge bg-success fs-6">${d.alanPuanMetni || '-'}</span></td>
                </tr>`;
        });
    } catch(e) {}
}

async function loadAssignments() {
    const listEl = document.getElementById('assignment-list');
    const user = auth.currentUser;
    if(!listEl || !user) return;

    try {
        const querySnapshot = await getDocs(collection(db, "Assignments"));
        listEl.innerHTML = "";
        if (querySnapshot.empty) {
            listEl.innerHTML = "<li class='list-group-item text-muted'>Atanmış aktif ödev bulunmuyor.</li>";
            return;
        }

        querySnapshot.forEach((documentSnap) => {
            const data = documentSnap.data();
            let badgeClass = data.durum === "Tamamlandı" ? "bg-success" : "bg-warning text-dark";

            listEl.innerHTML += `
                <li class='list-group-item d-flex justify-content-between align-items-center py-3'>
                    <div>
                        <span class="badge bg-secondary me-2">${data.sinav || 'TYT'}</span>
                        <strong>${data.ders}</strong> - ${data.konu}
                        <br><small class='text-muted'>Son Teslim: ${data.tarih}</small>
                    </div>
                    <span class='badge ${badgeClass}'>${data.durum}</span>
                </li>`;
        });
    } catch (error) {}
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
        let testLabels = [];
        let netData = [];
        let sayac = 1;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            testLabels.push(`${data.ders} (${sayac})`);
            netData.push(data.net);
            sayac++;
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

        const sureSnap = await getDocs(collection(db, "StudyTimes"));
        let toplamDk = 0;
        sureSnap.forEach(d => toplamDk += d.data().dakika || 0);
        const el3 = document.getElementById('kpi-toplam-sure');
        if(el3) el3.innerText = toplamDk + " Dk";

        const odevSnap = await getDocs(collection(db, "Assignments"));
        let tamamOdev = 0;
        odevSnap.forEach(d => { if(d.data().durum === "Tamamlandı") tamamOdev++; });
        const el4 = document.getElementById('kpi-tamam-odev');
        if(el4) el4.innerText = tamamOdev;
    } catch(e) {}
}

async function loadKocNotu() {
    try {
        const snap = await getDoc(doc(db, "Settings", "KocNotu"));
        if(snap.exists() && snap.data().metin) {
            const el = document.getElementById('student-koc-notu-text');
            if(el) el.innerText = snap.data().metin;
        }
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