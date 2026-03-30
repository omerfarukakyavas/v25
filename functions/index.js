const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

const db = getFirestore();
const adminAuth = getAuth();

const APP_ID = "akyavas-hts";
const REGION = "europe-west1";
const TIME_ZONE = "Europe/Istanbul";
const DIGEST_SCHEDULE = "30 18 * * *";

const brevoApiKey = defineSecret("BREVO_API_KEY");
const brevoSenderEmail = defineString("BREVO_SENDER_EMAIL", {
  description: "Brevo icin dogrulanmis gonderici e-posta adresi",
});
const dailyDigestSenderName = defineString("DAILY_DIGEST_SENDER_NAME", {
  default: "Akyavas Hukuk Burosu",
});
const dailyDigestBaseUrl = defineString("DAILY_DIGEST_BASE_URL", {
  default: "https://v25-plum.vercel.app",
});

exports.sendDailyDigest = onSchedule(
  {
    region: REGION,
    schedule: DIGEST_SCHEDULE,
    timeZone: TIME_ZONE,
    secrets: [brevoApiKey],
  },
  async () => {
    const settingsSnapshot = await db.collectionGroup("bildirimler").where("aktif", "==", true).get();
    let sentCount = 0;

    for (const settingsDoc of settingsSnapshot.docs) {
      const uid = getUidFromSettingsPath(settingsDoc.ref.path);
      if (!uid) continue;

      try {
        const result = await sendDigestForUser(uid, {
          mode: "scheduled",
          settingsOverride: settingsDoc.data(),
        });
        if (result.sent) sentCount += 1;
      } catch (error) {
        logger.error("Gunluk ozet gonderimi basarisiz oldu.", { uid, error: getErrorMessage(error) });
      }
    }

    logger.info("Gunluk ozet taramasi tamamlandi.", {
      activeSettings: settingsSnapshot.size,
      sentCount,
    });
  }
);

exports.sendDailyDigestPreview = onCall(
  {
    region: REGION,
    secrets: [brevoApiKey],
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Test maili gondermek icin giris yapmalisiniz.");
    }

    const result = await sendDigestForUser(request.auth.uid, {
      mode: "preview",
      requestData: request.data || {},
    });

    if (!result.sent) {
      throw new HttpsError("failed-precondition", result.reason || "Test maili gonderilemedi.");
    }

    return result.summary;
  }
);

async function sendDigestForUser(uid, options = {}) {
  const mode = options.mode || "scheduled";
  const userRecord = await adminAuth.getUser(uid);
  const userEmail = normalizeEmail(userRecord.email);
  const settingsRef = getNotificationSettingsRef(uid);
  const settingsSnapshot = await settingsRef.get();
  const effectiveSettings = normalizeNotificationSettings(
    settingsSnapshot.exists ? settingsSnapshot.data() : null,
    userEmail,
    options.settingsOverride || options.requestData || null
  );

  if (mode === "scheduled" && !effectiveSettings.aktif) {
    return { sent: false, reason: "Gunluk ozet pasif." };
  }

  if (!effectiveSettings.aliciEpostalar.length) {
    return { sent: false, reason: "Alici e-postasi bulunamadi." };
  }

  const data = await loadUserCollections(uid);
  const digest = buildDigestPayload(data, effectiveSettings.yaklasanGunSayisi);
  const subject = buildDigestSubject(mode, digest.summary);
  const html = renderDigestHtml({
    mode,
    digest,
    recipientLabel: effectiveSettings.aliciEpostalar.join(", "),
    baseUrl: dailyDigestBaseUrl.value(),
  });
  const text = renderDigestText({
    mode,
    digest,
    baseUrl: dailyDigestBaseUrl.value(),
  });

  await sendBrevoEmail({
    to: effectiveSettings.aliciEpostalar,
    subject,
    html,
    text,
  });

  const zamanDamgasi = new Date().toISOString();
  const metadata =
    mode === "preview"
      ? {
          sonTestGonderimTarihi: zamanDamgasi,
        }
      : {
          sonBasariliGonderimTarihi: zamanDamgasi,
          sonGonderimOzeti: `${digest.summary.overdueCount} geciken • ${digest.summary.todayCount} bugun • ${digest.summary.upcomingCount} yaklasan`,
        };

  await settingsRef.set(
    {
      aktif: effectiveSettings.aktif,
      aliciEpostalar: effectiveSettings.aliciEpostalar,
      yaklasanGunSayisi: effectiveSettings.yaklasanGunSayisi,
      guncellenmeTarihi: effectiveSettings.guncellenmeTarihi || zamanDamgasi,
      ...metadata,
    },
    { merge: true }
  );

  logger.info("Gunluk ozet maili gonderildi.", {
    uid,
    mode,
    recipients: effectiveSettings.aliciEpostalar.length,
    overdueCount: digest.summary.overdueCount,
    todayCount: digest.summary.todayCount,
    upcomingCount: digest.summary.upcomingCount,
  });

  return { sent: true, summary: { ...digest.summary, recipientCount: effectiveSettings.aliciEpostalar.length } };
}

