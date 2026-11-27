import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

const downloadsDir = "C:/Users/Admin/Downloads";
const jDir26066 = "J:/Users/Admin/Desktop/2026/03.2026/02032026 - - Thong tu 12/26066";

async function parseExcelRows(filePath, onRow) {
  if (!fs.existsSync(filePath)) {
    console.warn("File does not exist:", filePath);
    return [];
  }
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.worksheets[0];
  const headerRow = sheet.getRow(1);
  const map = {};
  headerRow.eachCell((cell, col) => {
    const val = String(cell.value || "")
      .trim()
      .toUpperCase();
    if (val) map[val] = col;
  });
  const getVal = (row, colName) => {
    const col = map[colName.toUpperCase()];
    if (!col) return "";
    return String(row.getCell(col).value ?? "").trim();
  };
  const list = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const item = onRow(row, getVal, list.length + 1);
    if (item) list.push(item);
  }
  return list;
}

console.log("Parsing 26066...");
const b6_26066 = await parseExcelRows(
  path.join(jDir26066, "MAU_06_26066_fix.xlsx"),
  (row, getVal, stt) => {
    const maMay = getVal(row, "MA_MAY");
    const tenTb = getVal(row, "TEN_TB");
    if (!maMay && !tenTb) return null;
    return {
      stt,
      tenTb: tenTb || maMay,
      kyHieu: getVal(row, "KY_HIEU"),
      congTySx: getVal(row, "CONGTY_SX"),
      nuocSx: getVal(row, "NUOC_SX"),
      namSx: getVal(row, "NAM_SX"),
      namSd: getVal(row, "NAM_SD"),
      maMay,
      soLuuHanh: getVal(row, "SO_LUU_HANH"),
      hdTu: getVal(row, "HD_TU"),
      hdDen: getVal(row, "HD_DEN"),
      tuNgay: getVal(row, "TU_NGAY"),
      denNgay: getVal(row, "DEN_NGAY"),
      maCskcb: "26066",
    };
  },
);

const b2_26066 = await parseExcelRows(
  path.join(jDir26066, "FileMau_Bang2_nhanluckcb OK.xlsx"),
  (row, getVal, stt) => {
    const macchn = getVal(row, "MACCHN") || getVal(row, "MA_CCHN");
    const hoTen = getVal(row, "HO_TEN");
    if (!macchn && !hoTen) return null;
    return {
      stt,
      maKhoa: getVal(row, "MA_KHOA"),
      tenKhoa: getVal(row, "TEN_KHOA"),
      hoTen: hoTen || macchn,
      gioiTinh: getVal(row, "GIOI_TINH"),
      soDinhDanh: getVal(row, "SO_DINH_DANH") || getVal(row, "SO_CCCD"),
      chucDanhNn: getVal(row, "CHUCDANH_NN"),
      viTri: getVal(row, "VI_TRI"),
      macchn: macchn || hoTen,
      ngayCapCchn: getVal(row, "NGAYCAP_CCHN"),
      noiCapCchn: getVal(row, "NOICAP_CCHN"),
      phamViCm: getVal(row, "PHAMVI_CM"),
      maCskcb: "26066",
    };
  },
);

console.log("Parsing 26193 from Downloads...");
const b1_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileKhoaPhongGiuong.xlsx"),
  (row, getVal, stt) => {
    const maKhoa = getVal(row, "MA_KHOA");
    if (!maKhoa) return null;
    return {
      stt,
      maKhoa,
      tenKhoa: getVal(row, "TEN_KHOA") || maKhoa,
      banKham: getVal(row, "BAN_KHAM"),
      giuongPd: Number(getVal(row, "GIUONG_PD")) || null,
      giuongTk: Number(getVal(row, "GIUONG_TK")) || null,
      giuongHstc: Number(getVal(row, "GIUONG_HSTC")) || null,
      giuongHscc: Number(getVal(row, "GIUONG_HSCC")) || null,
      tuNgay: getVal(row, "TU_NGAY"),
      denNgay: getVal(row, "DEN_NGAY"),
      maCskcb: "26193",
    };
  },
);

