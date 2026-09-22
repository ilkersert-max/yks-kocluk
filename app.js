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
const assignmentForm = document.getElementById('assignment-form');
const assignmentSuccess = document.getElementById('assignment-success');

const studyTimeForm = document.getElementById('study-time-form');
const kocNotuForm = document.getElementById('koc-notu-form');
const kocNotuInput = document.getElementById('koc-notu-input');
const kocNotuSuccess = document.getElementById('koc-notu-success');
const studentKocNotuCard = document.getElementById('student-koc-notu-card');
const studentKocNotuText = document.getElementById('student-koc-notu-text');

const denemeForm = document.getElementById('deneme-form');
const sifreDegisForm = document.getElementById('sifre-degis-form');
const yeniSifreInput = document.getElementById('yeni-sifre');
const sifreSuccess = document.getElementById('sifre-success');

const adminDuyuruForm = document.getElementById('admin-duyuru-form');
const adminDuyuruInput = document.getElementById('admin-duyuru-input');
const duyuruBanner = document.getElementById('duyuru-banner');
const duyuruText = document.getElementById('duyuru-text');

let myChart = null;
let activeAssignmentDocId = null;
let currentUserRole = "";

let soruDurumlari = {};
let mevcutToplamSoru = 20;

// --- DERS VE METİN TEMİZLEME YARDIMCILARI ---
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

// --- OTURUM KONTROLÜ VE ROL YÖNETİMİ ---
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
                if(studentKocNotuCard) studentKocNotuCard.classList.add('d-none');

                if (currentUserRole === "Admin") {
                    if(adminPanel) adminPanel.classList.remove('d-none');
                    loadAdminKpi();
                } else if (currentUserRole === "Öğretmen" || currentUserRole === "Ogretmen") {
                    if(teacherAssignPanel) teacherAssignPanel.classList.remove('d-none');
                } else if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                    if(studentPanel) studentPanel.classList.remove('d-none');
                    if(studentKocNotuCard) studentKocNotuCard.classList.remove('d-none');
                }

                loadStudentTests();
                loadAssignments();
                loadKocNotu();
                loadDenemeler();
                loadHataDefteri();
                loadKonuMatrisiAndAnaliz();
                loadDuyuru();
                hesaplaYksSayac();
            }
        } catch (error) {
            console.error("Kullanıcı verisi okunamadı:", error);
        }
    } else {
        if(loginScreen) loginScreen.classList.remove('d-none');
        if(mainScreen) mainScreen.classList.add('d-none');
    }
});

// --- GİRİŞ / ÇIKIŞ ---
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

// --- ÖĞRENCİ DOSTU HIZLI ÖDEV TAMAMLAMA MODALI ---
window.openCompleteModal = function(docId) {
    activeAssignmentDocId = docId;
    mevcutToplamSoru = 20; 
    soruDurumlari = {};

    for (let i = 1; i <= mevcutToplamSoru; i++) {
        soruDurumlari[i] = 'dogru';
    }

    renderHizliSoruMatrisi();
    hesaplaVeGuncelleOzet();

    const myModal = new bootstrap.Modal(document.getElementById('completeAssignmentModal'));
    myModal.show();
}

function renderHizliSoruMatrisi() {
    const container = document.getElementById('soru-buton-container');
    if (!container) return;

    container.innerHTML = "";
    for (let i = 1; i <= mevcutToplamSoru; i++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `soru-btn-${i}`;
        btn.className = 'btn btn-outline-success btn-sm px-3 py-2 fw-bold';
        btn.innerText = `Soru ${i}`;
        btn.onclick = function() { toggleHizliSoru(i, btn); };
        container.appendChild(btn);
    }
}

function toggleHizliSoru(soruNo, btn) {
    const mevcutDurum = soruDurumlari[soruNo];

    if (mevcutDurum === 'dogru') {
        soruDurumlari[soruNo] = 'yanlis';
        btn.className = 'btn btn-danger btn-sm px-3 py-2 fw-bold shadow-sm';
    } else if (mevcutDurum === 'yanlis') {
        soruDurumlari[soruNo] = 'bos';
        btn.className = 'btn btn-warning text-dark btn-sm px-3 py-2 fw-bold shadow-sm';
    } else {
        soruDurumlari[soruNo] = 'dogru';
        btn.className = 'btn btn-outline-success btn-sm px-3 py-2 fw-bold';
    }

    hesaplaVeGuncelleOzet();
}

