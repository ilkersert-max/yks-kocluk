
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

import {
  TESTS,
  TYPES,
  idsFor,
  parseNumber,
  format,
  computeExam,
  obpFromProfile,
  successIndicator
} from "./scoring.js";

/* =====================================================
   FIREBASE
===================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyBZCXNLoPoNcr7sgY46uzL1e-h1rkfSx8M",
  authDomain: "tayt-bbbbe.firebaseapp.com",
  projectId: "tayt-bbbbe",
  storageBucket: "tayt-bbbbe.firebasestorage.app",
  messagingSenderId: "367442443596",
  appId: "1:367442443596:web:be954f464173e2abe5e3e9"
};

const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const db = getFirestore(firebase);

const $ = id => document.getElementById(id);

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const settingsDefault = {
  examEntryMode: "BOTH",
  defaultEntryMode: "NET",
  studentDetailedMode: false
};

let user = null;
let role = "Öğrenci";
let userName = "";

let settings = { ...settingsDefault };

let profile = {
  diplomaStatus: "unknown",
  diplomaNote: null,
  brokenObp: false
};

let exams = [];
let tasks = [];
let tests = [];

let subscriptions = [];
let currentPage = "home";

let draftMode = "NET";
let draftType = "TYT";
let draft = {};
let draftMeta = {};

const isAdmin = () => role === "Admin";

const isStaff = () =>
  ["Admin", "Öğretmen", "Koç", "Veli"]
    .includes(role);

const canAssign = isStaff;

function toast(message, error = false) {
  const el = $("toast");

  el.textContent = message;
  el.style.background = error
    ? "#ad2932"
    : "#22324c";

  el.style.display = "block";

  setTimeout(() => {
    el.style.display = "none";
  }, 4500);
}

function numberValid(value) {
  return Number.isFinite(value);
}

function dateText(value) {
  if (!value) return "—";

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("tr-TR");
  }

  const s = String(value).slice(0, 10);

  return s.split("-").reverse().join(".");
}

function cardStat(name, value) {
  return `
    <div class="stat">
      <small>${escapeHTML(name)}</small>
      <strong>${escapeHTML(value)}</strong>
    </div>
  `;
}

/* =====================================================
   GİRİŞ VE KULLANICI
===================================================== */

function clearSubscriptions() {
  subscriptions.forEach(unsubscribe => unsubscribe());

  subscriptions = [];
  exams = [];
  tasks = [];
  tests = [];
}

function normalizeRole(value) {
  if (value === "Ogretmen") {
    return "Öğretmen";
  }

  const allowed = [
    "Admin",
    "Öğretmen",
    "Veli",
    "Koç",
    "Öğrenci"
  ];

  return allowed.includes(value)
    ? value
    : "Öğrenci";
}

async function startApplication(firebaseUser) {
  clearSubscriptions();

  user = firebaseUser;

  const userSnap = await getDoc(
    doc(db, "Users", user.uid)
  );

  const userData = userSnap.exists()
    ? userSnap.data()
    : {};

  role = normalizeRole(
    String(userData.Rol || "Öğrenci").trim()
  );

  userName = userData.AdSoyad || "Kullanıcı";

  $("hello").textContent =
    userName + " · " + role;

  const settingsSnap = await getDoc(
    doc(db, "Settings", "SystemConfig")
  );

  if (settingsSnap.exists()) {
    settings = {
      ...settingsDefault,
      ...settingsSnap.data()
    };
  }

  const profileSnap = await getDoc(
    doc(db, "StudentProfile", "mainStudent")
  );

  if (profileSnap.exists()) {
    profile = {
      ...profile,
      ...profileSnap.data()
    };
  }

  draftMode =
    settings.examEntryMode === "BOTH"
      ? settings.defaultEntryMode
      : settings.examEntryMode;

  if (!["NET", "DY"].includes(draftMode)) {
    draftMode = "NET";
  }

  $("login").hidden = true;
  $("app").hidden = false;

  /*
    Tek öğrenci olduğu için tüm denemeler,
    testler ve ödevler ortak veri merkezinden okunur.
  */

  const sources = [
    ["Denemeler", data => exams = data],
    ["Assignments", data => tasks = data],
    ["TestEntries", data => tests = data]
  ];

  sources.forEach(([name, callback]) => {
    const unsubscribe = onSnapshot(
      collection(db, name),

      snapshot => {
        callback(
          snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
          }))
        );

        render();
      },

      error => {
        toast(
          name + ": " + error.message,
          true
        );
      }
    );

    subscriptions.push(unsubscribe);
  });

  currentPage = "home";
  render();
}

onAuthStateChanged(auth, firebaseUser => {
  if (firebaseUser) {
    startApplication(firebaseUser)
      .catch(error => {
        toast(error.message, true);
      });
  } else {
    clearSubscriptions();

    user = null;

    $("app").hidden = true;
    $("login").hidden = false;
  }
});

