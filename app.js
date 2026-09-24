import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

// YÖK Atlas Referans Veritabanı (Şartnameye Uygun Doğru İsimlendirmelerle)
const yokAtlasReferanslari = {
    "boun-ceng": { 
        yil: 2025, puanTuru: "SAY", katsayi: "0.12 (Normal)", obp: 485.50,
        netler: { "TYT Türkçe": 36.5, "TYT Sosyal": 15.2, "TYT Matematik": 38.5, "TYT Fen": 18.0, "AYT Matematik": 39.0, "AYT Fizik": 12.5, "AYT Kimya": 13.0, "AYT Biyoloji": 12.0 } 
    },
    "gs-hukuk": { 
        yil: 2025, puanTuru: "EA", katsayi: "0.12 (Normal)", obp: 470.20,
        netler: { "TYT Türkçe": 35.0, "TYT Sosyal": 16.5, "TYT Matematik": 34.0, "TYT Fen": 10.0, "AYT Matematik": 35.5, "AYT TDE": 22.0, "AYT Tarih-1": 8.5, "AYT Coğrafya-1": 5.0 } 
    },
    "boun-tde": { 
        yil: 2025, puanTuru: "SÖZ", katsayi: "0.12 (Normal)", obp: 460.00,
        netler: { "TYT Türkçe": 37.0, "TYT Sosyal": 17.5, "TYT Matematik": 25.0, "TYT Fen": 5.0, "AYT TDE": 23.0, "AYT Tarih-1": 9.0, "AYT Coğrafya-1": 6.0, "AYT Tarih-2": 9.5, "AYT Coğrafya-2": 10.0, "AYT Felsefe Grubu": 10.5, "AYT Din": 5.0 } 
    },
    "odtu-ing": { 
        yil: 2025, puanTuru: "DİL", katsayi: "0.12 (Normal)", obp: 440.00,
        netler: { "TYT Türkçe": 33.0, "TYT Sosyal": 14.5, "TYT Matematik": 22.0, "TYT Fen": 6.0, "YDT Dil": 75.5 } 
    }
};

let sonDenemeVerisi = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        document.getElementById('login-screen').classList.add('d-none');
        document.getElementById('main-screen').classList.remove('d-none');
        document.getElementById('role-text').innerText = "Öğrenci";
        loadDenemeler();
    }
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value)
        .catch(() => document.getElementById('error-msg').classList.remove('d-none'));
});

document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth).then(() => location.reload()); });

