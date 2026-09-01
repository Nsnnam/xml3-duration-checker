import assert from "node:assert/strict";
import {
  DEFAULT_GROUP_CODES,
  GROUP_OPTIONS,
  getChronologyIssues,
  withPatientInfo,
  minutesBetween,
  parseXmlDateTime,
  evaluateRecord,
  isWarning,
  readXml2Warnings,
} from "../src/lib/xml3-duration.ts";
import { formatXmlDateTime } from "../src/lib/timezone.ts";
import {
  parseBackupJson,
  createLibraryBackupContent,
  createFullConfigBackupContent,
} from "../src/lib/backup.ts";

// 1. Kiểm tra tính phút và thứ tự thời gian
assert.equal(minutesBetween("202608280800", "202608280910"), 70);
assert.equal(minutesBetween("202608280800", "202608280911"), 71);
assert.equal(minutesBetween("202608282350", "202608290020"), 30);
assert.equal(minutesBetween("202608280900", "202608280859"), -1);
assert.equal(parseXmlDateTime("202613010900"), null);
assert.deepEqual(getChronologyIssues("202608280900", "202608280830", "202608280900"), [
  "NGAY_TH_YL sớm hơn NGAY_YL",
]);
assert.deepEqual(getChronologyIssues("202608280900", "202608280930", "202608280920"), [
  "NGAY_KQ sớm hơn NGAY_TH_YL",
]);
assert.deepEqual(getChronologyIssues("202608280900", "202608280930", "202608281100"), []);
assert.deepEqual(getChronologyIssues("202608280900", "202608280900", "202608280900"), [
  "NGAY_YL = NGAY_TH_YL = NGAY_KQ",
]);
assert.deepEqual(getChronologyIssues("202608280900", "202608280930", "202608280930"), [
  "NGAY_TH_YL = NGAY_KQ",
]);
assert.equal(formatXmlDateTime("202608280930"), "08/28/2026 09:30");
assert.deepEqual(DEFAULT_GROUP_CODES, ["2", "3", "8", "18"]);
assert.equal(GROUP_OPTIONS.length, 18);

// 2. Nối thông tin bệnh nhân
const linked = withPatientInfo(
  {
    fileName: "test.xml",
    table: "XML3",
    MA_LK: "LK-001",
    MA_BN: "",
    HO_TEN: "",
    STT: "1",
    MA_DICH_VU: "DV01",
    MA_VAT_TU: "",
    TEN_DICH_VU: "DV",
    TEN_VAT_TU: "",
    MA_NHOM: "2",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "",
    NGUOI_THUC_HIEN: "",
    MA_BENH: "",
    MA_BENH_YHCT: "",
    NGAY_YL: "",
    NGAY_TH_YL: "",
    NGAY_KQ: "",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
    durationMinutes: 0,
    hasOrderWarning: false,
    hasEqualWarning: false,
    hasBedWarning: false,
    hasTtThauWarning: false,
    orderIssues: [],
    status: "ok",
    detail: "",
  },
  new Map([["LK-001", { MA_LK: "LK-001", MA_BN: "BN-001", HO_TEN: "Nguyễn Văn A" }]]),
);
assert.equal(linked.MA_BN, "BN-001");
assert.equal(linked.HO_TEN, "Nguyễn Văn A");
assert.equal(linked.MA_LK, "LK-001");

// 3. Kiểm tra XML3 MA_NHOM = 10 hoặc 11 bắt buộc có TT_THAU
const xml3Group10NoThau = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "1",
    MA_DICH_VU: "VT01",
    MA_VAT_TU: "VT01",
    TEN_DICH_VU: "Bông băng y tế",
    TEN_VAT_TU: "Bông băng y tế",
    MA_NHOM: "10",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280830",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
);
assert.equal(xml3Group10NoThau.hasTtThauWarning, true);
assert.equal(isWarning(xml3Group10NoThau), true);
assert.ok(
  xml3Group10NoThau.detail.includes(
    "XML3: TT_THAU không được để trống khi mã nhóm bằng 10 hoặc 11",
  ),
);

const xml3Group11NoThau = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "2",
    MA_DICH_VU: "VT02",
    MA_VAT_TU: "VT02",
    TEN_DICH_VU: "Vật tư tỷ lệ",
    TEN_VAT_TU: "Vật tư tỷ lệ",
    MA_NHOM: "11",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280830",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
);
assert.equal(xml3Group11NoThau.hasTtThauWarning, true);
assert.equal(isWarning(xml3Group11NoThau), true);