$("login-form").addEventListener(
  "submit",

  async event => {
    event.preventDefault();

    $("login-error").textContent = "";

    try {
      await signInWithEmailAndPassword(
        auth,
        $("email").value,
        $("password").value
      );
    } catch (error) {
      $("login-error").textContent =
        "Giriş başarısız: " + error.code;
    }
  }
);

$("logout").addEventListener(
  "click",
  () => signOut(auth)
);

/* =====================================================
   SAYFA YÖNETİMİ
===================================================== */

function navigate(page) {
  currentPage = page;
  render();
}

function render() {
  if (!user) return;

  const menu = [
    ["home", "Özet"],
    ["exam", "Deneme Gir"],
    ["test", "Soru Çözdüm"],
    ["tasks", "Ödevler"],
    ["history", "Denemeler"]
  ];

  if (
    isStaff() ||
    settings.studentDetailedMode
  ) {
    menu.push(["analysis", "Analiz"]);
  }

  if (isStaff()) {
    menu.push(["reports", "Rapor"]);
  }

  if (isAdmin()) {
    menu.push(["admin", "Admin"]);
  }

  menu.push(["profile", "Diploma / OBP"]);

  $("nav").innerHTML = menu.map(
    ([id, label]) => `
      <button
        data-page="${id}"
        class="${currentPage === id ? "active" : ""}"
      >
        ${label}
      </button>
    `
  ).join("");

  document.querySelectorAll(
    "[data-page]"
  ).forEach(button => {
    button.onclick = () => navigate(
      button.dataset.page
    );
  });

  const pages = {
    home: renderHome,
    exam: renderExam,
    test: renderTest,
    tasks: renderTasks,
    history: renderHistory,
    analysis: renderAnalysis,
    reports: renderReports,
    admin: renderAdmin,
    profile: renderProfile
  };

  (pages[currentPage] || renderHome)();
}

/* =====================================================
   ANA EKRAN
===================================================== */

function renderHome() {
  const sorted = [...exams].sort(
    (a, b) =>
      String(b.examDate || "")
        .localeCompare(String(a.examDate || ""))
  );

  const latest = sorted[0];

  const completed = tasks.filter(t =>
    ["completed", "reviewed"].includes(
      t.status
    )
  ).length;

  $("content").innerHTML = `
    <div class="card">
      <h1>
        ${isStaff()
          ? "Öğrencinin Genel Durumu"
          : "Bugün ne yaptın? 👋"}
      </h1>

      <p class="muted">
        ${isStaff()
          ? "Denemeler, çalışmalar ve ödevler."
          : "Sonuçlarını kolayca kaydet."}
      </p>

      <div class="stats">
        ${cardStat(
          "Son Deneme",
          latest
            ? latest.denemeTuru + " · " +
              format(Number(latest.toplamNet))
            : "Henüz yok"
        )}

        ${cardStat(
          "Deneme Sayısı",
          exams.length
        )}

        ${cardStat(
          "Tamamlanan Ödev",
          completed + "/" + tasks.length
        )}

        ${cardStat(
          "Günlük Çalışma",
          tests.length
        )}
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>📝 Deneme Sonucu</h2>

        <p>
          Okul, kurs veya ev denemeni gir.
        </p>

        <button class="primary"
          data-go="exam">
          Deneme Ekle
        </button>
      </div>

      <div class="card">
        <h2>✏️ Soru Çözdüm</h2>

        <p>
          Bugünkü çalışmanı kaydet.
        </p>

        <button class="primary"
          data-go="test">
          Çalışma Ekle
        </button>
      </div>

      <div class="card">
        <h2>📚 Ödevler</h2>

        <p>
          Ödevlerini ve sonuçlarını gör.
        </p>

        <button class="primary"
          data-go="tasks">
          Ödevleri Aç
        </button>
      </div>
    </div>
  `;

  document.querySelectorAll(
    "[data-go]"
  ).forEach(button => {
    button.onclick = () =>
      navigate(button.dataset.go);
  });
}

/* =====================================================
   DENEME GİRİŞİ
===================================================== */

