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

// 3.1. Kiểm tra Thời gian tối thiểu (Min duration - mặc định > 0)
const xml3ZeroDuration = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "5",
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
    NGAY_KQ: "202608280810",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
);
// Thời lượng = 0 phút (dưới mức tối thiểu > 0)
assert.equal(xml3ZeroDuration.durationMinutes, 0);
assert.equal(xml3ZeroDuration.status, "warning");
assert.ok(xml3ZeroDuration.detail.includes("Thời lượng 0 phút (yêu cầu thời gian > 0 phút)"));

// 3.2. Kiểm tra Thời gian tối thiểu có cấu hình riêng trong thư viện
const serviceRuleMap = new Map([
  [
    "04.01",
    {
      MA_DICH_VU: "04.01",
      TEN_DICH_VU: "Nội soi dạ dày",
      minMinutes: 15,
      maxMinutes: 90,
    },
  ],
]);

const xml3UnderMin = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "6",
    MA_DICH_VU: "04.01",
    MA_VAT_TU: "",
    TEN_DICH_VU: "Nội soi dạ dày",
    TEN_VAT_TU: "",
    MA_NHOM: "3",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280820",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
  serviceRuleMap,
);
// 10 phút < 15 phút tối thiểu
assert.equal(xml3UnderMin.durationMinutes, 10);
assert.equal(xml3UnderMin.status, "warning");
assert.ok(
  xml3UnderMin.detail.includes("Thời lượng 10 phút nhỏ hơn thời gian tối thiểu quy định (15 phút)"),
);

const xml3ValidRange = evaluateRecord(
  {
    MA_LK: "LK-001",
    STT: "7",
    MA_DICH_VU: "04.01",
    MA_VAT_TU: "",
    TEN_DICH_VU: "Nội soi dạ dày",
    TEN_VAT_TU: "",
    MA_NHOM: "3",
    MA_KHOA: "K01",
    MA_GIUONG: "",
    MA_BAC_SI: "BS01",
    NGUOI_THUC_HIEN: "BS01",
    MA_BENH: "A00",
    MA_BENH_YHCT: "",
    NGAY_YL: "202608280800",
    NGAY_TH_YL: "202608280810",
    NGAY_KQ: "202608280840",
    MA_MAY: "",
    MA_HIEU_SP: "",
    TT_THAU: "",
  },
  "test.xml",
  serviceRuleMap,
);
// 30 phút nằm trong [15, 90]
assert.equal(xml3ValidRange.durationMinutes, 30);
assert.equal(xml3ValidRange.status, "ok");
assert.ok(xml3ValidRange.detail.includes("Trong ngưỡng thời gian (15–90 phút)"));

// 4. Kiểm tra XML2 và Loại trừ Thuốc
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

// Chưa loại trừ -> TH01 thiếu TT_THAU sẽ cảnh báo
const xml2Warnings1 = readXml2Warnings(
  mockDoc,
  new Map([["LK-001", { MA_LK: "LK-001", MA_BN: "BN-001", HO_TEN: "Nguyễn Văn A" }]]),
  [],
);
assert.equal(xml2Warnings1.length, 1);
assert.equal(xml2Warnings1[0].source, "XML2");
assert.equal(xml2Warnings1[0].detailIndex, 1);
assert.equal(xml2Warnings1[0].message, "XML2. Chi tiết thứ 1: Thiếu thông tin TT_THAU");
assert.equal(xml2Warnings1[0].MA_DICH_VU, "TH01");
assert.equal(xml2Warnings1[0].TEN_DICH_VU, "Paracetamol 500mg");

// Đã thêm TH01 vào danh mục loại trừ -> không còn cảnh báo
const xml2Warnings2 = readXml2Warnings(
  mockDoc,
  new Map([["LK-001", { MA_LK: "LK-001", MA_BN: "BN-001", HO_TEN: "Nguyễn Văn A" }]]),
  [{ MA_THUOC: "TH01", TEN_THUOC: "Paracetamol 500mg", excluded: true }],
);
assert.equal(xml2Warnings2.length, 0);

// 5. Kiểm tra Backup / Restore JSON với Thư viện thuốc & Cấu hình cột
const sampleRules = [
  { MA_DICH_VU: "04.01", TEN_DICH_VU: "Nội soi", minMinutes: 1, maxMinutes: null },
  { MA_DICH_VU: "04.02", TEN_DICH_VU: "Phẫu thuật", minMinutes: 15, maxMinutes: 120 },
];
const sampleDrugRules = [{ MA_THUOC: "TH01", TEN_THUOC: "Paracetamol 500mg", excluded: true }];
const libJson = createLibraryBackupContent(sampleRules, sampleDrugRules);
const parsedLib = parseBackupJson(libJson);
assert.equal(parsedLib.type, "library");
assert.equal(parsedLib.serviceRules.length, 2);
assert.equal(parsedLib.drugRules.length, 1);
assert.equal(parsedLib.serviceRules[0].MA_DICH_VU, "04.01");
assert.equal(parsedLib.serviceRules[0].maxMinutes, null);
assert.equal(parsedLib.serviceRules[1].minMinutes, 15);
assert.equal(parsedLib.serviceRules[1].maxMinutes, 120);
assert.equal(parsedLib.drugRules[0].MA_THUOC, "TH01");
assert.equal(parsedLib.drugRules[0].excluded, true);

const fullConfigJson = createFullConfigBackupContent({
  serviceRules: sampleRules,
  drugRules: sampleDrugRules,
  groupCodes: ["2", "3", "8", "18", "10"],
  telegramConfig: {
    botToken: "123:ABC",
    chatId: "999",
    enabled: true,
    autoSendOnAnalysis: false,
  },
  columnsConfig: {
    XML1: { widths: { detailIndex: 100 }, visible: { detailIndex: true } },
  },
  onlyWarnings: true,
});
const parsedFull = parseBackupJson(fullConfigJson);
assert.equal(parsedFull.type, "full");
assert.equal(parsedFull.serviceRules.length, 2);
assert.equal(parsedFull.drugRules.length, 1);
assert.deepEqual(parsedFull.groupCodes, ["2", "3", "8", "18", "10"]);
assert.equal(parsedFull.telegramConfig?.botToken, "123:ABC");
assert.equal(parsedFull.columnsConfig?.XML1?.widths?.detailIndex, 100);

console.log(
  "All tests passed: XML2/XML3 TT_THAU validation, drug exclusion, chronology, library backup/restore: OK",
);