const b2_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileNhanVienYTe.xlsx"),
  (row, getVal, stt) => {
    const macchn = getVal(row, "MACCHN") || getVal(row, "MA_CCHN");
    const hoTen = getVal(row, "HO_TEN");
    if (!macchn && !hoTen) return null;
    return {
      stt,
      maKhoa: getVal(row, "MA_KHOA"),
      tenKhoa: getVal(row, "TEN_KHOA"),
      hoTen: hoTen || macchn,
      gioiTinh: getVal(row, "GIOI_TINH"),
      soDinhDanh: getVal(row, "SO_CCCD") || getVal(row, "CCCD") || getVal(row, "SO_DINH_DANH"),
      chucDanhNn: getVal(row, "CHUCDANH_NN") || getVal(row, "CHUC_DANH"),
      viTri: getVal(row, "VI_TRI"),
      macchn: macchn || hoTen,
      ngayCapCchn: getVal(row, "NGAYCAP_CCHN") || getVal(row, "NGAY_CAP_CCHN"),
      noiCapCchn: getVal(row, "NOICAP_CCHN") || getVal(row, "NOI_CAP_CCHN"),
      phamViCm: getVal(row, "PHAMVI_CM") || getVal(row, "PHAM_VI_CM"),
      maCskcb: "26193",
    };
  },
);

const b3_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileDanhMucThuoc.xlsx"),
  (row, getVal, stt) => {
    const maThuoc = getVal(row, "MA_THUOC");
    if (!maThuoc) return null;
    return {
      stt,
      maThuoc,
      tenHoatChat: getVal(row, "TEN_HOAT_CHAT"),
      tenThuoc: getVal(row, "TEN_THUOC") || maThuoc,
      donViTinh: getVal(row, "DON_VI_TINH") || getVal(row, "DVT"),
      hamLuong: getVal(row, "HAM_LUONG"),
      duongDung: getVal(row, "DUONG_DUNG"),
      maDuongDung: getVal(row, "MA_DUONG_DUNG"),
      dangBaoChe: getVal(row, "DANG_BAO_CHE"),
      soDangKy: getVal(row, "SO_DANG_KY") || getVal(row, "SDK"),
      soLuong: Number(getVal(row, "SO_LUONG")) || null,
      donGia: Number(getVal(row, "DON_GIA")) || Number(getVal(row, "DON_GIA_BH")) || null,
      maCskcb: "26193",
    };
  },
);

const b4_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileVatTuYTe.xlsx"),
  (row, getVal, stt) => {
    const maVatTu = getVal(row, "MA_VAT_TU");
    if (!maVatTu) return null;
    return {
      stt,
      maVatTu,
      nhomVatTu: getVal(row, "NHOM_VAT_TU"),
      tenVatTu: getVal(row, "TEN_VAT_TU") || maVatTu,
      maHieu: getVal(row, "MA_HIEU"),
      soLuuHanh: getVal(row, "SO_LUU_HANH"),
      tinhNangKt: getVal(row, "TINHNANG_KT"),
      quyCach: getVal(row, "QUY_CACH"),
      hangSx: getVal(row, "HANG_SX"),
      nuocSx: getVal(row, "NUOC_SX"),
      donViTinh: getVal(row, "DON_VI_TINH") || getVal(row, "DVT"),
      donGia: Number(getVal(row, "DON_GIA")) || Number(getVal(row, "DON_GIA_BH")) || null,
      maCskcb: "26193",
    };
  },
);