function renderExam() {
  const allowed =
    settings.examEntryMode === "BOTH"
      ? ["NET", "DY"]
      : [settings.examEntryMode];

  if (!allowed.includes(draftMode)) {
    draftMode = allowed[0] || "NET";
  }

  const modeButtons =
    allowed.length > 1
      ? `
        <div class="tabbar">
          <button type="button"
            data-mode="NET"
            class="${draftMode === "NET"
              ? "active" : ""}">
            ⚡ Hızlı Net
          </button>

          <button type="button"
            data-mode="DY"
            class="${draftMode === "DY"
              ? "active" : ""}">
            Doğru / Yanlış
          </button>
        </div>
      `
      : "";

  $("content").innerHTML = `
    <div class="card">
      <h1>Yeni Deneme Sonucu</h1>

      <p class="muted">
        Netler küsüratlı girilebilir.
        Boş alanlar sıfır sayılmaz.
      </p>

      <form id="exam-form">

        <div class="grid">

          <label>
            Deneme Adı
            <input id="exam-name"
              required
              value="${escapeHTML(draftMeta.name || "")}">
          </label>

          <label>
            Deneme Tarihi
            <input id="exam-date"
              type="date"
              required
              value="${draftMeta.date ||
                new Date().toISOString().slice(0, 10)}">
          </label>

          <label>
            Deneme Kaynağı
            <select id="exam-source">
              <option>Okul</option>
              <option>Kurs</option>
              <option>Ev / Bireysel</option>
              <option>Türkiye Geneli</option>
              <option>Diğer</option>
            </select>
          </label>

          <label>
            Sınav / Puan Türü
            <select id="exam-type">
              <option value="TYT">TYT</option>
              <option value="SAY">AYT SAY</option>
              <option value="EA">AYT EA</option>
              <option value="SOZ">AYT SÖZ</option>
              <option value="DIL">YDT DİL</option>
            </select>
          </label>

          <label>
            Yayın / Kurum
            <input id="exam-publisher"
              value="${escapeHTML(draftMeta.publisher || "")}">
          </label>

          <label>
            Kurumun Açıkladığı Puan
            <input id="exam-official"
              inputmode="decimal"
              placeholder="İsteğe bağlı">
          </label>

        </div>

        ${modeButtons}

        <div id="exam-rows"></div>

        <div id="exam-summary"
          class="summary">
        </div>

        <div id="exam-err"
          class="error">
        </div>

        <div class="buttons">
          <button class="primary">
            Denemeyi Kaydet
          </button>

          <button type="button"
            id="exam-clear"
            class="subtle">
            Temizle
          </button>
        </div>

      </form>

      <div class="warning">
        Gerçek ÖSYM puanı için doğrulanmış
        istatistiksel model gereklidir.
        Net başarı göstergesi, YKS puanı değildir.
      </div>
    </div>
  `;

  $("exam-type").value = draftType;

  $("exam-source").value =
    draftMeta.source || "Okul";

  $("exam-type").onchange = () => {
    saveDraftMeta();

    draftType = $("exam-type").value;

    draft = {};

    renderExam();
  };

  document.querySelectorAll(
    "[data-mode]"
  ).forEach(button => {
    button.onclick = () => {
      saveDraftMeta();

      draftMode = button.dataset.mode;

      draft = {};

      renderExam();
    };
  });

  $("exam-clear").onclick = () => {
    draft = {};
    draftMeta = {};

    renderExam();
  };

  $("exam-form").onsubmit = saveExam;

  renderExamRows();
}

function saveDraftMeta() {
  draftMeta = {
    name: $("exam-name").value.trim(),
    date: $("exam-date").value,
    source: $("exam-source").value,
    publisher:
      $("exam-publisher").value.trim()
  };
}

function renderExamRows() {
  const container = $("exam-rows");

  container.innerHTML = "";

  let previousGroup = "";

  for (const id of idsFor(draftType)) {
    const test = TESTS[id];

    if (test.group !== previousGroup) {
      previousGroup = test.group;

      const heading =
        document.createElement("h2");

      heading.textContent =
        test.group === "TYT"
          ? "TYT Dersleri"
          : test.group === "YDT"
            ? "YDT"
            : "Alan Dersleri";

      container.appendChild(heading);
    }

    const row = document.createElement("div");

    row.className =
      "testrow " +
      (draftMode === "NET"
        ? "netmode"
        : "");

    const title = document.createElement("strong");

    title.textContent = test.label;

    const count = document.createElement("span");

    count.className = "small";
    count.textContent = test.q + " soru";

    row.append(title, count);

    if (draftMode === "NET") {
      const input =
        document.createElement("input");

      input.inputMode = "decimal";
      input.placeholder = "Örn. 23,75";

      input.value =
        draft[id]?.net ?? "";

      input.oninput = () => {
        draft[id] = {
          net: input.value
        };

        updateExamSummary();
      };

      row.appendChild(input);
    } else {
      for (const field of [
        "correct",
        "wrong"
      ]) {
        const input =
          document.createElement("input");

        input.type = "number";
        input.min = "0";
        input.max = String(test.q);
        input.step = "1";

        input.placeholder =
          field === "correct"
            ? "Doğru"
            : "Yanlış";

        input.value =
          draft[id]?.[field] ?? "";

        input.oninput = () => {
          draft[id] = {
            ...(draft[id] || {}),
            [field]: input.value
          };

          updateExamSummary();
        };

        row.appendChild(input);
      }

      const preview =
        document.createElement("span");

      preview.id = "preview-" + id;
      preview.className =
        "testnet small";

      preview.textContent = "—";

      row.appendChild(preview);
    }

    container.appendChild(row);
  }

  updateExamSummary();
}

