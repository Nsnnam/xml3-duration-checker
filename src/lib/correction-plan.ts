import ExcelJS from "exceljs";
import fileSaver from "file-saver";
import { formatTimestampForFilename, formatXmlDateTime, formatXmlDate } from "./timezone.ts";
import type { BatchAnalysis, Xml3Record, ValidationWarning, PatientInfo } from "./xml3-duration.ts";
import { parseXmlDateTime } from "./xml3-duration.ts";

const saveAs =
  typeof fileSaver === "function"
    ? fileSaver
    : (fileSaver as unknown as { saveAs: typeof fileSaver }).saveAs || fileSaver;

export type CorrectionItem = {
  id: string;
  maLk: string;
  maBa: string;
  hoTen: string;
  ngayVao: string;
  ngayRa: string;
  tuNgay: string; // DD/MM/YYYY
  denNgay: string; // DD/MM/YYYY
  tab: string; // XML1 - XML15 (ví dụ: XML1, XML2, XML3, XML4, XML7...)
  stt: string;
  maDichVu: string;
  tenDichVu: string;
  field: string; // NGAY_KQ, NGAY_TH_YL, NGAY_YL, MA_MAY, SO_CCCD, KET_LUAN, etc.
  oldValue: string;
  newValue: string;
  lyDo: string;
  createdAt: string;
};

const STORAGE_KEY = "nsn_xml130_correction_plan";