const xml3Group10WithThau = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "3",
    MA_DICH_VU: "VT01",
    MA_VAT_TU: "VT01",
    TEN_DICH_VU: "Bông băng y tế",
    TEN_VAT_TU: "Bông băng y tế",
    MA_NHOM: "10",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280830",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "123/2026/QĐ-SYT",
  },
  "test.xml",
);
assert.equal(xml3Group10WithThau.hasTtThauWarning, false);
assert.equal(xml3Group10WithThau.status, "ok");

const xml3Group2NoThau = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "4",
    MA_DICH_VU: "DV01",
    MA_VAT_TU: "",
    TEN_DICH_VU: "Chụp X-quang",
    TEN_VAT_TU: "",
    MA_NHOM: "2",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280830",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
);
// Nhóm 2 không phải nhóm 10/11 nên không bị cảnh báo TT_THAU
assert.equal(xml3Group2NoThau.hasTtThauWarning, false);

// 4. Kiểm tra XML2 Mock Document
function createMockXml2Element(maLk, stt, maThuoc, tenThuoc, ttThau) {
  const map = new Map([
    ["MA_LK", maLk],
    ["STT", stt],
    ["MA_THUOC", maThuoc],
    ["TEN_THUOC", tenThuoc],
    ["TT_THAU", ttThau],
  ]);
  return {
    tagName: "CHI_TIET_THUOC",
    children: Array.from(map.entries()).map(([tag, text]) => ({
      tagName: tag,
      textContent: text,
    })),
    getElementsByTagName(tag) {
      const val = map.get(tag);
      return val !== undefined ? [{ textContent: val }] : [];
    },
  };
}

const mockDoc = {
  getElementsByTagName(tag) {
    if (tag === "CHI_TIET_THUOC") {
      return [
        createMockXml2Element("LK-001", "1", "TH01", "Paracetamol 500mg", ""),
        createMockXml2Element("LK-001", "2", "TH02", "Amoxicillin 500mg", "123/2026/QĐ"),
      ];
    }
    return [];
  },
};

const xml2Warnings = readXml2Warnings(
  mockDoc,
  new Map([["LK-001", { MA_LK: "LK-001", MA_BN: "BN-001", HO_TEN: "Nguyễn Văn A" }]]),
);
assert.equal(xml2Warnings.length, 1);
assert.equal(xml2Warnings[0].source, "XML2");
assert.equal(xml2Warnings[0].detailIndex, 1);
assert.equal(xml2Warnings[0].message, "XML2. Chi tiết thứ 1: Thiếu thông tin TT_THAU");
assert.equal(xml2Warnings[0].MA_DICH_VU, "TH01");
assert.equal(xml2Warnings[0].TEN_DICH_VU, "Paracetamol 500mg");

// 5. Kiểm tra Backup / Restore JSON
const sampleRules = [
  { MA_DICH_VU: "04.01", TEN_DICH_VU: "Nội soi", maxMinutes: null },
  { MA_DICH_VU: "04.02", TEN_DICH_VU: "Phẫu thuật", maxMinutes: 120 },
];
const libJson = createLibraryBackupContent(sampleRules);
const parsedLib = parseBackupJson(libJson);
assert.equal(parsedLib.type, "library");
assert.equal(parsedLib.serviceRules.length, 2);
assert.equal(parsedLib.serviceRules[0].MA_DICH_VU, "04.01");
assert.equal(parsedLib.serviceRules[0].maxMinutes, null);
assert.equal(parsedLib.serviceRules[1].maxMinutes, 120);

const fullConfigJson = createFullConfigBackupContent({
  serviceRules: sampleRules,
  groupCodes: ["2", "3", "8", "18", "10"],
  telegramConfig: { botToken: "123:ABC", chatId: "999", enabled: true, autoSendOnAnalysis: false },
  columnWidths: { detail: 230, service: 380 },
  onlyWarnings: true,
});
const parsedFull = parseBackupJson(fullConfigJson);
assert.equal(parsedFull.type, "full");
assert.equal(parsedFull.serviceRules.length, 2);
assert.deepEqual(parsedFull.groupCodes, ["2", "3", "8", "18", "10"]);
assert.equal(parsedFull.telegramConfig?.botToken, "123:ABC");
assert.equal(parsedFull.columnWidths?.detail, 230);

console.log(
  "All tests passed: XML2/XML3 TT_THAU validation, chronology, library backup/restore: OK",
);