function updateExamSummary() {
  const summary = $("exam-summary");
  const error = $("exam-err");

  try {
    const result = computeExam(
      draftType,
      draftMode,
      draft
    );

    summary.textContent =
      "TYT: " +
      format(result.tytNet) +
      " · Alan: " +
      format(result.fieldNet) +
      " · Toplam: " +
      format(result.totalNet) +
      " net" +
      (result.complete
        ? ""
        : " · Kısmi giriş");

    error.textContent = "";

    for (const id of idsFor(draftType)) {
      const preview =
        $("preview-" + id);

      if (preview) {
        preview.textContent =
          format(result.results[id].net);
      }
    }
  } catch (err) {
    summary.textContent =
      "Sonuçları kontrol et.";

    error.textContent = err.message;
  }
}

async function saveExam(event) {
  event.preventDefault();

  saveDraftMeta();

  try {
    const result = computeExam(
      draftType,
      draftMode,
      draft
    );

    const reportedInput =
      $("exam-official").value.trim();

    const reportedScore =
      parseNumber(reportedInput);

    if (
      reportedInput !== "" &&
      reportedScore === null
    ) {
      throw Error(
        "Kurum puanı sayısal olmalıdır."
      );
    }

    const altNetler = {};

    for (const [id, item] of
      Object.entries(result.results)) {

      if (item.entered) {
        altNetler[TESTS[id].label] =
          item.net;
      }
    }

    const obp = obpFromProfile(profile);

    await addDoc(
      collection(db, "Denemeler"),

      {
        schemaVersion: 2,
        studentKey: "mainStudent",

        createdBy: user.uid,
        createdByRole: role,

        denemeAdi: draftMeta.name,
        denemeTuru: draftType,

        examDate: draftMeta.date,
        examSource: draftMeta.source,
        publisher: draftMeta.publisher,

        entryMode: draftMode,

        results: result.results,
        altNetler,

        tytNet: result.tytNet,
        fieldNet: result.fieldNet,

        toplamNet: result.totalNet,

        complete: result.complete,

        indicator:
          successIndicator(
            draftType,
            result
          ),

        indicatorLabel:
          "Net başarı göstergesi",

        reportedScore,

        obpSnapshot: obp,

        tarih: serverTimestamp()
      }
    );

    draft = {};
    draftMeta = {};

    toast("Deneme kaydedildi.");

    navigate("history");

  } catch (err) {
    $("exam-err").textContent =
      err.message;

    toast(err.message, true);
  }
}

/* =====================================================
   DIPLOMA NOTU VE OBP
===================================================== */

function renderProfile() {
  $("content").innerHTML = `
    <div class="card">
      <h1>Diploma Notu ve OBP</h1>

      <p>
        Diploma notu öğrenci profilinde
        bir kez tanımlanır.
      </p>

      <form id="profile-form">

        <label>
          Diploma Notu Durumu

          <select id="diploma-status">
            <option value="unknown">
              Henüz Belli Değil
            </option>

            <option value="estimated">
              Tahmini Diploma Notu
            </option>

            <option value="final">
              Kesinleşmiş Diploma Notu
            </option>
          </select>
        </label>

        <label>
          Diploma Notu (50–100)

          <input
            id="diploma-note"
            inputmode="decimal"
            placeholder="Örn. 90,25"
            value="${profile.diplomaNote ?? ""}">
        </label>

        <label>
          <input
            id="broken-obp"
            type="checkbox"
            style="width:auto"
            ${profile.brokenObp
              ? "checked"
              : ""}>

          Kırık OBP uygula
        </label>

        <div id="obp-preview"
          class="summary">
        </div>

        <p class="muted">
          OBP = Diploma Notu × 5.
          Normal katkı 0,12;
          kırık OBP katkısı 0,06.
        </p>

        <button class="primary">
          Bilgileri Kaydet
        </button>

      </form>
    </div>
  `;

  $("diploma-status").value =
    profile.diplomaStatus || "unknown";

  function preview() {
    const result = obpFromProfile({
      diplomaStatus:
        $("diploma-status").value,

      diplomaNote:
        $("diploma-note").value,

      brokenObp:
        $("broken-obp").checked
    });

    $("obp-preview").textContent =
      result
        ? "OBP: " +
          format(result.obp) +
          " · Katsayı: " +
          result.factor +
          " · Katkı: " +
          format(result.contribution) +
          (result.isEstimate
            ? " (Tahmini)"
            : "")
        : "OBP henüz hesaplanamıyor.";
  }

  $("diploma-status").onchange = preview;
  $("diploma-note").oninput = preview;
  $("broken-obp").onchange = preview;

  preview();

  $("profile-form").onsubmit =
    async event => {
      event.preventDefault();

      const status =
        $("diploma-status").value;

      const note = parseNumber(
        $("diploma-note").value
      );

      if (
        status !== "unknown" &&
        (
          note === null ||
          note < 50 ||
          note > 100
        )
      ) {
        toast(
          "Diploma notu 50–100 arasında olmalıdır.",
          true
        );

        return;
      }

      const updated = {
        diplomaStatus: status,

        diplomaNote:
          status === "unknown"
            ? null
            : note,

        brokenObp:
          $("broken-obp").checked,

        updatedAt:
          serverTimestamp()
      };

      try {
        await setDoc(
          doc(
            db,
            "StudentProfile",
            "mainStudent"
          ),

          updated,

          { merge: true }
        );

        profile = {
          ...profile,
          ...updated
        };

        toast("OBP bilgileri kaydedildi.");

        renderProfile();

      } catch (err) {
        toast(err.message, true);
      }
    };
}

