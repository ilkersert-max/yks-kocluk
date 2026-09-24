
export const TESTS = {
  "tyt-turkce": {
    label: "TYT Türkçe", q: 40, group: "TYT"
  },
  "tyt-sosyal": {
    label: "TYT Sosyal", q: 20, group: "TYT"
  },
  "tyt-mat": {
    label: "TYT Matematik", q: 40, group: "TYT"
  },
  "tyt-fen": {
    label: "TYT Fen", q: 20, group: "TYT"
  },

  "ayt-mat": {
    label: "AYT Matematik", q: 40, group: "AYT"
  },
  "ayt-fizik": {
    label: "AYT Fizik", q: 14, group: "AYT"
  },
  "ayt-kimya": {
    label: "AYT Kimya", q: 13, group: "AYT"
  },
  "ayt-biyo": {
    label: "AYT Biyoloji", q: 13, group: "AYT"
  },

  "ayt-tde": {
    label: "AYT Türk Dili ve Edebiyatı",
    q: 24,
    group: "AYT"
  },
  "ayt-tar1": {
    label: "AYT Tarih-1", q: 10, group: "AYT"
  },
  "ayt-cog1": {
    label: "AYT Coğrafya-1", q: 6, group: "AYT"
  },

  "ayt-tar2": {
    label: "AYT Tarih-2", q: 11, group: "AYT"
  },
  "ayt-cog2": {
    label: "AYT Coğrafya-2", q: 11, group: "AYT"
  },
  "ayt-felsefe": {
    label: "AYT Felsefe Grubu",
    q: 12,
    group: "AYT"
  },
  "ayt-din": {
    label: "AYT Din / İlave Felsefe",
    q: 6,
    group: "AYT"
  },

  "ydt-dil": {
    label: "YDT Yabancı Dil",
    q: 80,
    group: "YDT"
  }
};

export const TYPES = {
  TYT: [
    "tyt-turkce",
    "tyt-sosyal",
    "tyt-mat",
    "tyt-fen"
  ],

  SAY: [
    "ayt-mat",
    "ayt-fizik",
    "ayt-kimya",
    "ayt-biyo"
  ],

  EA: [
    "ayt-mat",
    "ayt-tde",
    "ayt-tar1",
    "ayt-cog1"
  ],

  SOZ: [
    "ayt-tde",
    "ayt-tar1",
    "ayt-cog1",
    "ayt-tar2",
    "ayt-cog2",
    "ayt-felsefe",
    "ayt-din"
  ],

  DIL: [
    "ydt-dil"
  ]
};

export const idsFor = type => [
  ...TYPES.TYT,
  ...(TYPES[type] || [])
];

/*
  Türkçe ve İngilizce ondalık ayracı.
  23,75 ve 23.75 aynı değere dönüşür.
*/

export function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return null;
  }

  const s = String(value)
    .trim()
    .replace(",", ".");

  if (!/^-?\d+(\.\d+)?$/.test(s)) {
    return null;
  }

  const n = Number(s);

  return Number.isFinite(n) ? n : null;
}

