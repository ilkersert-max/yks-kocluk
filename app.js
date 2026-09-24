import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, addDoc, getDocs, serverTimestamp, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

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

// YÖK Atlas Referans Veri Tabanı (Mock Data - Şartnameye Uygun)
const yokAtlasReferanslari = {
    "boun-ceng": { puanTuru: "SAY", netler: { "TYT Türkçe": 36.5, "TYT Sosyal": 15.2, "TYT Mat": 38.5, "TYT Fen": 18.0, "AYT Mat": 39.0, "Fizik": 12.5, "Kimya": 13.0, "Biyoloji": 12.0 } },
    "gs-hukuk": { puanTuru: "EA", netler: { "TYT Türkçe": 35.0, "TYT Sosyal": 16.5, "TYT Mat": 34.0, "TYT Fen": 10.0, "AYT Mat": 35.5, "AYT TDE": 22.0, "Tarih-1": 8.5, "Coğrafya-1": 5.0 } },
    "boun-tde": { puanTuru: "SÖZ", netler: { "TYT Türkçe": 37.0, "TYT Sosyal": 17.5, "TYT Mat": 25.0, "TYT Fen": 5.0, "AYT TDE": 23.0, "Tarih-1": 9.0, "Coğrafya-1": 6.0, "Tarih-2": 9.5, "Coğrafya-2": 10.0, "Felsefe Grubu": 10.5, "Din": 5.0 } }
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

document.getElementById('logout-btn').addEventListener('click', () => { signOut(auth).then(() => location.reload()); });

// Deneme Kayıt Formu Submi İşlemi (Doğru Yanlış Üzerinden)
document.getElementById('deneme-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const denemeAdi = document.getElementById('deneme-adi').value.trim();
    const denemeTuru = document.getElementById('deneme-turu').value;

    const parseNet = (subj) => parseFloat(document.getElementById('net-' + subj).innerText) || 0;

    const tytTurkce = parseNet('tyt-turkce');
    const tytSosyal = parseNet('tyt-sosyal');
    const tytMat = parseNet('tyt-mat');
    const tytFen = parseNet('tyt-fen');
    
    let toplamNet = tytTurkce + tytSosyal + tytMat + tytFen;
    let altNetler = { "TYT Türkçe": tytTurkce, "TYT Sosyal": tytSosyal, "TYT Mat": tytMat, "TYT Fen": tytFen };

    if (denemeTuru === "SAY") {
        const mat = parseNet('ayt-mat'), fiz = parseNet('ayt-fizik'), kim = parseNet('ayt-kimya'), biy = parseNet('ayt-biyo');
        toplamNet += (mat + fiz + kim + biy);
        altNetler["AYT Mat"] = mat; altNetler["Fizik"] = fiz; altNetler["Kimya"] = kim; altNetler["Biyoloji"] = biy;
    } else if (denemeTuru === "EA") {
        const mat = parseNet('ayt-mat'), tde = parseNet('ayt-tde'), tar1 = parseNet('ayt-tar1'), cog1 = parseNet('ayt-cog1');
        toplamNet += (mat + tde + tar1 + cog1);
        altNetler["AYT Mat"] = mat; altNetler["AYT TDE"] = tde; altNetler["Tarih-1"] = tar1; altNetler["Coğrafya-1"] = cog1;
    } else if (denemeTuru === "SOZ") {
        const tde = parseNet('ayt-tde'), tar1 = parseNet('ayt-tar1'), cog1 = parseNet('ayt-cog1');
        const tar2 = parseNet('ayt-tar2'), cog2 = parseNet('ayt-cog2'), fels = parseNet('ayt-fels'), din = parseNet('ayt-din');
        toplamNet += (tde + tar1 + cog1 + tar2 + cog2 + fels + din);
        altNetler["AYT TDE"] = tde; altNetler["Tarih-1"] = tar1; altNetler["Coğrafya-1"] = cog1; 
        altNetler["Tarih-2"] = tar2; altNetler["Coğrafya-2"] = cog2; altNetler["Felsefe Grubu"] = fels; altNetler["Din"] = din;
    } else if (denemeTuru === "DIL") {
        const dil = parseNet('ydt-dil');
        toplamNet += dil;
        altNetler["YDT Dil"] = dil;
    }

    try {
        await addDoc(collection(db, "Denemeler"), {
            denemeAdi, denemeTuru, toplamNet: toplamNet.toFixed(2), altNetler, tarih: serverTimestamp()
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
        
        if(snap.empty) { tbody.innerHTML = "<tr><td colspan='5' class='text-muted'>Veri yok.</td></tr>"; return; }
        
        let counter = 0;
        snap.forEach(docSnap => {
            const d = docSnap.data();
            if (counter === 0) sonDenemeVerisi = d.altNetler; // Karşılaştırma için son denemeyi tut

            let rozetler = "";
            for (const [ders, net] of Object.entries(d.altNetler)) {
                rozetler += `<span class="badge bg-light text-dark border deneme-badge">${ders}: <strong>${net}</strong></span> `;
            }
            tbody.innerHTML += `
                <tr>
                    <td class="fw-bold align-middle">${d.denemeAdi}</td>
                    <td class="align-middle"><span class="badge bg-secondary">${d.denemeTuru}</span></td>
                    <td class="align-middle text-start">${rozetler}</td>
                    <td class="align-middle"><span class="badge bg-primary">${d.toplamNet}</span></td>
                    <td class="align-middle"><span class="badge bg-info text-dark">Net Göstergesi</span></td>
                </tr>`;
            counter++;
        });
    } catch(e) {}
}

window.hedefKarsilastir = function() {
    const secim = document.getElementById('hedef-program-select').value;
    const container = document.getElementById('karsilastirma-container');
    const tbody = document.getElementById('karsilastirma-body');
    
    if (!secim) { alert("Lütfen bir hedef seçin."); return; }
    if (!sonDenemeVerisi) { alert("Sistemde karşılaştırılacak deneme kaydınız bulunmuyor."); return; }

    const ref = yokAtlasReferanslari[secim];
    container.classList.remove('d-none');
    tbody.innerHTML = "";

    for (const [ders, refNet] of Object.entries(ref.netler)) {
        // Eksik veriyi 0 kabul etme, null olarak işle[cite: 5]
        const ogrenciNet = sonDenemeVerisi.hasOwnProperty(ders) ? sonDenemeVerisi[ders] : null; 
        
        let fark = ogrenciNet !== null ? (ogrenciNet - refNet).toFixed(2) : null;
        let durum = "";

        if (fark === null) { durum = `<span class="badge bg-secondary">Hesaplanamadı</span>`; }
        else if (fark >= 0) { durum = `<span class="badge bg-success">+${fark} (Üstünde)</span>`; }
        else { durum = `<span class="badge bg-danger">${fark} (Gerisinde)</span>`; }

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${ders}</td>
                <td>${ogrenciNet !== null ? ogrenciNet : '-'}</td>
                <td>${refNet}</td>
                <td>${durum}</td>
            </tr>`;
    }
}