/* =====================================================
   GÜNLÜK SORU ÇÖZÜMÜ
===================================================== */

function renderTest() {
  $("content").innerHTML = `
    <div class="card">

      <h1>Bugün Soru Çözdüm ✏️</h1>

      <form id="test-form">

        <div class="grid">

          <label>
            Ders
            <select id="test-subject" required>
              <option value="">Seçiniz</option>
              <option>Matematik</option>
              <option>Geometri</option>
              <option>Türkçe</option>
              <option>Edebiyat</option>
              <option>Fizik</option>
              <option>Kimya</option>
              <option>Biyoloji</option>
              <option>Tarih</option>
              <option>Coğrafya</option>
              <option>Felsefe</option>
              <option>Yabancı Dil</option>
            </select>
          </label>

          <label>
            Kitap / Yayın
            <input id="test-book" required>
          </label>

          <label>
            Konu / Test
            <input id="test-topic" required>
          </label>

          <label>
            Soru Sayısı
            <input id="test-count"
              type="number"
              min="1"
              required>
          </label>

          <label>
            Doğru
            <input id="test-correct"
              type="number"
              min="0"
              required>
          </label>

          <label>
            Yanlış
            <input id="test-wrong"
              type="number"
              min="0"
              required>
          </label>

        </div>

        <div id="test-preview"
          class="summary">
        </div>

        <button class="primary">
          Çalışmamı Kaydet
        </button>

      </form>

    </div>
  `;

  const preview = () => {
    const q = parseNumber(
      $("test-count").value
    );

    const d = parseNumber(
      $("test-correct").value
    );

    const y = parseNumber(
      $("test-wrong").value
    );

    if (
      q === null ||
      d === null ||
      y === null
    ) {
      $("test-preview").textContent =
        "Sonuçları gir.";
      return;
    }

    $("test-preview").textContent =
      format(d - y / 4) +
      " net · " +
      (q - d - y) +
      " boş";
  };

  [
    "test-count",
    "test-correct",
    "test-wrong"
  ].forEach(id => {
    $(id).oninput = preview;
  });

  $("test-form").onsubmit =
    async event => {
      event.preventDefault();

      const q = parseNumber(
        $("test-count").value
      );

      const d = parseNumber(
        $("test-correct").value
      );

      const y = parseNumber(
        $("test-wrong").value
      );

      if (
        ![q, d, y].every(Number.isInteger) ||
        q < 1 ||
        d < 0 ||
        y < 0 ||
        d + y > q
      ) {
        toast(
          "Soru sayılarını kontrol et.",
          true
        );

        return;
      }

      try {
        await addDoc(
          collection(db, "TestEntries"),

          {
            studentKey: "mainStudent",

            ders:
              $("test-subject").value,

            kitap:
              $("test-book").value.trim(),

            konu:
              $("test-topic").value.trim(),

            questionCount: q,

            dogru: d,
            yanlis: y,
            bos: q - d - y,

            net: d - y / 4,

            createdBy: user.uid,
            tarih: serverTimestamp()
          }
        );

        toast("Çalışma kaydedildi.");

        renderTest();

      } catch (err) {
        toast(err.message, true);
      }
    };
}

/* =====================================================
   DENEME GEÇMİŞİ
===================================================== */

function sortedExams() {
  return [...exams].sort(
    (a, b) =>
      String(b.examDate || "")
        .localeCompare(String(a.examDate || ""))
  );
}