function getNotificationSettingsRef(uid) {
  return db.doc(`artifacts/${APP_ID}/users/${uid}/ayarlar/bildirimler`);
}

function getUidFromSettingsPath(path) {
  const segments = String(path || "").split("/");
  if (segments.length !== 6) return null;
  if (segments[0] !== "artifacts" || segments[1] !== APP_ID || segments[2] !== "users") return null;
  return segments[3] || null;
}

function normalizeNotificationSettings(raw, fallbackEmail, override) {
  const source = {
    ...(raw || {}),
    ...(override || {}),
  };
  const recipients = normalizeEmailList(source.aliciEpostalar);
  const daysAhead = clamp(Number(source.yaklasanGunSayisi || 30), 7, 60);
  const fallbackRecipients = fallbackEmail ? [fallbackEmail] : [];

  return {
    aktif: Boolean(source.aktif),
    aliciEpostalar: recipients.length ? recipients : fallbackRecipients,
    yaklasanGunSayisi: Number.isFinite(daysAhead) ? daysAhead : 30,
    guncellenmeTarihi: source.guncellenmeTarihi || "",
  };
}

function normalizeEmailList(value) {
  if (Array.isArray(value)) {
    return [...new Set(value.map(normalizeEmail).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(/[\s,;]+/).map(normalizeEmail).filter(Boolean))];
  }
  return [];
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function loadUserCollections(uid) {
  const baseRef = db.doc(`artifacts/${APP_ID}/users/${uid}`);
  const [davalarSnapshot, icralarSnapshot, arabuluculukSnapshot] = await Promise.all([
    baseRef.collection("davalar").get(),
    baseRef.collection("icralar").get(),
    baseRef.collection("arabuluculuk").get(),
  ]);

  return {
    davalar: davalarSnapshot.docs.map((docSnap) => ({ id: Number(docSnap.id), ...docSnap.data() })),
    icralar: icralarSnapshot.docs.map((docSnap) => ({ id: Number(docSnap.id), ...docSnap.data() })),
    arabuluculukDosyalari: arabuluculukSnapshot.docs.map((docSnap) => ({ id: Number(docSnap.id), ...docSnap.data() })),
  };
}

function buildDigestPayload(data, daysAhead) {
  const agendaRecords = buildAgendaRecords(data);
  const overdueRecords = agendaRecords.filter((record) => dayDiff(record.tarih) < 0);
  const todayRecords = agendaRecords.filter((record) => dayDiff(record.tarih) === 0);
  const upcomingRecords = agendaRecords.filter((record) => {
    const diff = dayDiff(record.tarih);
    return diff > 0 && diff <= daysAhead;
  });
  const mediationCountdowns = buildMediationCountdowns(data.arabuluculukDosyalari);
  const priorityCountdowns = mediationCountdowns
    .filter((item) => item.asama === "asildi" || item.asama === "uzatma" || item.normalKalanGun <= 7)
    .sort((left, right) => {
      const leftPriority = left.asama === "asildi" ? 0 : left.asama === "uzatma" ? 1 : 2;
      const rightPriority = right.asama === "asildi" ? 0 : right.asama === "uzatma" ? 1 : 2;
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.azamiKalanGun - right.azamiKalanGun;
    });

  return {
    overdueRecords,
    todayRecords,
    upcomingRecords,
    priorityCountdowns,
    summary: {
      overdueCount: overdueRecords.length,
      todayCount: todayRecords.length,
      upcomingCount: upcomingRecords.length,
      trackedCountdowns: mediationCountdowns.length,
      urgentCountdowns: priorityCountdowns.length,
      daysAhead,
    },
  };
}

function buildAgendaRecords(data) {
  const records = [];

  for (const dava of data.davalar || []) {
    if (isClosedCase(dava.durum) || !dava.durusmaTarihi || dava.durusmaTamamlandiMi) continue;
    records.push({
      tarih: combineDateAndTime(dava.durusmaTarihi, dava.durusmaSaati),
      tur: "durusma",
      kaynak: "dava",
      baslik: dava.mahkeme || "Dava durusmasi",
      altBaslik: dava.konu || getCaseReference("dava", dava),
      taraflar: getDavaTarafOzet(dava),
    });
  }

  for (const arabuluculuk of data.arabuluculukDosyalari || []) {
    if (isClosedCase(arabuluculuk.durum) || !arabuluculuk.toplantiTarihi || arabuluculuk.toplantiTamamlandiMi) continue;
    records.push({
      tarih: combineDateAndTime(arabuluculuk.toplantiTarihi, arabuluculuk.toplantiSaati),
      tur: "toplanti",
      kaynak: "arabuluculuk",
      baslik: getCaseReference("arabuluculuk", arabuluculuk),
      altBaslik: arabuluculuk.toplantiYontemi
        ? `${arabuluculuk.buro || "Arabuluculuk"} - ${arabuluculuk.toplantiYontemi}`
        : arabuluculuk.buro || "Arabuluculuk toplantisi",
      taraflar: getArabuluculukTaraflari(arabuluculuk) || "Taraf bilgisi yok",
    });
  }

  for (const due of collectDueDocuments(data.davalar || [], "dava", "Kapalı")) {
    records.push({
      tarih: due.evrak.sonEylemTarihi,
      tur: "sureliIs",
      kaynak: "dava",
      baslik: due.evrak.isim || "Sureli is",
      altBaslik: getCaseReference("dava", due.dosya),
      taraflar: getDavaTarafOzet(due.dosya),
      anaEvrakIsmi: due.anaEvrakIsim || "",
    });
  }

  for (const due of collectDueDocuments(data.icralar || [], "icra", "İnfaz/Kapalı")) {
    records.push({
      tarih: due.evrak.sonEylemTarihi,
      tur: "sureliIs",
      kaynak: "icra",
      baslik: due.evrak.isim || "Sureli is",
      altBaslik: getCaseReference("icra", due.dosya),
      taraflar: `${due.dosya.alacakli || "Alacakli"} - ${due.dosya.borclu || "Borclu"}`,
      anaEvrakIsmi: due.anaEvrakIsim || "",
    });
  }

  for (const due of collectDueDocuments(data.arabuluculukDosyalari || [], "arabuluculuk", "Kapalı")) {
    records.push({
      tarih: due.evrak.sonEylemTarihi,
      tur: "sureliIs",
      kaynak: "arabuluculuk",
      baslik: due.evrak.isim || "Sureli is",
      altBaslik: getCaseReference("arabuluculuk", due.dosya),
      taraflar: getArabuluculukTaraflari(due.dosya) || "Taraf bilgisi yok",
      anaEvrakIsmi: due.anaEvrakIsim || "",
    });
  }

  return records.sort((left, right) => toTimestamp(left.tarih) - toTimestamp(right.tarih));
}

function collectDueDocuments(files, sourceType, closedLabel) {
  const items = [];
  for (const file of files) {
    if (String(file?.durum || "") === closedLabel) continue;
    for (const evrak of file.evraklar || []) {
      if (evrak.sonEylemTarihi && !evrak.tamamlandiMi) {
        items.push({ tur: sourceType, dosya: file, evrak, anaEvrakIsim: null });
      }
      for (const ek of evrak.ekler || []) {
        if (ek.sonEylemTarihi && !ek.tamamlandiMi) {
          items.push({ tur: sourceType, dosya: file, evrak: ek, anaEvrakIsim: evrak.isim });
        }
      }
    }
  }
  return items.sort((left, right) => toTimestamp(left.evrak.sonEylemTarihi) - toTimestamp(right.evrak.sonEylemTarihi));
}

function buildMediationCountdowns(files) {
  return (files || [])
    .map((file) => buildSingleMediationCountdown(file))
    .filter(Boolean);
}

function buildSingleMediationCountdown(file) {
  if (!file || file.basvuruTuru !== "Dava Şartı") return null;
  const assignmentDate = parseDateOnly(file.arabulucuGorevlendirmeTarihi);
  if (!assignmentDate) return null;

  const rule = getMediationRule(file);
  const normalDue = addDays(file.arabulucuGorevlendirmeTarihi, rule.normalSureGun);
  const maxDue = addDays(file.arabulucuGorevlendirmeTarihi, rule.normalSureGun + rule.uzatmaSureGun);
  const normalRemaining = dateDiff(normalDue);
  const maxRemaining = dateDiff(maxDue);
  const elapsedDays = Math.max(0, Math.round((startOfToday().getTime() - assignmentDate.getTime()) / 86400000));

  if (file.tutanakDuzenlemeTarihi) {
    return {
      dosya: file,
      ...rule,
      gorevlendirmeTarihi: file.arabulucuGorevlendirmeTarihi,
      normalSonTarih: normalDue,
      azamiSonTarih: maxDue,
      gecenGun: elapsedDays,
      normalKalanGun: normalRemaining,
      azamiKalanGun: maxRemaining,
      asama: "tamamlandi",
      tamamlanmaGun: Math.max(0, dateSpanDays(file.arabulucuGorevlendirmeTarihi, file.tutanakDuzenlemeTarihi)),
    };
  }

  let asama = "normal";
  if (normalRemaining < 0 && maxRemaining < 0) asama = "asildi";
  else if (normalRemaining < 0) asama = "uzatma";

  return {
    dosya: file,
    ...rule,
    gorevlendirmeTarihi: file.arabulucuGorevlendirmeTarihi,
    normalSonTarih: normalDue,
    azamiSonTarih: maxDue,
    gecenGun: elapsedDays,
    normalKalanGun: normalRemaining,
    azamiKalanGun: maxRemaining,
    asama,
  };
}

function getMediationRule(file) {
  if (String(file?.uyusmazlikTuru || "").trim() === "Ticari") {
    return {
      kuralEtiketi: "Ticari",
      kuralAciklamasi: "6 hafta + 2 hafta uzatma",
      normalSureGun: 42,
      uzatmaSureGun: 14,
    };
  }

  return {
    kuralEtiketi: "Dava Şartı",
    kuralAciklamasi: "3 hafta + 1 hafta uzatma",
    normalSureGun: 21,
    uzatmaSureGun: 7,
  };
}

function getDavaTarafOzet(dava) {
  const davacilar = (dava?.davacilar || []).map((item) => item?.isim).filter(Boolean);
  const davalilar = (dava?.davalilar || []).map((item) => item?.isim).filter(Boolean);
  const parts = [];
  if (davacilar.length) parts.push(`Davaci: ${davacilar.join(", ")}`);
  if (davalilar.length) parts.push(`Davali: ${davalilar.join(", ")}`);
  if (parts.length) return parts.join(" | ");
  return `${dava?.muvekkil || "Muvekkil yok"} | ${dava?.karsiTaraf || "Karsi taraf belirtilmedi"}`;
}

function getArabuluculukTaraflari(file, type) {
  const names = (file?.taraflar || [])
    .filter((item) => !type || item.tip === type)
    .map((item) => item.isim)
    .filter(Boolean);
  return names.join(", ");
}

function getCaseReference(source, file) {
  if (source === "dava") return file?.dosyaNo || "Dava dosyasi";
  if (source === "icra") return `${file?.icraDairesi || ""} ${file?.dosyaNo || ""}`.trim() || "Icra dosyasi";
  return `${file?.buroNo ? `${file.buroNo} / ` : ""}${file?.arabuluculukNo || ""}`.trim() || "Arabuluculuk dosyasi";
}

function isClosedCase(status) {
  return String(status || "").toLocaleLowerCase("tr-TR").includes("kap");
}

function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue) return "";
  if (!timeValue) return `${String(dateValue).slice(0, 10)}T00:00:00`;
  return `${String(dateValue).slice(0, 10)}T${String(timeValue).slice(0, 5)}:00`;
}