const b5_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileDichVuBV.xlsx"),
  (row, getVal, stt) => {
    const maDichVu =
      getVal(row, "MA_DICH_VU") || getVal(row, "MA_TUONG_DUONG") || getVal(row, "MA");
    const tenDichVu =
      getVal(row, "TEN_DICH_VU") || getVal(row, "TEN_DVKT_PHEDUYET") || getVal(row, "TEN_DVKT_GIA");
    if (!maDichVu && !tenDichVu) return null;
    return {
      stt,
      maDichVu: maDichVu || tenDichVu,
      tenDichVu: tenDichVu || maDichVu,
      tenDvktGia: getVal(row, "TEN_DVKT_GIA"),
      donGia: Number(getVal(row, "DON_GIA")) || Number(getVal(row, "GIA")) || null,
      quyTrinh: getVal(row, "QUY_TRINH"),
      soLuongCgkt: Number(getVal(row, "SO_LUONG_CGKT")) || null,
      cskcbCgkt: getVal(row, "CSKCB_CGKT"),
      cskcbCls: getVal(row, "CSKCB_CLS"),
      qdDvkt: getVal(row, "QD_DVKT") || getVal(row, "QUYET_DINH") || getVal(row, "SO_QUYET_DINH"),
      qdPdGia: getVal(row, "QD_PD_GIA"),
      ghiChu: getVal(row, "GHI_CHU") || getVal(row, "GHICHU"),
      maCskcb: "26193",
    };
  },
);

const b6_26193 = await parseExcelRows(
  path.join(downloadsDir, "FileTrangThietBi.xlsx"),
  (row, getVal, stt) => {
    const maMay = getVal(row, "MA_MAY");
    const tenTb = getVal(row, "TEN_TB") || getVal(row, "TEN_THIET_BI");
    if (!maMay && !tenTb) return null;
    return {
      stt,
      tenTb: tenTb || maMay,
      kyHieu: getVal(row, "KY_HIEU") || getVal(row, "MODEL"),
      congTySx: getVal(row, "CONGTY_SX") || getVal(row, "HANG_SX"),
      nuocSx: getVal(row, "NUOC_SX"),
      namSx: getVal(row, "NAM_SX"),
      namSd: getVal(row, "NAM_SD"),
      maMay,
      soLuuHanh: getVal(row, "SO_LUU_HANH"),
      hdTu: getVal(row, "HD_TU"),
      hdDen: getVal(row, "HD_DEN"),
      tuNgay: getVal(row, "TU_NGAY"),
      denNgay: getVal(row, "DEN_NGAY"),
      maCskcb: "26193",
    };
  },
);

console.log("Stats:");
console.log("  26066: B2=" + b2_26066.length + ", B6=" + b6_26066.length);
console.log(
  "  26193: B1=" +
    b1_26193.length +
    ", B2=" +
    b2_26193.length +
    ", B3=" +
    b3_26193.length +
    ", B4=" +
    b4_26193.length +
    ", B5=" +
    b5_26193.length +
    ", B6=" +
    b6_26193.length,
);

const catalogs = {
  26066: {
    unit: {
      maCskcb: "26066",
      tenCskcb: "Bệnh viện Đa khoa Lạc Việt Phúc Yên",
      capKcb: "co_ban",
      ghiChu: "Cơ sở KCB cấp cơ bản - Phúc Yên, Vĩnh Phúc",
    },
    bang1: [],
    bang2: b2_26066,
    bang3: [],
    bang4: [],
    bang5: [],
    bang6: b6_26066,
    updatedAt: "2026-04-01T08:00:00+07:00",
  },
  26193: {
    unit: {
      maCskcb: "26193",
      tenCskcb: "Bệnh viện Hữu nghị Lạc Việt",
      capKcb: "co_ban",
      ghiChu: "Cơ sở KCB cấp cơ bản - Vĩnh Yên, Vĩnh Phúc",
    },
    bang1: b1_26193,
    bang2: b2_26193,
    bang3: b3_26193,
    bang4: b4_26193,
    bang5: b5_26193,
    bang6: b6_26193,
    updatedAt: "2026-11-27T10:00:00+07:00",
  },
};

const tsContent = `/**
 * Dữ liệu mặc định ban đầu danh mục Thông tư 12 của các cơ sở khám chữa bệnh
 * Tác giả: Nguyễn Sơn Nam (Nsnnam)
 */
import type { Tt12UnitData } from "./tt12-library.ts";

export const DEFAULT_TT12_CATALOGS: Record<string, Tt12UnitData> = ${JSON.stringify(catalogs, null, 2)};
`;

fs.writeFileSync("src/lib/tt12-default-data.ts", tsContent, "utf-8");
console.log("Successfully updated src/lib/tt12-default-data.ts!");