function renderHistory() {
  $("content").innerHTML = `
    <div class="card">

      <h1>Deneme Geçmişi</h1>

      <div class="tablewrap">
        <table>

          <thead>
            <tr>
              <th>Deneme</th>
              <th>Tür</th>
              <th>Kaynak</th>
              <th>TYT</th>
              <th>Alan</th>
              <th>Toplam</th>
            </tr>
          </thead>

          <tbody>
            ${sortedExams().map(exam => `
              <tr>

                <td>
                  <strong>
                    ${escapeHTML(exam.denemeAdi)}
                  </strong>

                  <br>

                  <small>
                    ${dateText(
                      exam.examDate ||
                      exam.tarih
                    )}
                  </small>
                </td>

                <td>
                  ${escapeHTML(
                    exam.denemeTuru
                  )}
                </td>

                <td>
                  ${escapeHTML(
                    exam.examSource || "—"
                  )}
                </td>

                <td>
                  ${format(exam.tytNet)}
                </td>

                <td>
                  ${format(exam.fieldNet)}
                </td>

                <td>
                  <strong>
                    ${format(
                      Number(exam.toplamNet)
                    )}
                  </strong>
                </td>

              </tr>
            `).join("")}
          </tbody>

        </table>
      </div>

    </div>
  `;
}

/* =====================================================
   ÖDEVLER
===================================================== */

function renderTasks() {
  const assignForm = canAssign()
    ? `
      <div class="card">
        <h1>Yeni Ödev Ata</h1>

        <form id="task-form">

          <div class="grid">

            <label>
              Ders
              <input id="task-subject"
                required>
            </label>

            <label>
              Kitap
              <input id="task-book"
                required>
            </label>

            <label>
              Konu / Test
              <input id="task-topic"
                required>
            </label>

            <label>
              Soru Sayısı
              <input id="task-count"
                type="number"
                min="1"
                required>
            </label>

            <label>
              Hedef Doğru
              <input id="task-target"
                type="number"
                min="0">
            </label>

            <label>
              Son Tarih
              <input id="task-date"
                type="date"
                required>
            </label>

          </div>

          <label>
            Açıklama
            <textarea id="task-note"></textarea>
          </label>

          <button class="primary">
            Ödev Ata
          </button>

        </form>
      </div>
    `
    : "";

  $("content").innerHTML = `
    ${assignForm}

    <div class="card">
      <h1>Ödevler</h1>

      <div id="task-list"></div>
    </div>
  `;

  if (canAssign()) {
    $("task-form").onsubmit =
      saveTask;
  }

  renderTaskList();
}

async function saveTask(event) {
  event.preventDefault();

  const count = parseNumber(
    $("task-count").value
  );

  const target = parseNumber(
    $("task-target").value
  );

  if (
    !Number.isInteger(count) ||
    count < 1 ||
    (
      target !== null &&
      (
        !Number.isInteger(target) ||
        target < 0 ||
        target > count
      )
    )
  ) {
    toast(
      "Ödev soru sayısı geçersiz.",
      true
    );

    return;
  }

  try {
    await addDoc(
      collection(db, "Assignments"),

      {
        schemaVersion: 2,

        studentKey: "mainStudent",

        ders:
          $("task-subject").value.trim(),

        kitap:
          $("task-book").value.trim(),

        konu:
          $("task-topic").value.trim(),

        questionCount: count,
        targetCorrect: target,

        dueDate:
          $("task-date").value,

        note:
          $("task-note").value.trim(),

        status: "waiting",

        assignedBy: user.uid,
        assignedByRole: role,

        atanmaTarihi:
          serverTimestamp()
      }
    );

    toast("Ödev atandı.");

    renderTasks();

  } catch (err) {
    toast(err.message, true);
  }
}

function renderTaskList() {
  const list = $("task-list");

  list.innerHTML = "";

  if (tasks.length === 0) {
    list.textContent =
      "Henüz ödev yok.";

    return;
  }

  for (const task of tasks) {
    const card =
      document.createElement("div");

    card.className = "task";

    const oldRecord =
      !task.questionCount;

    card.innerHTML = `
      <div class="taskhead">
        <h3>
          ${escapeHTML(task.ders)}
          ·
          ${escapeHTML(task.konu)}
        </h3>

        <span class="pill">
          ${escapeHTML(
            task.status ||
            task.durum ||
            "Bekliyor"
          )}
        </span>
      </div>

      <p>
        ${escapeHTML(task.kitap)}
      </p>

      <p class="muted">
        Atayan:
        ${escapeHTML(
          task.assignedByRole ||
          "Eski kayıt"
        )}
      </p>

      <p>
        Son tarih:
        ${dateText(
          task.dueDate ||
          task.tarih
        )}
      </p>

      ${task.result
        ? `
          <div class="summary">
            ${task.result.correct} doğru ·
            ${task.result.wrong} yanlış ·
            ${task.result.blank} boş ·
            ${format(task.result.net)} net
          </div>
        `
        : ""}
    `;

    if (!oldRecord) {
      const resultButton =
        document.createElement("button");

      resultButton.className =
        "secondary";

      resultButton.textContent =
        "Sonuç Gir";

      resultButton.onclick = () =>
        showTaskResult(card, task);

      card.appendChild(
        resultButton
      );

      if (canAssign()) {
        const reviewButton =
          document.createElement("button");

        reviewButton.className =
          "subtle";

        reviewButton.textContent =
          "Değerlendir";

        reviewButton.onclick = () =>
          showTaskReview(card, task);

        card.appendChild(
          reviewButton
        );
      }
    }

    if (task.review) {
      const note =
        document.createElement("p");

      note.textContent =
        "Değerlendirme: " +
        task.review;

      card.appendChild(note);
    }

    list.appendChild(card);
  }
}