function hesaplaVeGuncelleOzet() {
    let d = 0, y = 0, b = 0;

    for (let i = 1; i <= mevcutToplamSoru; i++) {
        if (soruDurumlari[i] === 'dogru') d++;
        else if (soruDurumlari[i] === 'yanlis') y++;
        else if (soruDurumlari[i] === 'bos') b++;
    }

    const net = d - (y / 4);

    const inputD = document.getElementById('modal-dogru');
    const inputY = document.getElementById('modal-yanlis');
    const inputB = document.getElementById('modal-bos');
    const elNet = document.getElementById('modal-net-preview');
    const durumText = document.getElementById('secim-durum-text');

    if(inputD) inputD.value = d;
    if(inputY) inputY.value = y;
    if(inputB) inputB.value = b;
    if(elNet) elNet.innerText = net.toFixed(2);

    if(durumText) {
        durumText.innerText = `${y} Yanlış, ${b} Boş Seçildi`;
    }
}

window.kaydetVeTamamla = async function() {
    if (!activeAssignmentDocId) return;

    let d = 0, y = 0, b = 0;
    let hatalisorular = [];

    for (let i = 1; i <= mevcutToplamSoru; i++) {
        if (soruDurumlari[i] === 'dogru') d++;
        else if (soruDurumlari[i] === 'yanlis') { y++; hatalisorular.push(`Soru ${i}`); }
        else if (soruDurumlari[i] === 'bos') { b++; hatalisorular.push(`Soru ${i} (Boş)`); }
    }

    const net = d - (y / 4);
    const aciklama = document.getElementById('modal-aciklama')?.value.trim() || "-";
    const yanlisSorularStr = hatalisorular.length > 0 ? hatalisorular.join(', ') : "-";
    const sonucMetni = `${d} Doğru, ${y} Yanlış, ${b} Boş (${net.toFixed(2)} Net)`;

    try {
        const assignmentRef = doc(db, "Assignments", activeAssignmentDocId);
        
        await updateDoc(assignmentRef, {
            durum: "Tamamlandı", sonucNotu: sonucMetni, yanlisSorular: yanlisSorularStr, aciklama: aciklama
        });

        if (hatalisorular.length > 0) {
            const user = auth.currentUser;
            if(user) {
                const assignSnap = await getDoc(assignmentRef);
                if(assignSnap.exists()) {
                    const aData = assignSnap.data();
                    await addDoc(collection(db, "HataDefteri"), {
                        userId: user.uid,
                        assignmentId: activeAssignmentDocId,
                        ders: aData.ders || "-",
                        konu: aData.konu || "-",
                        kaynak: aData.kitap || "Ödev Kaynağı",
                        soruNo: yanlisSorularStr,
                        aciklama: aciklama !== "-" ? aciklama : "Ödev Hatası",
                        durum: "Bekliyor",
                        kaynakTuru: "Ödev Sınavı",
                        tarih: serverTimestamp()
                    });
                }
            }
        }

        const modalEl = document.getElementById('completeAssignmentModal');
        if(modalEl) {
            const modal = bootstrap.Modal.getInstance(modalEl);
            if(modal) modal.hide();
        }

        loadAssignments();
        loadHataDefteri();
        loadKonuMatrisiAndAnaliz();
    } catch (error) { 
        alert("Ödev tamamlanırken hata oluştu!"); 
    }
}

// --- ELDEKİ KİTAPLARDAN HIZLI TEST KAYDI ---
if(testEntryForm) {
    testEntryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ders = document.getElementById('ders').value;
        const kaynakKitap = document.getElementById('kaynak-kitap').value.trim();
        const konu = document.getElementById('konu').value.trim();
        const dogru = parseInt(document.getElementById('dogru').value) || 0;
        const yanlis = parseInt(document.getElementById('yanlis').value) || 0;
        const bos = parseInt(document.getElementById('bos').value) || 0;
        const sure = parseInt(document.getElementById('sure').value) || 0;
        const net = dogru - (yanlis / 4);

        const user = auth.currentUser;
        if(user) {
            try {
                await addDoc(collection(db, "TestEntries"), {
                    userId: user.uid, ders, kaynakKitap, konu, dogru, yanlis, bos, net, sure, tarih: serverTimestamp()
                });
                testEntryForm.reset();
                if(saveSuccess) saveSuccess.classList.remove('d-none');
                setTimeout(() => { if(saveSuccess) saveSuccess.classList.add('d-none'); }, 3000);
                loadStudentTests();
                loadKonuMatrisiAndAnaliz();
            } catch (error) { alert("Test kaydedilemedi!"); }
        }
    });
}