export function format(value) {
  if (value === null || value === undefined) {
    return "—";
  }

  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

/*
  Test net hesaplama.

  NET modunda:
  Doğru, yanlış ve boş bilinmez.

  DY modunda:
  Net = doğru - yanlış / 4
*/

export function computeTest(raw, id, mode) {
  const test = TESTS[id];

  if (!test) {
    throw Error("Bilinmeyen test: " + id);
  }

  const q = test.q;

  if (mode === "NET") {
    const net = parseNumber(raw?.net);

    if (net === null) {
      return {
        entered: false,
        net: null,
        correct: null,
        wrong: null,
        blank: null,
        questionCount: q
      };
    }

    if (
      net < -q / 4 ||
      net > q ||
      Math.abs(
        net * 4 - Math.round(net * 4)
      ) > 0.0000001
    ) {
      throw Error(
        test.label +
        ": Net sınırı veya 0,25 adımı geçersiz."
      );
    }

    return {
      entered: true,
      net,
      correct: null,
      wrong: null,
      blank: null,
      questionCount: q
    };
  }

  if (mode !== "DY") {
    throw Error("Bilinmeyen giriş yöntemi.");
  }

  const correct = parseNumber(raw?.correct);
  const wrong = parseNumber(raw?.wrong);

  if (correct === null && wrong === null) {
    return {
      entered: false,
      net: null,
      correct: null,
      wrong: null,
      blank: null,
      questionCount: q
    };
  }

  if (
    correct === null ||
    wrong === null ||
    !Number.isInteger(correct) ||
    !Number.isInteger(wrong) ||
    correct < 0 ||
    wrong < 0 ||
    correct + wrong > q
  ) {
    throw Error(
      test.label +
      ": Doğru/yanlış değerlerini kontrol edin."
    );
  }

  return {
    entered: true,
    correct,
    wrong,
    blank: q - correct - wrong,
    net: correct - wrong / 4,
    questionCount: q
  };
}

/*
  TYT + seçilen alan netlerini hesaplar.
*/

export function computeExam(type, mode, raw) {
  const results = {};

  let tytNet = 0;
  let fieldNet = 0;
  let complete = true;
  let any = false;

  for (const id of idsFor(type)) {
    const result = computeTest(
      raw[id],
      id,
      mode
    );

    results[id] = result;

    if (result.entered) {
      any = true;

      if (TESTS[id].group === "TYT") {
        tytNet += result.net;
      } else {
        fieldNet += result.net;
      }
    } else {
      complete = false;
    }
  }

  if (!any) {
    throw Error(
      "Kaydetmeden önce en az bir ders sonucu gir."
    );
  }

  return {
    results,
    tytNet,
    fieldNet,
    totalNet: tytNet + fieldNet,
    complete,
    any
  };
}

/*
  Diploma notu ve OBP hesaplama.
*/

export function obpFromProfile(profile) {
  if (
    !profile ||
    profile.diplomaStatus === "unknown" ||
    !profile.diplomaStatus
  ) {
    return null;
  }

  const diploma = parseNumber(
    profile.diplomaNote
  );

  if (
    diploma === null ||
    diploma < 50 ||
    diploma > 100
  ) {
    return null;
  }

  const obp = diploma * 5;

  const factor = profile.brokenObp
    ? 0.06
    : 0.12;

  return {
    diploma,
    obp,
    factor,
    contribution: obp * factor,

    isEstimate:
      profile.diplomaStatus === "estimated"
  };
}

/*
  Uygulama içi net başarı göstergesi.

  ÖSYM puanı değildir.
  Gerçek YKS puan tahmini yerine kullanılmaz.
*/

export function successIndicator(type, exam) {
  if (!exam.complete) {
    return null;
  }

  const weights = {
    "tyt-turkce": 0.132,
    "tyt-sosyal": 0.068,
    "tyt-mat": 0.132,
    "tyt-fen": 0.068
  };

  if (type === "TYT") {
    weights["tyt-turkce"] = 0.33;
    weights["tyt-sosyal"] = 0.17;
    weights["tyt-mat"] = 0.33;
    weights["tyt-fen"] = 0.17;
  }

  if (type === "SAY") {
    Object.assign(weights, {
      "ayt-mat": 0.30,
      "ayt-fizik": 0.10,
      "ayt-kimya": 0.10,
      "ayt-biyo": 0.10
    });
  }

  if (type === "EA") {
    Object.assign(weights, {
      "ayt-mat": 0.30,
      "ayt-tde": 0.18,
      "ayt-tar1": 0.07,
      "ayt-cog1": 0.05
    });
  }

  if (type === "SOZ") {
    Object.assign(weights, {
      "ayt-tde": 0.18,
      "ayt-tar1": 0.07,
      "ayt-cog1": 0.05,
      "ayt-tar2": 0.08,
      "ayt-cog2": 0.08,
      "ayt-felsefe": 0.09,
      "ayt-din": 0.05
    });
  }

  if (type === "DIL") {
    weights["ydt-dil"] = 0.60;
  }

  const weighted = Object.entries(weights)
    .reduce((sum, [id, weight]) => {
      return sum +
        weight *
        exam.results[id].net /
        TESTS[id].q;
    }, 0);

  return 100 + 400 * weighted;
}