function showTaskResult(card, task) {
  const old = card.querySelector(
    ".task-result-editor"
  );

  if (old) {
    old.remove();
    return;
  }

  const form =
    document.createElement("form");

  form.className =
    "task-result-editor";

  form.innerHTML = `
    <h3>Ödev Sonucu</h3>

    <label>
      Çözülen Soru
      <input name="attempted"
        type="number"
        min="0"
        max="${task.questionCount}"
        required>
    </label>

    <label>
      Doğru
      <input name="correct"
        type="number"
        min="0"
        required>
    </label>

    <label>
      Yanlış
      <input name="wrong"
        type="number"
        min="0"
        required>
    </label>

    <label>
      <input name="finished"
        type="checkbox"
        style="width:auto">

      Ödevi tamamladım
    </label>

    <button class="primary">
      Sonucu Kaydet
    </button>
  `;

  form.onsubmit = async event => {
    event.preventDefault();

    const attempted = parseNumber(
      form.elements.attempted.value
    );

    const correct = parseNumber(
      form.elements.correct.value
    );

    const wrong = parseNumber(
      form.elements.wrong.value
    );

    if (
      ![
        attempted,
        correct,
        wrong
      ].every(Number.isInteger) ||

      attempted < 0 ||
      correct < 0 ||
      wrong < 0 ||

      correct + wrong > attempted ||

      attempted > task.questionCount
    ) {
      toast(
        "Ödev sonucunu kontrol et.",
        true
      );

      return;
    }

    const finished =
      form.elements.finished.checked;

    if (
      finished &&
      attempted !== task.questionCount
    ) {
      toast(
        "Ödevin tamamını çözmeden tamamlandı işaretlenemez.",
        true
      );

      return;
    }

    try {
      await updateDoc(
        doc(
          db,
          "Assignments",
          task.id
        ),

        {
          result: {
            attempted,
            correct,
            wrong,

            blank:
              attempted -
              correct -
              wrong,

            remaining:
              task.questionCount -
              attempted,

            net:
              correct -
              wrong / 4
          },

          status:
            finished
              ? "completed"
              : "in_progress",

          resultUpdatedAt:
            serverTimestamp()
        }
      );

      toast(
        "Ödev sonucu kaydedildi."
      );

    } catch (err) {
      toast(err.message, true);
    }
  };

  card.appendChild(form);
}

function showTaskReview(card, task) {
  const form =
    document.createElement("form");

  form.innerHTML = `
    <label>
      Değerlendirme

      <textarea name="review"
        required></textarea>
    </label>

    <button class="primary">
      Değerlendirmeyi Kaydet
    </button>
  `;

  form.elements.review.value =
    task.review || "";

  form.onsubmit = async event => {
    event.preventDefault();

    try {
      await updateDoc(
        doc(
          db,
          "Assignments",
          task.id
        ),

        {
          review:
            form.elements.review.value,

          reviewedBy: user.uid,
          reviewedByRole: role,

          reviewedAt:
            serverTimestamp(),

          status:
            task.status === "completed"
              ? "reviewed"
              : task.status
        }
      );

      toast(
        "Değerlendirme kaydedildi."
      );

    } catch (err) {
      toast(err.message, true);
    }
  };

  card.appendChild(form);
}

/* =====================================================
   ANALİZ
===================================================== */