export function loadCorrectionPlan(): CorrectionItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveCorrectionPlan(items: CorrectionItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Chuyển chuỗi yyyyMMdd... sang DD/MM/YYYY
 */
export function toHisDateString(val?: string): string {
  if (!val || val.length < 8) return "";
  const y = val.slice(0, 4);
  const m = val.slice(4, 6);
  const d = val.slice(6, 8);
  return `${d}/${m}/${y}`;
}

export const COMMON_LABELS: Record<string, string> = {
  // Định danh chung
  STT: "Số thứ tự",
  MA_LK: "Mã liên kết",
  MA_BN: "Mã bệnh nhân",
  HO_TEN: "Họ và tên",
  SO_CCCD: "Số CCCD / Định danh",
  NGAY_SINH: "Ngày sinh",
  NAM_SINH: "Năm sinh",
  GIOI_TINH: "Giới tính",
  DIA_CHI: "Địa chỉ thường trú",
  MA_THE_BHYT: "Mã thẻ BHYT",
  MA_THE: "Mã thẻ BHYT",
  MA_DKBD: "Mã nơi ĐK KCB ban đầu",
  GT_THE_TU: "Giá trị thẻ từ ngày",
  GT_THE_DEN: "Giá trị thẻ đến ngày",
  MIEN_CUNG_CT: "Miễn cùng chi trả từ ngày",
  NAM_NAM_LIEN_TUC: "Thời điểm đủ 5 năm liên tục",
  MA_DOITUONG_KCB: "Mã đối tượng KCB",
  MA_CSKCB: "Mã cơ sở KCB",
  MA_NOI_CHUYEN: "Mã cơ sở chuyển đến/đi",
  MA_NOI_DI: "Mã nơi chuyển đi",
  MA_NOI_DEN: "Mã nơi chuyển đến",
  MA_TAI_NAN: "Mã tai nạn",
  NGAY_VAO: "Thời gian vào viện",
  NGAY_RA: "Thời gian ra viện",
  SO_NGAY_DTRI: "Số ngày điều trị",
  MA_KHOA: "Mã khoa chỉ định / điều trị",
  TEN_KHOA: "Tên khoa",
  MA_GIUONG: "Mã giường bệnh",
  KET_QUA_DTRI: "Kết quả điều trị",
  TINH_TRANG_RV: "Tình trạng ra viện",
  CHAN_DOAN_VAO: "Chẩn đoán khi vào viện",
  CHAN_DOAN_RV: "Chẩn đoán khi ra viện",
  MA_BENH: "Mã bệnh chính (ICD-10)",
  MA_BENH_CHINH: "Mã bệnh chính (ICD-10)",
  TEN_BENH: "Tên bệnh chính",
  MA_BENHKEMTHEO: "Mã bệnh kèm theo",
  MA_BENH_KT: "Mã bệnh kèm theo",
  MA_BENH_YHCT: "Mã bệnh YHCT",
  MA_QUOCTICH: "Mã quốc tịch",
  MA_DANTOC: "Mã dân tộc",
  MA_KHUVUC: "Mã khu vực sống",
  MA_LOAI_KCB: "Mã loại KCB (1:Khám, 2:Ngoại, 3:Nội)",
  NGHE_NGHIEP: "Nghề nghiệp",
  NOI_LAM_VIEC: "Nơi làm việc",
  CAN_NANG: "Cân nặng (kg / gam)",
  NGAY_TTOAN: "Ngày thanh toán",
  TIEN_TONGCHI: "Tổng chi phí KCB",
  TIEN_TONG: "Tổng chi phí KCB",
  TIEN_BHYT: "Chi phí BHYT thanh toán",
  TIEN_BHTT: "Tiền BHYT thanh toán",
  TIEN_BNTT: "Bệnh nhân tự trả",
  TIEN_BNCT: "Bệnh nhân cùng chi trả",
  TIEN_NGUONKHAC: "Nguồn kinh phí khác",
  TIEN_NGOAIDS: "Chi phí ngoài danh mục",
  NAM_QT: "Năm quyết toán",
  THANG_QT: "Tháng quyết toán",
  MA_LOAI_RV: "Mã loại ra viện",
  NGAY_TAI_KHAM: "Ngày hẹn tái khám",

  // Thuốc & Vật tư y tế & Dịch vụ kỹ thuật
  MA_DICH_VU: "Mã dịch vụ kỹ thuật",
  TEN_DICH_VU: "Tên dịch vụ kỹ thuật",
  MA_THUOC: "Mã thuốc theo BYT",
  TEN_THUOC: "Tên thuốc",
  MA_VAT_TU: "Mã vật tư y tế",
  TEN_VAT_TU: "Tên vật tư y tế",
  GOI_VTYT: "Tên gói vật tư y tế",
  MA_NHOM: "Mã nhóm chi phí BHYT",
  DON_VI_TINH: "Đơn vị tính",
  HAM_LUONG: "Hàm lượng / nồng độ",
  DUONG_DUNG: "Đường dùng thuốc",
  SO_DANG_KY: "Số đăng ký / GPNK",
  SO_LUONG: "Số lượng",
  DON_GIA: "Đơn giá thanh toán",
  DON_GIA_BV: "Đơn giá bệnh viện",
  TYLE_TT: "Tỷ lệ thanh toán BHYT (%)",
  THANH_TIEN: "Thành tiền",
  MA_BAC_SI: "Mã bác sĩ chỉ định",
  MA_BS: "Mã bác sĩ",
  NGUOI_THUC_HIEN: "Người thực hiện",
  NGAY_YL: "Ngày giờ y lệnh",
  NGAY_TH_YL: "Ngày giờ thực hiện y lệnh",
  NGAY_KQ: "Ngày giờ có kết quả",
  MA_PTTT: "Mã phẫu thuật thủ thuật",
  MA_MAY: "Mã máy thực hiện",
  MA_HIEU_SP: "Mã hiệu sản phẩm",
  TT_THAU: "Thông tin thầu",
  LIEU_DUNG: "Liều dùng / cách dùng",
  VET_THUONG_TP: "Vết thương thực thể",

  // Cận lâm sàng & Kết quả
  MA_CHI_SO: "Mã chỉ số xét nghiệm",
  TEN_CHI_SO: "Tên chỉ số xét nghiệm",
  GIA_TRI: "Chỉ số / Giá trị kết quả",
  KET_LUAN: "Kết luận cận lâm sàng",
  MO_TA: "Mô tả hình ảnh / tổn thương",

  // Hồ sơ, giấy tờ & diễn biến
  DIEN_BIEN: "Diễn biến bệnh",
  HOI_CHAN: "Nội dung hội chẩn",
  PHAU_THUAT: "Quá trình phẫu thuật thủ thuật",
  TOM_TAT_BA: "Tóm tắt bệnh án",
  PP_DIEUTRI: "Phương pháp điều trị",
  SO_SERI: "Số seri chứng từ",
  SO_KCB: "Số sổ khám chữa bệnh",
  NGOAITRU_TUNGAY: "Ngoại trú từ ngày",
  NGOAITRU_DENNGAY: "Ngoại trú đến ngày",
  SO_NGAY_NGHI: "Số ngày nghỉ ngoại trú",
  MA_TRUONGKHOA: "Mã trưởng khoa",
  HO_TEN_CHA: "Họ tên cha / giám hộ",
  HO_TEN_ME: "Họ tên mẹ",
};

export function getFieldLabel(key: string): string {
  return COMMON_LABELS[key.toUpperCase()] || key;
}

export function isDateTimeFieldName(f: string): boolean {
  const upper = f.toUpperCase();
  return (
    upper.startsWith("NGAY_") ||
    upper.endsWith("_NGAY") ||
    upper.includes("_TUNGAY") ||
    upper.includes("_DENNGAY") ||
    upper.includes("THOIGIAN") ||
    upper === "NAM_NAM_LIEN_TUC" ||
    upper === "MIEN_CUNG_CT"
  );
}

/**
 * Cộng thêm hoặc trừ lùi số phút vào chuỗi yyyyMMddHHmm (hoặc yyyyMMddHHmmss)
 * Tuyệt đối dùng getUTC* để không bị lệch múi giờ cục bộ (GMT+7)
 */
export function addMinutesToXmlDateTime(dtStr: string, minutes: number): string {
  const trimmed = dtStr.trim();
  const d = parseXmlDateTime(trimmed);
  if (!d) return trimmed;
  const newDate = new Date(d.getTime() + minutes * 60000);
  const y = newDate.getUTCFullYear();
  const m = String(newDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(newDate.getUTCDate()).padStart(2, "0");
  const h = String(newDate.getUTCHours()).padStart(2, "0");
  const min = String(newDate.getUTCMinutes()).padStart(2, "0");
  if (trimmed.length >= 14) {
    const sec = String(newDate.getUTCSeconds()).padStart(2, "0");
    return `${y}${m}${day}${h}${min}${sec}`;
  }
  return `${y}${m}${day}${h}${min}`;
}

/**
 * Tự động tạo kế hoạch chỉnh sửa tối ưu từ kết quả phân tích
 */
export function generateAutoCorrectionPlan(analysis: BatchAnalysis): CorrectionItem[] {
  const plan: CorrectionItem[] = [];
  const nowStr = new Date().toISOString();

  // 1. Quét XML3
  // Sắp xếp các bản ghi theo MA_MAY và NGAY_TH_YL để xử lý trùng máy
  const machineGroups = new Map<string, Xml3Record[]>();
  for (const r of analysis.records) {
    if (r.hasDuplicateMachineWarning && r.MA_MAY && r.NGAY_TH_YL) {
      const key = `${r.MA_MAY.trim()}|${r.NGAY_TH_YL.trim()}`;
      const group = machineGroups.get(key) || [];
      group.push(r);
      machineGroups.set(key, group);
    }
  }

  // Set để đánh dấu các record đã xử lý trùng máy
  const handledDupKeys = new Set<string>();

  for (const group of machineGroups.values()) {
    if (group.length > 1) {
      // Giữ bản ghi đầu tiên, các bản ghi tiếp theo dịch thời gian thực hiện
      for (let i = 1; i < group.length; i++) {
        const r = group[i];
        const offsetMins = i * 5; // Dịch 5, 10, 15 phút
        const newThYl = addMinutesToXmlDateTime(r.NGAY_TH_YL, offsetMins);

        // Nếu có NGAY_KQ, cũng dịch NGAY_KQ tương ứng để giữ nguyên thời lượng
        const patient = r.patient;
        const ngayRa = patient?.NGAY_RA || "";
        const ngayVao = patient?.NGAY_VAO || "";
        const tuNgay =
          toHisDateString(ngayRa) || toHisDateString(ngayVao) || toHisDateString(r.NGAY_YL);
        const denNgay = toHisDateString(ngayRa) || tuNgay;

        const itemKey = `${r.MA_LK}_${r.STT}_NGAY_TH_YL`;
        handledDupKeys.add(itemKey);

        plan.push({
          id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          maLk: r.MA_LK,
          maBa: r.MA_BN || patient?.MA_BN || "",
          hoTen: r.HO_TEN || patient?.HO_TEN || "",
          ngayVao,
          ngayRa,
          tuNgay,
          denNgay,
          tab: "XML3",
          stt: r.STT,
          maDichVu: r.MA_DICH_VU,
          tenDichVu: r.TEN_DICH_VU,
          field: "NGAY_TH_YL",
          oldValue: r.NGAY_TH_YL,
          newValue: newThYl,
          lyDo: `Tránh trùng thời gian trên cùng mã máy ${r.MA_MAY} (dịch +${offsetMins} phút)`,
          createdAt: nowStr,
        });

        // Nếu thời lượng sau khi dịch hoặc ban đầu > 70 phút, chỉnh lại NGAY_KQ
        if (r.NGAY_KQ) {
          const newKq = addMinutesToXmlDateTime(newThYl, 30); // 30 phút là mức chuẩn an toàn
          plan.push({
            id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            maLk: r.MA_LK,
            maBa: r.MA_BN || patient?.MA_BN || "",
            hoTen: r.HO_TEN || patient?.HO_TEN || "",
            ngayVao,
            ngayRa,
            tuNgay,
            denNgay,
            tab: "XML3",
            stt: r.STT,
            maDichVu: r.MA_DICH_VU,
            tenDichVu: r.TEN_DICH_VU,
            field: "NGAY_KQ",
            oldValue: r.NGAY_KQ,
            newValue: newKq,
            lyDo: `Đồng bộ NGAY_KQ sau khi dịch thời gian thực hiện máy (thời lượng 30 phút)`,
            createdAt: nowStr,
          });
        }
      }
    }
  }

  // 2. Quét các lỗi thời lượng > 70 phút (không bị trùng máy)
  for (const r of analysis.records) {
    const maxMins = r.serviceRule?.maxMinutes ?? 70;
    const isOver = r.durationMinutes !== null && r.durationMinutes > maxMins;
    const itemThKey = `${r.MA_LK}_${r.STT}_NGAY_TH_YL`;

    if (isOver && !handledDupKeys.has(itemThKey)) {
      const patient = r.patient;
      const ngayRa = patient?.NGAY_RA || "";
      const ngayVao = patient?.NGAY_VAO || "";
      const tuNgay =
        toHisDateString(ngayRa) || toHisDateString(ngayVao) || toHisDateString(r.NGAY_YL);
      const denNgay = toHisDateString(ngayRa) || tuNgay;

      // Đặt NGAY_KQ = NGAY_TH_YL + 30 phút (đảm bảo <= 70 phút và hợp lý lâm sàng)
      const targetDuration = Math.min(30, maxMins);
      const newKq = addMinutesToXmlDateTime(r.NGAY_TH_YL, targetDuration);

      plan.push({
        id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        maLk: r.MA_LK,
        maBa: r.MA_BN || patient?.MA_BN || "",
        hoTen: r.HO_TEN || patient?.HO_TEN || "",
        ngayVao,
        ngayRa,
        tuNgay,
        denNgay,
        tab: "XML3",
        stt: r.STT,
        maDichVu: r.MA_DICH_VU,
        tenDichVu: r.TEN_DICH_VU,
        field: "NGAY_KQ",
        oldValue: r.NGAY_KQ,
        newValue: newKq,
        lyDo: `Rút ngắn thời lượng thực hiện từ ${r.durationMinutes} phút xuống ${targetDuration} phút (ngưỡng tối đa: ${maxMins} phút)`,
        createdAt: nowStr,
      });
    }

    // 2.1. Ca trùng giờ thực hiện và trả kết quả (0 phút): Căn cứ giờ kết quả trừ lùi 10 phút để điền vào giờ thực hiện
    const isSameThKq =
      r.hasEqualWarning ||
      (Boolean(r.NGAY_TH_YL) && Boolean(r.NGAY_KQ) && r.NGAY_TH_YL === r.NGAY_KQ);
    if (isSameThKq && !handledDupKeys.has(itemThKey) && r.NGAY_KQ) {
      const patient = r.patient;
      const ngayRa = patient?.NGAY_RA || "";
      const ngayVao = patient?.NGAY_VAO || "";
      const tuNgay =
        toHisDateString(ngayRa) || toHisDateString(ngayVao) || toHisDateString(r.NGAY_YL);
      const denNgay = toHisDateString(ngayRa) || tuNgay;

      const newThYl = addMinutesToXmlDateTime(r.NGAY_KQ, -10);
      plan.push({
        id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        maLk: r.MA_LK,
        maBa: r.MA_BN || patient?.MA_BN || "",
        hoTen: r.HO_TEN || patient?.HO_TEN || "",
        ngayVao,
        ngayRa,
        tuNgay,
        denNgay,
        tab: "XML3",
        stt: r.STT,
        maDichVu: r.MA_DICH_VU,
        tenDichVu: r.TEN_DICH_VU,
        field: "NGAY_TH_YL",
        oldValue: r.NGAY_TH_YL,
        newValue: newThYl,
        lyDo: "Trừ lùi giờ thực hiện y lệnh 10 phút so với giờ trả kết quả để tránh trùng giờ (0 phút)",
        createdAt: nowStr,
      });
      handledDupKeys.add(itemThKey);
    }

    // Lỗi sai thứ tự thời gian: NGAY_TH_YL < NGAY_YL
    if (r.hasOrderWarning && r.NGAY_YL && r.NGAY_TH_YL) {
      const patient = r.patient;
      const ngayRa = patient?.NGAY_RA || "";
      const ngayVao = patient?.NGAY_VAO || "";
      const tuNgay =
        toHisDateString(ngayRa) || toHisDateString(ngayVao) || toHisDateString(r.NGAY_YL);
      const denNgay = toHisDateString(ngayRa) || tuNgay;

      const isExam = r.MA_NHOM?.trim() === "13";
      // Đối với công khám (nhóm 13): copy ngược NGAY_TH_YL vào NGAY_YL (2 thời gian trùng nhau được)
      const newYl = isExam ? r.NGAY_TH_YL : addMinutesToXmlDateTime(r.NGAY_TH_YL, -5);
      plan.push({
        id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        maLk: r.MA_LK,
        maBa: r.MA_BN || patient?.MA_BN || "",
        hoTen: r.HO_TEN || patient?.HO_TEN || "",
        ngayVao,
        ngayRa,
        tuNgay,
        denNgay,
        tab: "XML3",
        stt: r.STT,
        maDichVu: r.MA_DICH_VU,
        tenDichVu: r.TEN_DICH_VU,
        field: "NGAY_YL",
        oldValue: r.NGAY_YL,
        newValue: newYl,
        lyDo: isExam
          ? "Công khám (nhóm 13): Đồng bộ NGAY_YL = NGAY_TH_YL (cho phép trùng thời gian y lệnh và thực hiện)"
          : `Khắc phục lỗi thứ tự: NGAY_TH_YL sớm hơn NGAY_YL (điều chỉnh NGAY_YL trước 5 phút)`,
        createdAt: nowStr,
      });
    }
  }

  // 3. Quét XML1 cảnh báo CCCD dưới 12 chữ số
  if (analysis.xml1Warnings) {
    for (const w of analysis.xml1Warnings) {
      if (w.message.includes("CCCD") || w.message.includes("12 ký tự")) {
        const patient = w.patient;
        const currentCccd = (patient?.SO_CCCD || "").trim();
        if (currentCccd && currentCccd.length < 12) {
          const padded = currentCccd.padStart(12, "0");
          const ngayRa = patient?.NGAY_RA || "";
          const ngayVao = patient?.NGAY_VAO || "";
          const tuNgay = toHisDateString(ngayRa) || toHisDateString(ngayVao);
          const denNgay = toHisDateString(ngayRa) || tuNgay;

          plan.push({
            id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            maLk: w.MA_LK,
            maBa: w.MA_BN || patient?.MA_BN || "",
            hoTen: w.HO_TEN || patient?.HO_TEN || "",
            ngayVao,
            ngayRa,
            tuNgay,
            denNgay,
            tab: "XML1",
            stt: "1",
            maDichVu: "SO_CCCD",
            tenDichVu: "Số CCCD / Định danh cá nhân",
            field: "SO_CCCD",
            oldValue: currentCccd,
            newValue: padded,
            lyDo: `Bổ sung số 0 vào đầu để chuẩn hóa đủ 12 chữ số theo quy định BHYT`,
            createdAt: nowStr,
          });
        }
      }
    }
  }

  // 4. Quét XML4 cảnh báo thiếu KET_LUAN (Sao chép trực tiếp từ ô GIA_TRI nếu có)
  if (analysis.xml4Warnings) {
    for (const w of analysis.xml4Warnings) {
      if (w.message.includes("KET_LUAN")) {
        const patient = w.patient;
        const ngayRa = patient?.NGAY_RA || "";
        const ngayVao = patient?.NGAY_VAO || "";
        const tuNgay = toHisDateString(ngayRa) || toHisDateString(ngayVao);
        const denNgay = toHisDateString(ngayRa) || tuNgay;

        const hasGiaTri = Boolean(w.giaTri && w.giaTri.trim());
        const newKLuann = hasGiaTri ? w.giaTri!.trim() : "Bình thường";
        const lyDo = hasGiaTri
          ? "Sao chép kết quả từ ô GIA_TRI trong XML4 sang KET_LUAN"
          : "Bổ sung kết luận dịch vụ CLS theo quy định";

        plan.push({
          id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          maLk: w.MA_LK,
          maBa: w.MA_BN || patient?.MA_BN || "",
          hoTen: w.HO_TEN || patient?.HO_TEN || "",
          ngayVao,
          ngayRa,
          tuNgay,
          denNgay,
          tab: "XML4",
          stt: String(w.detailIndex || "1"),
          maDichVu: w.MA_DICH_VU,
          tenDichVu: w.TEN_DICH_VU,
          field: "KET_LUAN",
          oldValue: "(trống)",
          newValue: newKLuann,
          lyDo,
          createdAt: nowStr,
        });
      }
    }
  }

  return plan;
}

/**
 * Xuất file JSON kế hoạch chỉnh sửa (chuẩn cho Extension)
 */
export function exportCorrectionPlanJson(items: CorrectionItem[]): void {
  const ts = formatTimestampForFilename(new Date());
  const fileName = `Ke_hoach_chinh_sua_HIS_${ts}.json`;
  const exportPayload = {
    source: "NsN_XMLcheck",
    version: "2.8.0",
    exportTime: new Date().toISOString(),
    totalItems: items.length,
    items,
  };
  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  saveAs(blob, fileName);
}

/**
 * Xuất file Excel kế hoạch chỉnh sửa
 */
export async function exportCorrectionPlanExcel(items: CorrectionItem[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Nguyễn Sơn Nam (Nsnnam)";
  workbook.created = new Date();

  // Sheet 1: Chi tiết kế hoạch sửa
  const sheet = workbook.addWorksheet("Kế hoạch chỉnh sửa");
  sheet.columns = [
    { header: "STT", key: "index", width: 6 },
    { header: "Mã BA", key: "maBa", width: 14 },
    { header: "Họ và tên", key: "hoTen", width: 22 },
    { header: "MA_LK", key: "maLk", width: 14 },
    { header: "Từ ngày (HIS)", key: "tuNgay", width: 14 },
    { header: "Đến ngày (HIS)", key: "denNgay", width: 14 },
    { header: "Tab XML", key: "tab", width: 10 },
    { header: "STT dòng", key: "stt", width: 10 },
    { header: "Mã DV / Thuốc", key: "maDichVu", width: 16 },
    { header: "Tên DV / Thuốc", key: "tenDichVu", width: 28 },
    { header: "Trường sửa", key: "field", width: 14 },
    { header: "Giá trị cũ", key: "oldValue", width: 18 },
    { header: "Giá trị mới", key: "newValue", width: 18 },
    { header: "Lý do chỉnh sửa", key: "lyDo", width: 45 },
  ];

  sheet.views = [{ state: "frozen", ySplit: 1 }];
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "0F766E" } };
  headerRow.alignment = { vertical: "middle", wrapText: true };
  headerRow.height = 30;

  items.forEach((item, idx) => {
    const row = sheet.addRow({
      index: idx + 1,
      maBa: item.maBa,
      hoTen: item.hoTen,
      maLk: item.maLk,
      tuNgay: item.tuNgay,
      denNgay: item.denNgay,
      tab: item.tab,
      stt: item.stt,
      maDichVu: item.maDichVu,
      tenDichVu: item.tenDichVu,
      field: item.field,
      oldValue: item.oldValue,
      newValue: item.newValue,
      lyDo: item.lyDo,
    });

    row.getCell("newValue").font = { bold: true, color: { argb: "000F766E" } };
    row.getCell("oldValue").font = { strike: true, color: { argb: "00991B1B" } };
    row.getCell("field").font = { bold: true };
    row.getCell("maBa").font = { bold: true };
  });

  // Sheet 2: Tóm tắt theo Bệnh án
  const summarySheet = workbook.addWorksheet("Tóm tắt theo Bệnh án");
  summarySheet.columns = [
    { header: "STT", key: "index", width: 6 },
    { header: "Mã Bệnh Án", key: "maBa", width: 15 },
    { header: "Họ và tên", key: "hoTen", width: 25 },
    { header: "MA_LK", key: "maLk", width: 14 },
    { header: "Từ ngày (HIS)", key: "tuNgay", width: 14 },
    { header: "Đến ngày (HIS)", key: "denNgay", width: 14 },
    { header: "Số mục cần sửa", key: "count", width: 15 },
    { header: "Các tab liên quan", key: "tabs", width: 20 },
    { header: "Chi tiết các trường", key: "fields", width: 35 },
  ];

  summarySheet.views = [{ state: "frozen", ySplit: 1 }];
  const sHeaderRow = summarySheet.getRow(1);
  sHeaderRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  sHeaderRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "1E40AF" } };
  sHeaderRow.alignment = { vertical: "middle", wrapText: true };
  sHeaderRow.height = 30;

  // Gom nhóm theo Bệnh án
  const baMap = new Map<string, CorrectionItem[]>();
  for (const item of items) {
    const key = item.maBa || item.maLk;
    const list = baMap.get(key) || [];
    list.push(item);
    baMap.set(key, list);
  }

  let sIdx = 1;
  for (const [key, list] of baMap.entries()) {
    const first = list[0];
    const tabs = Array.from(new Set(list.map((x) => x.tab))).join(", ");
    const fields = Array.from(new Set(list.map((x) => `${x.tab}.${x.field}`))).join(", ");
    summarySheet.addRow({
      index: sIdx++,
      maBa: first.maBa || key,
      hoTen: first.hoTen,
      maLk: first.maLk,
      tuNgay: first.tuNgay,
      denNgay: first.denNgay,
      count: list.length,
      tabs,
      fields,
    });
  }

  const ts = formatTimestampForFilename(new Date());
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `Ke_hoach_chinh_sua_HIS_${ts}.xlsx`);
}