// --- DENEME VE PUAN HESAPLAMA ---
if(denemeForm) {
    denemeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const denemeAdi = document.getElementById('deneme-adi').value;
        const turkce = parseFloat(document.getElementById('d-turkce').value) || 0;
        const sosyal = parseFloat(document.getElementById('d-sosyal').value) || 0;
        const mat = parseFloat(document.getElementById('d-mat').value) || 0;
        const fen = parseFloat(document.getElementById('d-fen').value) || 0;
        const toplamNet = turkce + sosyal + mat + fen;

        // ÖSYM Standart TYT Puanı Simülasyonu
        const tytPuan = (turkce * 3.3) + (sosyal * 3.4) + (mat * 3.3) + (fen * 3.4) + 100;

        try {
            await addDoc(collection(db, "Denemeler"), {
                denemeAdi, turkce, sosyal, mat, fen, toplamNet, tytPuan: tytPuan.toFixed(2), tarih: serverTimestamp()
            });
            denemeForm.reset();
            const modalEl = document.getElementById('denemeModal');
            if(modalEl) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if(modal) modal.hide();
            }
            loadDenemeler();
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
            tbody.innerHTML = "<tr><td colspan='7' class='text-center text-muted'>Henüz girilmiş deneme sınavı yok.</td></tr>";
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
                    <td><span class="badge bg-primary fs-6">${d.toplamNet.toFixed(2)}</span></td>
                    <td><span class="badge bg-success fs-6">${d.tytPuan || '-'} Puan</span></td>
                </tr>`;
        });
    } catch(e) {}
}

// --- MÜFREDAT VE ANALİZLER ---
const mufredat = {
    "Matematik": ["Temel Kavramlar", "Sayı Basamakları", "Bölünebilme", "Denklem Çözme", "Üslü-Köklü Sayılar", "Çarpanlara Ayırma", "Fonksiyonlar", "Polinomlar", "Trigonometri", "Limit", "Türev", "İntegral"],
    "Geometri": ["Üçgenler", "Çokgenler", "Dörtgenler ve Yamuk", "Çember ve Daire", "Katı Cisimler", "Analitik Geometri"],
    "Türkçe": ["Sözcükte Anlam", "Cümlede Anlam", "Paragraf", "Yazım Kuralları", "Noktalama İşaretleri", "Cümlenin Ögeleri"],
    "Fizik": ["Fizik Bilimine Giriş", "Hareket ve Kuvvet", "İş, Güç ve Enerji", "Isı ve Sıcaklık", "Elektrik ve Manyetizma", "Optik"],
    "Kimya": ["Kimya Bilimi", "Atom ve Periyodik Sistem", "Maddenin Halleri", "Asitler, Bazlar ve Tuzlar", "Kimyasal Denge"],
    "Biyoloji": ["Hücre", "Canlılar Dünyası", "Kalıtım", "Ekoloji", "Solunum ve Fotosentez", "İnsan Fizyolojisi"]
};

async function loadKonuMatrisiAndAnaliz() {
    const container = document.getElementById('konu-matris-container');
    const barlarContainer = document.getElementById('ders-basari-barlari');
    const zayifList = document.getElementById('zayif-konular-listesi');
    const zayifBaslik = document.getElementById('zayif-konu-baslik');
    const user = auth.currentUser;

    if(!container || !barlarContainer || !zayifList || !user) return;

    try {
        let testQuery = collection(db, "TestEntries");
        let odevQuery = collection(db, "Assignments");

        if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
            testQuery = query(collection(db, "TestEntries"), where("userId", "==", user.uid));
        }

        const testSnap = await getDocs(testQuery);
        const odevSnap = await getDocs(odevQuery);

        let toplamOdev = odevSnap.size;
        let tamamlananOdev = 0;
        odevSnap.forEach(d => { if(d.data().durum === "Tamamlandı") tamamlananOdev++; });
        const odevOran = toplamOdev > 0 ? Math.round((tamamlananOdev / toplamOdev) * 100) : 0;
        
        const elOdev = document.getElementById('analiz-odev-basari');
        if(elOdev) elOdev.innerText = `%${odevOran}`;

        const dersKonuSayaclari = {};
        const dersIstatistik = {};
        const konuIstatistik = {};

        testSnap.forEach(docSnap => {
            const d = docSnap.data();
            const hamDers = d.ders || "Diğer";
            const ders = dersIsminiTemizle(hamDers);
            const girilenKonu = d.konu || "Genel";
            const temizKonu = metniTemizle(girilenKonu);
            const toplamSoru = (d.dogru || 0) + (d.yanlis || 0) + (d.bos || 0);

            if (ders && temizKonu) {
                if (!dersKonuSayaclari[ders]) dersKonuSayaclari[ders] = {};
                dersKonuSayaclari[ders][temizKonu] = (dersKonuSayaclari[ders][temizKonu] || 0) + 1;
            }

            if (toplamSoru > 0) {
                if (!dersIstatistik[ders]) dersIstatistik[ders] = { dogru: 0, toplam: 0 };
                dersIstatistik[ders].dogru += d.dogru || 0;
                dersIstatistik[ders].toplam += toplamSoru;

                if (!konuIstatistik[girilenKonu]) konuIstatistik[girilenKonu] = { ders: ders, dogru: 0, toplam: 0 };
                konuIstatistik[girilenKonu].dogru += d.dogru || 0;
                konuIstatistik[girilenKonu].toplam += toplamSoru;
            }
        });

        odevSnap.forEach(d => {
            const data = d.data();
            if (data.konu && data.durum === "Tamamlandı") {
                const hamDers = data.ders || "Diğer";
                const ders = dersIsminiTemizle(hamDers);
                const temizKonu = metniTemizle(data.konu);

                if (ders && temizKonu) {
                    if (!dersKonuSayaclari[ders]) dersKonuSayaclari[ders] = {};
                    dersKonuSayaclari[ders][temizKonu] = (dersKonuSayaclari[ders][temizKonu] || 0) + 1;
                }
            }
        });

        barlarContainer.innerHTML = "";
        let genelToplamDogru = 0;
        let genelToplamSoru = 0;

        for (const [ders, stat] of Object.entries(dersIstatistik)) {
            const oran = Math.round((stat.dogru / stat.toplam) * 100);
            genelToplamDogru += stat.dogru;
            genelToplamSoru += stat.toplam;

            let barColor = "bg-danger";
            if (oran >= 75) barColor = "bg-success";
            else if (oran >= 50) barColor = "bg-warning";

            barlarContainer.innerHTML += `
                <div class="mb-2">
                    <div class="d-flex justify-content-between small fw-bold mb-1">
                        <span>${ders}</span>
                        <span>%${oran} Doğruluk (${stat.dogru}/${stat.toplam} Soru)</span>
                    </div>
                    <div class="progress" style="height: 10px;">
                        <div class="progress-bar ${barColor}" role="progressbar" style="width: ${oran}%"></div>
                    </div>
                </div>`;
        }

        const genelOran = genelToplamSoru > 0 ? Math.round((genelToplamDogru / genelToplamSoru) * 100) : 0;
        const elGenel = document.getElementById('analiz-genel-hakimiyet');
        if(elGenel) elGenel.innerText = `%${genelOran}`;

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
                zayifBaslik.innerText = "🚨 Dikkat Edilmeli: Zayıf Konular (Doğruluk <%65)";
            }
        }
        
        const elZayif = document.getElementById('analiz-zayif-konu-sayisi');
        if(elZayif) elZayif.innerText = `${zayifSayisi} Konu`;

        renderKonuMatrisi(container, dersKonuSayaclari);

    } catch(e) {
        console.error("Analiz ve matris yükleme hatası:", e);
    }
}

function renderKonuMatrisi(container, dersKonuSayaclari) {
    container.innerHTML = "";
    for (const [ders, konular] of Object.entries(mufredat)) {
        let konularHTML = "";
        const temizDersAdi = dersIsminiTemizle(ders);
        const dersiAitSayaclar = dersKonuSayaclari[temizDersAdi] || {};

        konular.forEach(konu => {
            const temizMufredatKonu = metniTemizle(konu);
            
            let cozulmeSayisi = 0;
            for (const [key, count] of Object.entries(dersiAitSayaclar)) {
                if (key.includes(temizMufredatKonu) || temizMufredatKonu.includes(key)) {
                    cozulmeSayisi += count;
                }
            }

            let bgClass = "bg-secondary text-white";
            let durumText = "Başlanmadı";

            if (cozulmeSayisi >= 3) {
                bgClass = "bg-success text-white";
                durumText = "Tamamlandı";
            } else if (cozulmeSayisi > 0) {
                bgClass = "bg-warning text-dark";
                durumText = "Çalışılıyor";
            }

            konularHTML += `<span class="badge ${bgClass} m-1 p-2" title="${cozulmeSayisi} kez işlendi/çözüldü">${konu} (${durumText})</span>`;
        });

        container.innerHTML += `
            <div class="col-md-6 mb-3">
                <div class="border p-3 rounded bg-white shadow-sm">
                    <h6 class="text-primary fw-bold border-bottom pb-2">${ders} Konuları</h6>
                    <div>${konularHTML}</div>
                </div>
            </div>`;
    }
}

window.loadHataDefteri = async function() {
    const listEl = document.getElementById('hata-defteri-listesi');
    const sayacEl = document.getElementById('hata-bekleyen-sayac');
    const user = auth.currentUser;

    if (!listEl || !user) return;

    try {
        let q = collection(db, "HataDefteri");
        if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
            q = query(collection(db, "HataDefteri"), where("userId", "==", user.uid));
        }

        const snap = await getDocs(q);
        listEl.innerHTML = "";

        if (snap.empty) {
            listEl.innerHTML = "<tr><td colspan='5' class='text-center text-muted py-3'>Hata defterinde kayıtlı yanlış soru yok.</td></tr>";
            if(sayacEl) sayacEl.innerText = "0 Tekrar Bekliyor";
            return;
        }

        let bekleyenSayisi = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const isCompleted = data.durum === "Tekrar Edildi";

            if (!isCompleted) bekleyenSayisi++;

            let btnHTML = "";

            if (currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") {
                if (isCompleted) {
                    btnHTML = `<span class="badge bg-success py-2 px-3">Tekrar Edildi / Anlaşıldı ✓</span>`;
                } else {
                    btnHTML = `<button class="btn btn-sm btn-outline-success fw-bold" onclick="hataTekrarEt('${docId}')">Tekrar Ettim / Anladım ✓</button>`;
                }
            } else if (currentUserRole === "Öğretmen" || currentUserRole === "Ogretmen" || currentUserRole === "Admin") {
                if (isCompleted) {
                    btnHTML = `<span class="badge bg-success py-2 px-3">🟢 Öğrenci Tekrar Etti</span>`;
                } else {
                    btnHTML = `<span class="badge bg-danger py-2 px-3">🔴 Öğrenci Tekrarı Bekliyor</span>`;
                }
            } else {
                btnHTML = isCompleted 
                    ? `<span class="badge bg-success py-2 px-3">Anlaşıldı ✓</span>` 
                    : `<span class="badge bg-warning text-dark py-2 px-3">Tekrar Bekliyor</span>`;
            }

            listEl.innerHTML += `
                <tr class="${isCompleted ? 'table-light text-muted' : ''}">
                    <td><strong>${data.ders}</strong><br><small class="text-muted">${data.konu}</small></td>
                    <td><span class="text-primary fw-bold">${data.kaynak}</span></td>
                    <td><span class="badge bg-danger fs-6">${data.soruNo}</span></td>
                    <td><small>${data.aciklama}</small></td>
                    <td>${btnHTML}</td>
                </tr>`;
        });

        if(sayacEl) sayacEl.innerText = `${bekleyenSayisi} Tekrar Bekliyor`;

    } catch (e) {}
}

window.hataTekrarEt = async function(docId) {
    try {
        const ref = doc(db, "HataDefteri", docId);
        await updateDoc(ref, { durum: "Tekrar Edildi" });
        loadHataDefteri();
    } catch (e) {}
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
            const docId = documentSnap.id;
            let badgeClass = "bg-warning text-dark";
            if (data.durum === "Tamamlandı") badgeClass = "bg-success";

            let actionButton = "";
            if ((currentUserRole === "Öğrenci" || currentUserRole === "Ogrenci") && data.durum === "Bekliyor") {
                actionButton = `<button class='btn btn-sm btn-success ms-3' onclick='openCompleteModal("${docId}")'>Tamamla & Analiz Gir ✓</button>`;
            }

            let ekBilgilerHTML = "";
            if (data.kitap && data.kitap !== "-") {
                ekBilgilerHTML += `<br><small class='text-primary fw-bold'>📖 <strong>Kaynak:</strong> ${data.kitap}</small>`;
            }

            let detayHTML = "";
            if (data.durum === "Tamamlandı") {
                detayHTML = `<br><small class='text-primary fw-bold'>Özet: ${data.sonucNotu || '-'}</small>`;
                if (data.yanlisSorular && data.yanlisSorular !== "-") {
                    detayHTML += `<br><small class='text-danger'>❌ Hatalı Sorular: <strong>${data.yanlisSorular}</strong></small>`;
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
        if(snap.exists()) {
            const data = snap.data();
            if(data.metin) {
                if(studentKocNotuText) studentKocNotuText.innerText = data.metin;
                if(kocNotuInput) kocNotuInput.value = data.metin;
            }
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