function renderAnalysis() {
  const byType = {};

  exams.forEach(exam => {
    const type =
      exam.denemeTuru || "TYT";

    if (!byType[type]) {
      byType[type] = [];
    }

    byType[type].push(exam);
  });

  const analysisRows =
    Object.entries(byType).map(
      ([type, records]) => {
        const values = records.map(
          item =>
            Number(item.toplamNet)
        );

        const average =
          values.reduce(
            (sum, value) =>
              sum + value,
            0
          ) / values.length;

        return `
          <tr>
            <td>${escapeHTML(type)}</td>
            <td>${records.length}</td>
            <td>${format(average)}</td>
          </tr>
        `;
      }
    ).join("");

  $("content").innerHTML = `
    <div class="card">
      <h1>Öğrenci Analizi</h1>

      <div class="stats">

        ${cardStat(
          "Deneme",
          exams.length
        )}

        ${cardStat(
          "Günlük Çalışma",
          tests.length
        )}

        ${cardStat(
          "Ödev",
          tasks.length
        )}

      </div>
    </div>

    <div class="card">

      <h2>Puan Türüne Göre Netler</h2>

      <div class="tablewrap">

        <table>
          <thead>
            <tr>
              <th>Tür</th>
              <th>Deneme Sayısı</th>
              <th>Ortalama Net</th>
            </tr>
          </thead>

          <tbody>
            ${analysisRows}
          </tbody>
        </table>

      </div>
    </div>

    <div class="card">

      <h2>Ödev Sonuçları</h2>

      ${tasks.map(task => `
        <div class="task">

          <strong>
            ${escapeHTML(task.ders)}
            ·
            ${escapeHTML(task.konu)}
          </strong>

          <p>
            ${task.result
              ? format(task.result.net) +
                " net"
              : "Sonuç bekleniyor"}
          </p>

          <p class="muted">
            ${escapeHTML(
              task.review || ""
            )}
          </p>

        </div>
      `).join("")}

    </div>
  `;
}

/* =====================================================
   RAPOR
===================================================== */

function renderReports() {
  const obp = obpFromProfile(profile);

  $("content").innerHTML = `
    <div class="card">

      <h1>Öğrenci Durum Raporu</h1>

      <div class="noprint">
        <button
          id="print-report"
          class="primary">
          Yazdır / PDF
        </button>
      </div>

      <h2>Diploma / OBP</h2>

      <p>
        ${obp
          ? "Diploma: " +
            format(obp.diploma) +
            " · OBP: " +
            format(obp.obp) +
            " · Katkı: " +
            format(obp.contribution)
          : "OBP bilgisi yok"}
      </p>

      <h2>Deneme Sonuçları</h2>

      <div class="tablewrap">

        <table>
          <thead>
            <tr>
              <th>Deneme</th>
              <th>Tür</th>
              <th>Net</th>
            </tr>
          </thead>

          <tbody>
            ${sortedExams().map(
              exam => `
                <tr>
                  <td>
                    ${escapeHTML(
                      exam.denemeAdi
                    )}
                  </td>

                  <td>
                    ${escapeHTML(
                      exam.denemeTuru
                    )}
                  </td>

                  <td>
                    ${format(
                      Number(
                        exam.toplamNet
                      )
                    )}
                  </td>
                </tr>
              `
            ).join("")}
          </tbody>
        </table>

      </div>

    </div>
  `;

  $("print-report").onclick = () =>
    window.print();
}

/* =====================================================
   ADMIN PARAMETRELERİ
===================================================== */

function renderAdmin() {
  if (!isAdmin()) {
    navigate("home");
    return;
  }

  $("content").innerHTML = `
    <div class="card">

      <h1>Admin Parametreleri</h1>

      <form id="admin-form">

        <label>
          Deneme Sonuç Giriş Yöntemi

          <select id="setting-mode">

            <option value="BOTH">
              Her İki Yöntem
            </option>

            <option value="NET">
              Yalnızca Net
            </option>

            <option value="DY">
              Yalnızca Doğru / Yanlış
            </option>

          </select>
        </label>

        <label>
          Varsayılan Giriş Yöntemi

          <select id="setting-default">

            <option value="NET">
              Hızlı Net
            </option>

            <option value="DY">
              Doğru / Yanlış
            </option>

          </select>
        </label>

        <label>
          <input
            id="setting-details"
            type="checkbox"
            style="width:auto">

          Öğrenci detaylı analizleri görsün
        </label>

        <button class="primary">
          Ayarları Kaydet
        </button>

      </form>
    </div>
  `;

  $("setting-mode").value =
    settings.examEntryMode || "BOTH";

  $("setting-default").value =
    settings.defaultEntryMode || "NET";

  $("setting-details").checked =
    settings.studentDetailedMode === true;

  $("admin-form").onsubmit =
    async event => {
      event.preventDefault();

      const updated = {
        examEntryMode:
          $("setting-mode").value,

        defaultEntryMode:
          $("setting-default").value,

        studentDetailedMode:
          $("setting-details").checked
      };

      try {
        await setDoc(
          doc(
            db,
            "Settings",
            "SystemConfig"
          ),

          updated,

          { merge: true }
        );

        settings = {
          ...settings,
          ...updated
        };

        draftMode =
          settings.examEntryMode === "BOTH"
            ? settings.defaultEntryMode
            : settings.examEntryMode;

        toast(
          "Admin parametreleri kaydedildi."
        );

        render();

      } catch (err) {
        toast(err.message, true);
      }
    };
}