function toTimestamp(value) {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function parseDateOnly(value) {
  const trimmed = String(value || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

function addDays(value, dayCount) {
  const date = parseDateOnly(value);
  if (!date) return "";
  date.setDate(date.getDate() + Number(dayCount || 0));
  return toIsoDate(date);
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateDiff(value) {
  const date = parseDateOnly(value);
  if (!date) return Number.MAX_SAFE_INTEGER;
  return Math.round((date.getTime() - startOfToday().getTime()) / 86400000);
}

function dateSpanDays(startValue, endValue) {
  const startDate = parseDateOnly(startValue);
  const endDate = parseDateOnly(endValue);
  if (!startDate || !endDate) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

function buildDigestSubject(mode, summary) {
  const dateText = new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date());

  const prefix = mode === "preview" ? "[V25 Test]" : "[V25]";
  return `${prefix} ${dateText} dosya ozeti • ${summary.overdueCount} geciken / ${summary.upcomingCount} yaklasan`;
}

function renderDigestHtml({ mode, digest, recipientLabel, baseUrl }) {
  const summaryCards = [
    renderMetricCard("Geciken", digest.summary.overdueCount, "#fee2e2", "#be123c"),
    renderMetricCard("Bugun", digest.summary.todayCount, "#fef3c7", "#b45309"),
    renderMetricCard(`Onumuzdeki ${digest.summary.daysAhead} gun`, digest.summary.upcomingCount, "#dbeafe", "#1d4ed8"),
    renderMetricCard("Sayaç riski", digest.summary.urgentCountdowns, "#ede9fe", "#6d28d9"),
  ].join("");

  return `
    <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px; color:#0f172a;">
      <div style="max-width:880px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:24px; overflow:hidden;">
        <div style="padding:28px 28px 20px; background:linear-gradient(135deg,#0f172a,#334155); color:#ffffff;">
          <div style="font-size:12px; letter-spacing:0.18em; text-transform:uppercase; font-weight:700; opacity:0.8;">V25 gunluk ozet</div>
          <h1 style="margin:12px 0 8px; font-size:28px; line-height:1.2;">${mode === "preview" ? "Test maili hazir." : "Gun sonu ozeti hazir."}</h1>
          <p style="margin:0; font-size:14px; line-height:1.7; color:#cbd5e1;">Alici: ${escapeHtml(recipientLabel)}<br>Geciken kayitlar, bugunluk isler, yaklasan dosyalar ve arabuluculuk sure sayaclari asagida birlikte yer aliyor.</p>
        </div>

        <div style="padding:24px 28px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px;">${summaryCards}</div>

          ${renderSectionHtml("Suresi gecen kayitlar", digest.overdueRecords, "Geciken is yok.", renderAgendaItemHtml)}
          ${renderSectionHtml("Bugun takip edilmesi gerekenler", digest.todayRecords, "Bugune ait kayit gorunmuyor.", renderAgendaItemHtml)}
          ${renderSectionHtml(`Onumuzdeki ${digest.summary.daysAhead} gun`, digest.upcomingRecords, "Secilen aralikta yaklasan kayit yok.", renderAgendaItemHtml)}
          ${renderSectionHtml("Arabuluculuk sure sayaçlari", digest.priorityCountdowns, "Oncelikli arabuluculuk sayaci yok.", renderCountdownItemHtml)}

          <div style="margin-top:24px; border-top:1px solid #e2e8f0; padding-top:20px;">
            <a href="${escapeHtml(baseUrl)}" style="display:inline-block; background:#0f172a; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:12px; font-weight:700;">Uygulamayi Ac</a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderDigestText({ mode, digest, baseUrl }) {
  const sections = [
    `${mode === "preview" ? "TEST " : ""}V25 GUNLUK DOSYA OZETI`,
    `Geciken: ${digest.summary.overdueCount}`,
    `Bugun: ${digest.summary.todayCount}`,
    `Onumuzdeki ${digest.summary.daysAhead} gun: ${digest.summary.upcomingCount}`,
    `Sayac riski: ${digest.summary.urgentCountdowns}`,
    "",
    "SURESI GECENLER",
    renderAgendaItemsText(digest.overdueRecords),
    "",
    "BUGUN",
    renderAgendaItemsText(digest.todayRecords),
    "",
    `ONUMUZDEKI ${digest.summary.daysAhead} GUN`,
    renderAgendaItemsText(digest.upcomingRecords),
    "",
    "ARABULUCULUK SURE SAYACLARI",
    renderCountdownItemsText(digest.priorityCountdowns),
    "",
    `Uygulama: ${baseUrl}`,
  ];

  return sections.join("\n");
}

function renderMetricCard(label, value, background, color) {
  return `<div style="border-radius:18px; padding:16px; background:${background}; border:1px solid rgba(15,23,42,0.06);">
    <div style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; font-weight:700; color:${color}; opacity:0.9;">${escapeHtml(label)}</div>
    <div style="margin-top:10px; font-size:30px; font-weight:800; color:${color};">${value}</div>
  </div>`;
}

function renderSectionHtml(title, items, emptyMessage, renderer) {
  return `
    <div style="margin-top:26px;">
      <h2 style="margin:0 0 12px; font-size:16px; font-weight:800; color:#0f172a;">${escapeHtml(title)}</h2>
      ${
        items.length
          ? items.slice(0, 12).map(renderer).join("")
          : `<div style="border:1px dashed #cbd5e1; border-radius:18px; background:#f8fafc; padding:16px; font-size:14px; color:#64748b;">${escapeHtml(emptyMessage)}</div>`
      }
      ${
        items.length > 12
          ? `<div style="margin-top:8px; font-size:12px; color:#64748b;">Listede gosterilmeyen ${items.length - 12} ek kayit daha var.</div>`
          : ""
      }
    </div>
  `;
}

function renderAgendaItemHtml(item) {
  return `<div style="border:1px solid #e2e8f0; border-radius:18px; padding:16px; margin-bottom:10px; background:#ffffff;">
    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px;">
      <span style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569;">${escapeHtml(item.kaynak || "")}</span>
      <span style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#475569;">${escapeHtml(item.tur || "")}</span>
      <span style="font-size:11px; font-weight:700; color:#0f172a;">${escapeHtml(formatDateShort(item.tarih))}</span>
    </div>
    <div style="font-size:15px; font-weight:700; color:#0f172a;">${escapeHtml(item.baslik || "-")}</div>
    <div style="margin-top:6px; font-size:13px; color:#475569;">${escapeHtml(item.taraflar || "-")}</div>
    <div style="margin-top:4px; font-size:12px; color:#64748b;">${escapeHtml(item.altBaslik || "-")}${item.anaEvrakIsmi ? ` • Ana evrak: ${escapeHtml(item.anaEvrakIsmi)}` : ""}</div>
  </div>`;
}

function renderCountdownItemHtml(item) {
  return `<div style="border:1px solid #e2e8f0; border-radius:18px; padding:16px; margin-bottom:10px; background:#ffffff;">
    <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px;">
      <span style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#6d28d9;">${escapeHtml(item.kuralEtiketi)}</span>
      <span style="font-size:11px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:${item.asama === "asildi" ? "#be123c" : item.asama === "uzatma" ? "#b45309" : "#1d4ed8"};">${escapeHtml(getCountdownLabel(item))}</span>
    </div>
    <div style="font-size:15px; font-weight:700; color:#0f172a;">${escapeHtml(getCaseReference("arabuluculuk", item.dosya))}</div>
    <div style="margin-top:6px; font-size:13px; color:#475569;">${escapeHtml(getArabuluculukTaraflari(item.dosya) || "-")}</div>
    <div style="margin-top:4px; font-size:12px; color:#64748b;">Normal son: ${escapeHtml(formatDateShort(item.normalSonTarih))} • Azami son: ${escapeHtml(formatDateShort(item.azamiSonTarih))}</div>
  </div>`;
}

function renderAgendaItemsText(items) {
  if (!items.length) return "- Kayit yok";
  return items
    .slice(0, 12)
    .map((item) => `- ${formatDateShort(item.tarih)} | ${item.baslik} | ${item.taraflar} | ${item.altBaslik}`)
    .join("\n");
}

function renderCountdownItemsText(items) {
  if (!items.length) return "- Kayit yok";
  return items
    .slice(0, 12)
    .map((item) => `- ${getCaseReference("arabuluculuk", item.dosya)} | ${getCountdownLabel(item)} | Normal son ${formatDateShort(item.normalSonTarih)} | Azami son ${formatDateShort(item.azamiSonTarih)}`)
    .join("\n");
}

function getCountdownLabel(item) {
  if (!item) return "Sayaç bekleniyor";
  if (item.asama === "asildi") return `Azami sure ${Math.abs(item.azamiKalanGun)} gun gecti`;
  if (item.asama === "uzatma") return item.azamiKalanGun === 0 ? "Azami surenin son gunu" : `Azami sureye ${item.azamiKalanGun} gun kaldi`;
  if (item.asama === "tamamlandi") return `Tutanak ${item.tamamlanmaGun || 0} gunde duzenlendi`;
  return item.normalKalanGun === 0 ? "Normal surenin son gunu" : `Normal sureye ${item.normalKalanGun} gun kaldi`;
}

async function sendBrevoEmail({ to, subject, html, text }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": brevoApiKey.value(),
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: brevoSenderEmail.value(),
        name: dailyDigestSenderName.value(),
      },
      to: to.map((email) => ({ email })),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo e-posta istegi basarisiz oldu (${response.status}): ${body}`);
  }
}

function formatDateShort(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error || "Bilinmeyen hata");
}