// ÖĞRENCİ DENEME GİRİŞİ VE OBP HESAPLAMASI
document.getElementById('deneme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const denemeAdi = document.getElementById('deneme-adi').value.trim();
    const denemeTuru = document.getElementById('deneme-turu').value;
    
    // OBP Girişi ve Dönüşümü
    let ogrenciObpInput = document.getElementById('ogrenci-obp').value;
    let obpPuani = 0;
    if (ogrenciObpInput) {
        let val = parseFloat(ogrenciObpInput);
        obpPuani = val <= 100 ? val * 5 : val; // Diploma notuysa 5 ile çarp
    }

    const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;

    const tytTurkce = parseNet('tyt-turkce');
    const tytSosyal = parseNet('tyt-sosyal');
    const tytMat = parseNet('tyt-mat');
    const tytFen = parseNet('tyt-fen');
    
    let toplamNet = tytTurkce + tytSosyal + tytMat + tytFen;
    let altNetler = { "TYT Türkçe": tytTurkce, "TYT Sosyal": tytSosyal, "TYT Matematik": tytMat, "TYT Fen": tytFen };
    
    // Basit Puan Simülasyon Katsayıları (Örnek)
    const tytPuan = (tytTurkce * 3.3) + (tytSosyal * 3.4) + (tytMat * 3.3) + (tytFen * 3.4) + 100;
    let hamPuanStr = `${tytPuan.toFixed(2)} TYT`;
    let yerlestirmePuanStr = obpPuani > 0 ? `${(tytPuan + (obpPuani * 0.12)).toFixed(2)} Y-TYT` : "Hesaplanamadı";

    if (denemeTuru === "SAY") {
        const mat = parseNet('ayt-mat'), fiz = parseNet('ayt-fizik'), kim = parseNet('ayt-kimya'), biy = parseNet('ayt-biyo');
        toplamNet += (mat + fiz + kim + biy);
        altNetler["AYT Matematik"] = mat; altNetler["AYT Fizik"] = fiz; altNetler["AYT Kimya"] = kim; altNetler["AYT Biyoloji"] = biy;
        let p = (tytPuan * 0.4) + (mat * 3.0) + (fiz * 2.8) + (kim * 2.8) + (biy * 2.8) + 100;
        hamPuanStr = `${p.toFixed(2)} SAY`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-SAY` : "Hesaplanamadı";

    } else if (denemeTuru === "EA") {
        const mat = parseNet('ayt-mat'), tde = parseNet('ayt-tde'), tar1 = parseNet('ayt-tar1'), cog1 = parseNet('ayt-cog1');
        toplamNet += (mat + tde + tar1 + cog1);
        altNetler["AYT Matematik"] = mat; altNetler["AYT TDE"] = tde; altNetler["AYT Tarih-1"] = tar1; altNetler["AYT Coğrafya-1"] = cog1;
        let p = (tytPuan * 0.4) + (mat * 3.0) + (tde * 3.0) + (tar1 * 2.8) + (cog1 * 2.8) + 100;
        hamPuanStr = `${p.toFixed(2)} EA`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-EA` : "Hesaplanamadı";

    } else if (denemeTuru === "SOZ") {
        const tde = parseNet('ayt-tde'), tar1 = parseNet('ayt-tar1'), cog1 = parseNet('ayt-cog1');
        const tar2 = parseNet('ayt-tar2'), cog2 = parseNet('ayt-cog2'), fels = parseNet('ayt-fels'), din = parseNet('ayt-din');
        toplamNet += (tde + tar1 + cog1 + tar2 + cog2 + fels + din);
        altNetler["AYT TDE"] = tde; altNetler["AYT Tarih-1"] = tar1; altNetler["AYT Coğrafya-1"] = cog1; 
        altNetler["AYT Tarih-2"] = tar2; altNetler["AYT Coğrafya-2"] = cog2; altNetler["AYT Felsefe Grubu"] = fels; altNetler["AYT Din"] = din;
        let p = (tytPuan * 0.4) + (tde * 3.0) + (tar1 * 2.8) + (cog1 * 2.8) + (fels * 2.9) + 100;
        hamPuanStr = `${p.toFixed(2)} SÖZ`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-SÖZ` : "Hesaplanamadı";

    } else if (denemeTuru === "DIL") {
        const dil = parseNet('ydt-dil');
        toplamNet += dil;
        altNetler["YDT Dil"] = dil;
        let p = (tytPuan * 0.4) + (dil * 3.0) + 100;
        hamPuanStr = `${p.toFixed(2)} DİL`;
        yerlestirmePuanStr = obpPuani > 0 ? `${(p + (obpPuani * 0.12)).toFixed(2)} Y-DİL` : "Hesaplanamadı";
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
        
        if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>Henüz sınav girmediniz.</td></tr>"; return; }
        
        let counter = 0;
        snap.forEach(docSnap => {
            const d = docSnap.data();
            if (counter === 0) sonDenemeVerisi = d.altNetler; // Karşılaştırma için en güncel denemeyi hafızada tut

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
            counter++;
        });
    } catch(e) {}
}

window.hedefKarsilastir = function() {
    const secim = document.getElementById('hedef-program-select').value;
    const container = document.getElementById('karsilastirma-container');
    const tbody = document.getElementById('karsilastirma-body');
    const refBilgiAlani = document.getElementById('referans-bilgi-alani');
    
    if (!secim) { alert("Lütfen YÖK Atlas referans programı seçin."); return; }
    if (!sonDenemeVerisi) { alert("Sistemde karşılaştırma yapılacak deneme sonucunuz bulunmuyor."); return; }

    const ref = yokAtlasReferanslari[secim];
    
    // Referans Üst Bilgilerini Yaz
    document.getElementById('ref-yil-turu').innerText = `${ref.yil} - ${ref.puanTuru}`;
    document.getElementById('ref-katsayi').innerText = ref.katsayi;
    document.getElementById('ref-obp').innerText = ref.obp;
    
    refBilgiAlani.classList.remove('d-none');
    container.classList.remove('d-none');
    tbody.innerHTML = "";

    for (const [ders, refNet] of Object.entries(ref.netler)) {
        // Eksik ders verisini 0 değil null olarak kabul ediyoruz
        const ogrenciNet = sonDenemeVerisi.hasOwnProperty(ders) ? sonDenemeVerisi[ders] : null; 
        
        let fark = ogrenciNet !== null ? (ogrenciNet - refNet).toFixed(2) : null;
        let durum = "";

        if (fark === null) { 
            durum = `<span class="badge bg-secondary">Tıraş/Null (Çözülmemiş)</span>`; 
        }
        else if (fark >= 0) { 
            durum = `<span class="badge bg-success">+${fark} (Üstünde)</span>`; 
        }
        else { 
            durum = `<span class="badge bg-danger">${fark} (Gerisinde)</span>`; 
        }

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${ders}</td>
                <td>${ogrenciNet !== null ? ogrenciNet : '-'}</td>
                <td>${refNet}</td>
                <td>${durum}</td>
            </tr>`;
    }
}