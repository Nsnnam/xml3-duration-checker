import { useState, useMemo, useEffect, useRef } from "react";
import type { Xml3Record, ValidationWarning } from "./xml3-duration.ts";
import { parseXmlDateTime } from "./xml3-duration.ts";
import { formatXmlDateTime } from "./timezone.ts";
import {
  type CorrectionItem,
  toHisDateString,
  addMinutesToXmlDateTime,
  getFieldLabel,
  isDateTimeFieldName,
} from "./correction-plan.ts";

function calcDiffMinutes(startStr?: string, endStr?: string): number | null {
  if (!startStr || !endStr) return null;
  const dStart = parseXmlDateTime(startStr);
  const dEnd = parseXmlDateTime(endStr);
  if (!dStart || !dEnd) return null;
  return Math.round((dEnd.getTime() - dStart.getTime()) / 60000);
}

function formatDisplayDateTime(val?: string): string {
  if (!val) return "—";
  return formatXmlDateTime(val) || val;
}

function formatShortTime(val?: string): string {
  if (!val || val.length < 12) return "";
  const hh = val.substring(8, 10);
  const mm = val.substring(10, 12);
  return `${hh}:${mm}`;
}

export type CustomRowContext = {
  tab: string;
  row: Record<string, string>;
  headers: string[];
  stt: string;
  maLk: string;
  maBa: string;
  hoTen: string;
  ngayVao?: string;
  ngayRa?: string;
  initialField?: string;
};

export function DirectEditModal({
  isOpen,
  onClose,
  record,
  warning,
  source,
  customRow,
  initialField,
  correctionPlan,
  onSaveCorrection,
  onResetCorrection,
}: {
  isOpen: boolean;
  onClose: () => void;
  record?: Xml3Record;
  warning?: ValidationWarning;
  source: string; // XML1, XML2, XML3, XML4, XML7...
  customRow?: CustomRowContext;
  initialField?: string;
  correctionPlan?: CorrectionItem[];
  onSaveCorrection: (item: CorrectionItem) => void;
  onResetCorrection?: (maLk: string, tab: string, stt: string, maDichVu?: string) => void;
}) {
  const effectiveTab = customRow?.tab || source;
  const patient = record?.patient || warning?.patient;
  const maLk = customRow?.maLk || record?.MA_LK || warning?.MA_LK || "";
  const maBa = customRow?.maBa || record?.MA_BN || warning?.MA_BN || patient?.MA_BN || "";
  const hoTen = customRow?.hoTen || record?.HO_TEN || warning?.HO_TEN || patient?.HO_TEN || "";
  const ngayVao = customRow?.ngayVao || patient?.NGAY_VAO || "";
  const ngayRa = customRow?.ngayRa || customRow?.row?.NGAY_RA || patient?.NGAY_RA || "";
  const stt = customRow?.stt || record?.STT || String(warning?.detailIndex || "1");
  const maDichVu =
    record?.MA_DICH_VU ||
    warning?.MA_DICH_VU ||
    customRow?.row?.MA_DICH_VU ||
    customRow?.row?.MA_THUOC ||
    customRow?.row?.MA_VAT_TU ||
    "";
  const tenDichVu =
    record?.TEN_DICH_VU ||
    warning?.TEN_DICH_VU ||
    customRow?.row?.TEN_DICH_VU ||
    customRow?.row?.TEN_THUOC ||
    customRow?.row?.TEN_VAT_TU ||
    "";

  // Tìm các mục đã được lập kế hoạch sửa trước đó cho dòng này (từ sửa lẻ hoặc sửa hàng loạt)
  const existingPlannedMap = useMemo(() => {
    const map = new Map<string, CorrectionItem>();
    if (!correctionPlan || correctionPlan.length === 0) return map;
    for (const item of correctionPlan) {
      const matchMaLk = item.maLk === maLk;
      const matchTab = item.tab === effectiveTab;
      const matchStt = String(item.stt).trim() === String(stt).trim();
      const matchService = Boolean(
        item.maDichVu && maDichVu && item.maDichVu.trim() === maDichVu.trim(),
      );
      if (matchMaLk && matchTab && (matchStt || matchService)) {
        map.set(item.field, item);
      }
    }
    return map;
  }, [correctionPlan, maLk, effectiveTab, stt, maDichVu]);

  const existingPlannedItems = useMemo(
    () => Array.from(existingPlannedMap.values()),
    [existingPlannedMap],
  );

  // Xác định trường mặc định cần sửa theo loại cảnh báo hoặc ngữ cảnh bảng (ưu tiên trường được chỉ định trực tiếp hoặc đã sửa trong kế hoạch)
  const defaultField = useMemo(() => {
    if (initialField) return initialField;
    if (customRow?.initialField) return customRow.initialField;

    if (existingPlannedMap.size > 0) {
      if (existingPlannedMap.has("NGAY_KQ")) return "NGAY_KQ";
      if (existingPlannedMap.has("NGAY_TH_YL")) return "NGAY_TH_YL";
      if (existingPlannedMap.has("NGAY_YL")) return "NGAY_YL";
      if (existingPlannedMap.has("KET_LUAN")) return "KET_LUAN";
      if (existingPlannedMap.has("SO_CCCD")) return "SO_CCCD";
      if (existingPlannedMap.has("NGOAITRU_TUNGAY")) return "NGOAITRU_TUNGAY";
      const firstField = existingPlannedItems[0]?.field;
      if (firstField) return firstField;
    }

    if (customRow && customRow.headers && customRow.headers.length > 0) {
      if (effectiveTab === "XML7" && customRow.headers.includes("NGOAITRU_TUNGAY")) {
        return "NGOAITRU_TUNGAY";
      }
      if (effectiveTab === "XML1") {
        if (warning?.message?.includes("CCCD") || warning?.message?.includes("12 ký tự"))
          return "SO_CCCD";
        if (customRow.headers.includes("SO_CCCD")) return "SO_CCCD";
        if (customRow.headers.includes("NGAY_TTOAN")) return "NGAY_TTOAN";
      }
      if (effectiveTab === "XML4" && customRow.headers.includes("KET_LUAN")) {
        return "KET_LUAN";
      }
      if (effectiveTab === "XML3") {
        if (record?.hasDuplicateMachineWarning) return "NGAY_TH_YL";
        if (record?.hasOrderWarning && record.NGAY_YL && record.NGAY_TH_YL) return "NGAY_YL";
        if (record?.hasMaMayWarning) return "MA_MAY";
        if (record?.hasTtThauWarning) return "TT_THAU";
        if (record?.NGAY_TH_YL && record?.NGAY_KQ && record.NGAY_TH_YL === record.NGAY_KQ)
          return "NGAY_TH_YL";
        if (warning) {
          if (customRow.headers.includes("NGAY_KQ")) return "NGAY_KQ";
        }
        // Khi không có cảnh báo: mặc định chọn mã dịch vụ hoặc tên dịch vụ để người dùng sửa thông tin chuyên môn
        if (customRow.headers.includes("MA_DICH_VU")) return "MA_DICH_VU";
        if (customRow.headers.includes("TEN_DICH_VU")) return "TEN_DICH_VU";
      }
      const firstCandidate = customRow.headers.find((h) => h !== "MA_LK" && h !== "STT");
      return firstCandidate || customRow.headers[0] || "GIA_TRI";
    }

    if (source === "XML7" || effectiveTab === "XML7") {
      return "NGOAITRU_TUNGAY";
    }
    if (source === "XML1") {
      if (warning?.message?.includes("CCCD") || warning?.message?.includes("12 ký tự"))
        return "SO_CCCD";
      return "NGAY_TTOAN";
    }
    if (source === "XML4") {
      return "KET_LUAN";
    }
    // XML3
    if (record?.hasDuplicateMachineWarning) return "NGAY_TH_YL";
    if (record?.hasOrderWarning && record.NGAY_YL && record.NGAY_TH_YL) return "NGAY_YL";
    if (record?.hasMaMayWarning) return "MA_MAY";
    if (record?.hasTtThauWarning) return "TT_THAU";
    if (record?.NGAY_TH_YL && record?.NGAY_KQ && record.NGAY_TH_YL === record.NGAY_KQ)
      return "NGAY_TH_YL";
    return "NGAY_KQ";
  }, [
    initialField,
    existingPlannedMap,
    existingPlannedItems,
    source,
    effectiveTab,
    record,
    warning,
    customRow,
  ]);

  const [selectedField, setSelectedField] = useState(defaultField);

  // Giá trị cũ ban đầu của trường đang chọn
  const currentOldValue = useMemo(() => {
    if (customRow) {
      return customRow.row[selectedField] ?? "";
    }
    if (source === "XML7" || effectiveTab === "XML7") {
      if (selectedField === "NGOAITRU_TUNGAY") return warning?.giaTri || "";
      return "";
    }
    if (source === "XML1") {
      if (selectedField === "SO_CCCD") return patient?.SO_CCCD || "";
      if (selectedField === "NGAY_TTOAN") return patient?.NGAY_TTOAN || "";
      return "";
    }
    if (source === "XML4") {
      return "";
    }
    // XML3
    if (record) {
      if (selectedField === "NGAY_KQ") return record.NGAY_KQ || "";
      if (selectedField === "NGAY_TH_YL") return record.NGAY_TH_YL || "";
      if (selectedField === "NGAY_YL") return record.NGAY_YL || "";
      if (selectedField === "MA_MAY") return record.MA_MAY || "";
      if (selectedField === "TT_THAU") return record.TT_THAU || "";
      if (selectedField === "MA_DICH_VU") return record.MA_DICH_VU || "";
    }
    return "";
  }, [source, effectiveTab, selectedField, record, patient, customRow, warning]);

  const [newValue, setNewValue] = useState(currentOldValue);
  const [lyDo, setLyDo] = useState("");

  const isExamGroup13 = record?.MA_NHOM?.trim() === "13";
  const ylOld = record?.NGAY_YL || customRow?.row?.NGAY_YL || "";
  const thOld = record?.NGAY_TH_YL || customRow?.row?.NGAY_TH_YL || "";
  const kqOld = record?.NGAY_KQ || customRow?.row?.NGAY_KQ || "";

  const durationOldVal = calcDiffMinutes(thOld, kqOld);
  const isSameExecutionAndResult = Boolean(
    (thOld && kqOld && thOld === kqOld) || durationOldVal === 0,
  );
  const isOverDuration = Boolean(durationOldVal !== null && durationOldVal > 70);

  // Chỉ hiển thị bảng đối chiếu 3 mốc thời gian và khối gợi ý thời gian khi sửa đúng trường thời gian của XML3
  const isXml3TimeField =
    (source === "XML3" || effectiveTab === "XML3") &&
    (selectedField === "NGAY_KQ" ||
      selectedField === "NGAY_TH_YL" ||
      selectedField === "NGAY_YL") &&
    Boolean(record || customRow?.row?.NGAY_TH_YL || customRow?.row?.NGAY_KQ);

  // Tính gợi ý ngày ra viện + 1 ngày cho XML7
  const xml7NextDaySuggestion = useMemo(() => {
    const rawNgayRa = (ngayRa || customRow?.row?.NGAY_RA || patient?.NGAY_RA || "").trim();
    const digits = rawNgayRa.replace(/\D/g, "");
    if (digits.length < 8) return null;
    const y = Number(digits.slice(0, 4));
    const m = Number(digits.slice(4, 6)) - 1;
    const d = Number(digits.slice(6, 8));
    const nextDate = new Date(Date.UTC(y, m, d + 1));
    const nextYmd = `${nextDate.getUTCFullYear()}${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}${String(nextDate.getUTCDate()).padStart(2, "0")}`;
    const displayNext = `${nextYmd.slice(6, 8)}/${nextYmd.slice(4, 6)}/${nextYmd.slice(0, 4)}`;
    const displayNgayRa = `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`;
    return { nextYmd, displayNext, displayNgayRa };
  }, [ngayRa, customRow, patient]);

  useEffect(() => {
    if (isOpen) {
      const explicitField = initialField || customRow?.initialField;
      const targetField = explicitField || defaultField;
      setSelectedField(targetField);
      let initialVal = "";
      let initialLyDo = "Chỉnh sửa dữ liệu tránh cảnh báo BHYT";

      if (existingPlannedMap.has(targetField)) {
        // Trường này đã có trong kế hoạch sửa
        const planned = existingPlannedMap.get(targetField)!;
        initialVal = planned.newValue;
        initialLyDo = planned.lyDo;
      } else if (explicitField && customRow) {
        initialVal = customRow.row[explicitField] ?? "";
        initialLyDo = `Chỉnh sửa trường ${explicitField} bảng ${effectiveTab}`;
      } else if (existingPlannedMap.size > 0 && !explicitField) {
        const firstField = existingPlannedItems[0]?.field || targetField;
        setSelectedField(firstField);
        const planned = existingPlannedMap.get(firstField) || existingPlannedItems[0];
        if (planned) {
          initialVal = planned.newValue;
          initialLyDo = planned.lyDo;
        }
      } else if (effectiveTab === "XML7" || source === "XML7") {
        const oldNgoaiTru = customRow?.row?.NGOAITRU_TUNGAY || warning?.giaTri || "";
        if (xml7NextDaySuggestion && targetField === "NGOAITRU_TUNGAY") {
          const oldTime = oldNgoaiTru.replace(/\D/g, "").slice(8);
          initialVal = oldTime
            ? `${xml7NextDaySuggestion.nextYmd}${oldTime}`
            : xml7NextDaySuggestion.nextYmd;
          initialLyDo = `Điều chỉnh NGOAITRU_TUNGAY bắt đầu từ ${xml7NextDaySuggestion.displayNext} (+1 ngày sau ngày ra viện ${xml7NextDaySuggestion.displayNgayRa}) theo quy định BHYT`;
        } else {
          initialVal = oldNgoaiTru;
        }
      } else if (source === "XML1" || effectiveTab === "XML1") {
        if (targetField === "SO_CCCD")
          initialVal = patient?.SO_CCCD || customRow?.row?.SO_CCCD || "";
        else if (targetField === "NGAY_TTOAN")
          initialVal = patient?.NGAY_TTOAN || customRow?.row?.NGAY_TTOAN || "";
        else if (customRow) initialVal = customRow.row[targetField] || "";
        if (warning?.message) initialLyDo = warning.message;
      } else if ((source === "XML3" || effectiveTab === "XML3") && record) {
        if (
          isSameExecutionAndResult &&
          record.NGAY_KQ &&
          (targetField === "NGAY_TH_YL" || targetField === "NGAY_KQ")
        ) {
          // Ca trùng giờ thực hiện và trả kết quả: tự động gợi ý trừ lùi 10 phút tính từ NGAY_KQ
          initialVal = addMinutesToXmlDateTime(record.NGAY_KQ, -10);
          initialLyDo = `Trừ lùi giờ thực hiện y lệnh 10 phút so với giờ kết quả (${formatShortTime(record.NGAY_KQ)} ➔ ${formatShortTime(initialVal)}) để tránh trùng giờ (0 phút)`;
        } else if (isOverDuration && record.NGAY_TH_YL && targetField === "NGAY_KQ") {
          // Ca vượt thời lượng: gợi ý điện tim / nhanh 10 phút tính từ NGAY_TH_YL
          initialVal = addMinutesToXmlDateTime(record.NGAY_TH_YL, 10);
          initialLyDo = `Rút ngắn thời lượng theo chuẩn điện tim/nhanh 10 phút tính từ giờ thực hiện (${formatShortTime(record.NGAY_TH_YL)} ➔ ${formatShortTime(initialVal)})`;
        } else if (targetField === "NGAY_KQ") {
          initialVal = record.NGAY_KQ || "";
        } else if (targetField === "NGAY_TH_YL") {
          initialVal = record.NGAY_TH_YL || "";
        } else if (targetField === "NGAY_YL") {
          initialVal = record.NGAY_YL || "";
        } else if (targetField === "MA_MAY") {
          initialVal = record.MA_MAY || "";
        } else if (targetField === "TT_THAU") {
          initialVal = record.TT_THAU || "";
        } else if (customRow) {
          initialVal = customRow.row[targetField] || "";
        }

        if (!isSameExecutionAndResult && !isOverDuration) {
          if (record?.hasDuplicateMachineWarning)
            initialLyDo = "Tránh trùng thời gian thực hiện trên cùng mã máy";
          else if (record?.hasOrderWarning) initialLyDo = "Khắc phục sai thứ tự thời gian y lệnh";
          else if (warning?.message) initialLyDo = warning.message;
        }
      } else if (customRow) {
        initialVal = customRow.row[targetField] || "";
        initialLyDo = `Chỉnh sửa trường ${targetField} bảng ${effectiveTab}`;
      }
      setNewValue(initialVal);
      setLyDo(initialLyDo);
    }
  }, [
    isOpen,
    initialField,
    defaultField,
    existingPlannedMap,
    existingPlannedItems,
    record,
    warning,
    patient,
    source,
    effectiveTab,
    customRow,
    xml7NextDaySuggestion,
    isSameExecutionAndResult,
    isOverDuration,
  ]);

  // Khi đổi trường chọn
  const handleFieldChange = (f: string) => {
    setSelectedField(f);
    // Nếu trường này đã có trong kế hoạch sửa thì lấy giá trị đã lập kế hoạch
    if (existingPlannedMap.has(f)) {
      const p = existingPlannedMap.get(f)!;
      setNewValue(p.newValue);
      setLyDo(p.lyDo);
      return;
    }
    let oldVal = "";
    if (customRow) {
      oldVal = customRow.row[f] || "";
    } else if (source === "XML1" || effectiveTab === "XML1") {
      if (f === "SO_CCCD") oldVal = patient?.SO_CCCD || "";
      else if (f === "NGAY_TTOAN") oldVal = patient?.NGAY_TTOAN || "";
    } else if (source === "XML7" || effectiveTab === "XML7") {
      if (f === "NGOAITRU_TUNGAY") oldVal = warning?.giaTri || "";
    } else if (source === "XML3" && record) {
      if (f === "NGAY_KQ") oldVal = record.NGAY_KQ || "";
      else if (f === "NGAY_TH_YL") oldVal = record.NGAY_TH_YL || "";
      else if (f === "NGAY_YL") oldVal = record.NGAY_YL || "";
      else if (f === "MA_MAY") oldVal = record.MA_MAY || "";
      else if (f === "TT_THAU") oldVal = record.TT_THAU || "";
    }
    setNewValue(oldVal);
  };

  // Các hàm gợi ý thông minh
  // 0. Nhóm XML7: Đặt +1 ngày sau ngày ra viện
  const applySuggestXml7NextDay = () => {
    if (xml7NextDaySuggestion) {
      const oldVal = customRow?.row?.NGOAITRU_TUNGAY || currentOldValue || warning?.giaTri || "";
      const oldTime = oldVal.replace(/\D/g, "").slice(8);
      const calculated = oldTime
        ? `${xml7NextDaySuggestion.nextYmd}${oldTime}`
        : xml7NextDaySuggestion.nextYmd;
      setSelectedField("NGOAITRU_TUNGAY");
      setNewValue(calculated);
      setLyDo(
        `Điều chỉnh NGOAITRU_TUNGAY bắt đầu từ ${xml7NextDaySuggestion.displayNext} (+1 ngày sau ngày ra viện ${xml7NextDaySuggestion.displayNgayRa}) theo quy định BHYT`,
      );
    }
  };

  // 1. Nhóm ca trùng giờ (0 phút): Căn cứ vào giờ trả kết quả (NGAY_KQ) trừ lùi X phút để điền vào NGAY_TH_YL
  const applySuggestRewindExecution = (offsetMins = 10) => {
    const base = record?.NGAY_KQ || record?.NGAY_TH_YL || "";
    if (base) {
      const calculated = addMinutesToXmlDateTime(base, -offsetMins);
      setSelectedField("NGAY_TH_YL");
      setNewValue(calculated);
      setLyDo(
        `Trừ lùi giờ thực hiện y lệnh ${offsetMins} phút so với giờ kết quả (${formatShortTime(base)} ➔ ${formatShortTime(calculated)}) để tránh trùng giờ`,
      );
    }
  };

  // 2. Nhóm ca vượt thời lượng: Căn cứ vào giờ thực hiện y lệnh (NGAY_TH_YL) cộng thêm X phút để điền vào NGAY_KQ
  const applySuggestAddDurationFromThYl = (mins: number, label?: string) => {
    if (record?.NGAY_TH_YL) {
      const calculated = addMinutesToXmlDateTime(record.NGAY_TH_YL, mins);
      setSelectedField("NGAY_KQ");
      setNewValue(calculated);
      setLyDo(
        label
          ? `${label}: Đặt giờ kết quả = giờ thực hiện + ${mins} phút (${formatShortTime(record.NGAY_TH_YL)} ➔ ${formatShortTime(calculated)})`
          : `Đặt thời lượng ${mins} phút tính từ giờ thực hiện y lệnh (${formatShortTime(record.NGAY_TH_YL)} ➔ ${formatShortTime(calculated)})`,
      );
    }
  };

  const applySuggestShortenDuration = (mins = 30) => {
    applySuggestAddDurationFromThYl(mins, "Rút ngắn thời lượng");
  };

  const applySuggestShiftExecution = (offsetMins = 5) => {
    if (record?.NGAY_TH_YL) {
      const calculated = addMinutesToXmlDateTime(record.NGAY_TH_YL, offsetMins);
      setSelectedField("NGAY_TH_YL");
      setNewValue(calculated);
      setLyDo(`Dịch thời gian thực hiện y lệnh +${offsetMins} phút để tránh trùng máy`);
    }
  };

  const applySuggestFixOrder = () => {
    if (record?.NGAY_TH_YL) {
      // Đặt NGAY_YL trước NGAY_TH_YL 5 phút hoặc bằng
      const calculated = addMinutesToXmlDateTime(record.NGAY_TH_YL, -5);
      setSelectedField("NGAY_YL");
      setNewValue(calculated);
      setLyDo("Điều chỉnh NGAY_YL trước NGAY_TH_YL 5 phút để đúng thứ tự thời gian");
    }
  };

  const applySuggestExamSync = () => {
    if (record?.NGAY_TH_YL) {
      setSelectedField("NGAY_YL");
      setNewValue(record.NGAY_TH_YL);
      setLyDo(
        "Công khám (nhóm 13): Đồng bộ NGAY_YL = NGAY_TH_YL (cho phép trùng thời gian y lệnh và thực hiện)",
      );
    }
  };

  const applySuggestFromGiaTri = () => {
    const gt = warning?.giaTri?.trim();
    if (gt) {
      setSelectedField("KET_LUAN");
      setNewValue(gt);
      setLyDo("Sao chép kết quả từ ô GIA_TRI của XML4 sang KET_LUAN");
    }
  };

  const applySuggestPaddedCccd = () => {
    const raw = (patient?.SO_CCCD || currentOldValue || "").trim();
    if (raw) {
      setSelectedField("SO_CCCD");
      setNewValue(raw.padStart(12, "0"));
      setLyDo("Thêm số 0 vào đầu để chuẩn hóa đủ 12 chữ số định danh CCCD");
    }
  };

  const applySuggestClearCccd = () => {
    setSelectedField("SO_CCCD");
    setNewValue("");
    setLyDo("Bỏ trống trường SO_CCCD (xóa toàn bộ thông tin)");
  };

  const applySuggestSampleConclusion = (text: string) => {
    setSelectedField("KET_LUAN");
    setNewValue(text);
    setLyDo("Bổ sung nội dung kết luận chẩn đoán xét nghiệm / CLS");
  };

  const ylPlanned = existingPlannedMap.get("NGAY_YL")?.newValue;
  const thPlanned = existingPlannedMap.get("NGAY_TH_YL")?.newValue;
  const kqPlanned = existingPlannedMap.get("NGAY_KQ")?.newValue;

  const ylNew = selectedField === "NGAY_YL" ? newValue : ylPlanned || ylOld;
  const thNew = selectedField === "NGAY_TH_YL" ? newValue : thPlanned || thOld;
  const kqNew = selectedField === "NGAY_KQ" ? newValue : kqPlanned || kqOld;

  const waitOld = calcDiffMinutes(ylOld, thOld);
  const waitNew = calcDiffMinutes(ylNew, thNew);
  const durationOld = calcDiffMinutes(thOld, kqOld);
  const durationNew = calcDiffMinutes(thNew, kqNew);

  // Cho phép bỏ trống / xóa sạch thông tin ở mọi trường dữ liệu khi người dùng muốn xóa trường đó
  const isFieldEmptyAllowed = true;

  const [columnFilter, setColumnFilter] = useState("");

  const availableColumns = useMemo(() => {
    if (customRow && customRow.headers && customRow.headers.length > 0) {
      return customRow.headers;
    }
    if (effectiveTab === "XML1")
      return [
        "SO_CCCD",
        "NGAY_TTOAN",
        "MA_BENH_CHINH",
        "MA_BENH_KT",
        "MA_CSKCB",
        "HO_TEN",
        "NGAY_SINH",
        "GIOI_TINH",
        "DIA_CHI",
        "MA_THE_BHYT",
        "MA_DKBD",
        "GT_THE_TU",
        "GT_THE_DEN",
        "NGAY_VAO",
        "NGAY_RA",
        "KET_QUA_DTRI",
        "TINH_TRANG_RV",
      ];
    if (effectiveTab === "XML2")
      return [
        "MA_THUOC",
        "TEN_THUOC",
        "HAM_LUONG",
        "DON_VI_TINH",
        "LIEU_DUNG",
        "SO_DANG_KY",
        "TT_THAU",
        "SO_LUONG",
        "DON_GIA",
        "TYLE_TT",
        "THANH_TIEN",
        "MA_KHOA",
        "MA_BAC_SI",
        "NGAY_YL",
      ];
    if (effectiveTab === "XML3")
      return [
        "MA_DICH_VU",
        "TEN_DICH_VU",
        "SO_LUONG",
        "DON_GIA",
        "TYLE_TT",
        "THANH_TIEN",
        "MA_KHOA",
        "MA_BAC_SI",
        "MA_MAY",
        "TT_THAU",
        "NGAY_YL",
        "NGAY_TH_YL",
        "NGAY_KQ",
      ];
    if (effectiveTab === "XML4")
      return [
        "MA_DICH_VU",
        "MA_CHI_SO",
        "TEN_CHI_SO",
        "GIA_TRI",
        "MA_MAY",
        "MO_TA",
        "KET_LUAN",
        "NGAY_KQ",
      ];
    if (effectiveTab === "XML5") return ["DIEN_BIEN", "HOI_CHAN", "PHAU_THUAT", "NGAY_YL"];
    if (effectiveTab === "XML7")
      return [
        "NGOAITRU_TUNGAY",
        "NGOAITRU_DENNGAY",
        "SO_NGAY_NGHI",
        "NGAY_RA",
        "CHAN_DOAN_RV",
        "MA_TRUONGKHOA",
        "MA_BS",
      ];
    return Object.keys(customRow?.row || {});
  }, [customRow, effectiveTab]);

  const filteredColumns = useMemo(() => {
    if (!columnFilter.trim()) return availableColumns;
    const q = columnFilter.trim().toLowerCase();
    return availableColumns.filter((col) => {
      const lbl = getFieldLabel(col).toLowerCase();
      const val = String(customRow?.row?.[col] ?? "").toLowerCase();
      return col.toLowerCase().includes(q) || lbl.includes(q) || val.includes(q);
    });
  }, [availableColumns, columnFilter, customRow]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedVal = newValue.trim();

    let finalLyDo = lyDo;
    if (!trimmedVal) {
      if (!finalLyDo || finalLyDo === "Chỉnh sửa dữ liệu tránh cảnh báo BHYT") {
        finalLyDo = `Bỏ trống trường ${selectedField} (xóa thông tin)`;
      }
    }

    const tuNgay =
      toHisDateString(ngayRa) || toHisDateString(ngayVao) || toHisDateString(record?.NGAY_YL);
    const denNgay = toHisDateString(ngayRa) || tuNgay;

    const item: CorrectionItem = {
      id: `CORR_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      maLk,
      maBa,
      hoTen,
      ngayVao,
      ngayRa,
      tuNgay,
      denNgay,
      tab: effectiveTab,
      stt,
      maDichVu: maDichVu || selectedField,
      tenDichVu: tenDichVu || (customRow ? getFieldLabel(selectedField) : selectedField),
      field: selectedField,
      oldValue: currentOldValue,
      newValue: trimmedVal,
      lyDo: finalLyDo,
      createdAt: new Date().toISOString(),
    };

    onSaveCorrection(item);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    handleSave(e);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✏️</span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Sửa trực tiếp & Lập kế hoạch thay đổi
              </h3>
              <p className="text-xs text-slate-500">
                Lưu vào kế hoạch chỉnh sửa để xuất file nạp tự động vào VNPT-HIS Extension
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Thông tin hồ sơ */}
        <div className="bg-slate-50 border-b border-slate-100 px-6 py-3 text-xs grid grid-cols-2 gap-2">
          <div>
            <span className="text-slate-500">Bệnh nhân: </span>
            <b className="text-slate-800">{hoTen || "—"}</b>
          </div>
          <div>
            <span className="text-slate-500">Mã Bệnh Án: </span>
            <b className="font-mono text-teal-800">{maBa || "—"}</b>
          </div>
          <div>
            <span className="text-slate-500">MA_LK: </span>
            <span className="font-mono font-bold text-slate-700">{maLk || "—"}</span>
          </div>
          <div>
            <span className="text-slate-500">Tab / STT: </span>
            <b className="text-teal-700">{effectiveTab}</b> · STT {stt}
          </div>
          {maDichVu && (
            <div className="col-span-2 truncate">
              <span className="text-slate-500">Dịch vụ: </span>
              <span className="font-mono text-[11px] text-slate-700">{maDichVu}</span> —{" "}
              <span className="text-slate-800 font-medium">{tenDichVu}</span>
            </div>
          )}
        </div>

        {/* Form chỉnh sửa có cuộn nếu dài */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Banner thông báo nếu hồ sơ này đã có trong kế hoạch sửa */}
          {existingPlannedItems.length > 0 && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/90 p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs shrink-0">
                  ✓
                </span>
                <div>
                  <div className="text-xs font-black text-emerald-950">
                    Hồ sơ này ĐÃ ĐƯỢC LẬP KẾ HOẠCH SỬA ({existingPlannedItems.length} mục)
                  </div>
                  <div className="text-[11px] text-emerald-800 font-medium">
                    {existingPlannedItems
                      .map(
                        (p) =>
                          `${getFieldLabel(p.field)}: ${p.oldValue || "(trống)"} ➔ ${p.newValue ? p.newValue : "(xóa rỗng / để trống)"}`,
                      )
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onResetCorrection && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          "Khôi phục dòng này về dữ liệu XML ban đầu (hủy khỏi kế hoạch sửa)?",
                        )
                      ) {
                        onResetCorrection(maLk, effectiveTab, stt, maDichVu);
                        onClose();
                      }
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 shadow-2xs transition cursor-pointer"
                    title="Hủy kế hoạch sửa của dòng này, khôi phục về dữ liệu XML ban đầu"
                  >
                    <span>↺</span> Khôi phục về ban đầu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
                  title="Lưu lại cập nhật này vào Kế hoạch sửa"
                >
                  <span>💾</span> Cập nhật lại kế hoạch
                </button>
              </div>
            </div>
          )}

          {/* Bảng đối chiếu 3 mốc thời gian Trước & Sau (Chỉ hiển thị khi sửa trường thời gian của XML3) */}
          {isXml3TimeField ? (
            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                <span className="flex items-center gap-1.5">
                  <span>🕒</span> Bảng đối chiếu 3 mốc thời gian (Trước & Sau chỉnh sửa):
                </span>
                {isExamGroup13 && (
                  <span className="rounded bg-teal-100 text-teal-800 text-[10px] px-2 py-0.5 font-bold">
                    🩺 Công khám (nhóm 13)
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded-xl border border-teal-200/80 bg-white shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 w-32">Mốc thời gian</th>
                      <th className="px-3 py-1.5 w-40">Trước (Hiện tại)</th>
                      <th className="px-3 py-1.5 w-40 bg-teal-50/50 text-teal-900">
                        Sau (Dự kiến)
                      </th>
                      <th className="px-2 py-1.5 text-center w-24">Chọn sửa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {/* NGAY_YL */}
                    <tr className={selectedField === "NGAY_YL" ? "bg-amber-50/60" : ""}>
                      <td className="px-3 py-1.5 font-bold text-slate-700">1. NGAY_YL (Y lệnh)</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">
                        <div>{ylOld || "—"}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDisplayDateTime(ylOld)}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-mono font-bold text-teal-800 bg-teal-50/30">
                        <div>{ylNew || "—"}</div>
                        <div className="text-[10px] text-teal-600">
                          {formatDisplayDateTime(ylNew)}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleFieldChange("NGAY_YL")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            selectedField === "NGAY_YL"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {selectedField === "NGAY_YL" ? "Đang sửa" : "Sửa ô này"}
                        </button>
                      </td>
                    </tr>

                    {/* NGAY_TH_YL */}
                    <tr className={selectedField === "NGAY_TH_YL" ? "bg-amber-50/60" : ""}>
                      <td className="px-3 py-1.5 font-bold text-slate-700">
                        2. NGAY_TH_YL (Thực hiện)
                      </td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">
                        <div>{thOld || "—"}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDisplayDateTime(thOld)}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-mono font-bold text-teal-800 bg-teal-50/30">
                        <div>{thNew || "—"}</div>
                        <div className="text-[10px] text-teal-600">
                          {formatDisplayDateTime(thNew)}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleFieldChange("NGAY_TH_YL")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            selectedField === "NGAY_TH_YL"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {selectedField === "NGAY_TH_YL" ? "Đang sửa" : "Sửa ô này"}
                        </button>
                      </td>
                    </tr>

                    {/* NGAY_KQ */}
                    <tr className={selectedField === "NGAY_KQ" ? "bg-amber-50/60" : ""}>
                      <td className="px-3 py-1.5 font-bold text-slate-700">3. NGAY_KQ (Kết quả)</td>
                      <td className="px-3 py-1.5 font-mono text-slate-600">
                        <div>{kqOld || "—"}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatDisplayDateTime(kqOld)}
                        </div>
                      </td>
                      <td className="px-3 py-1.5 font-mono font-bold text-teal-800 bg-teal-50/30">
                        <div>{kqNew || "—"}</div>
                        <div className="text-[10px] text-teal-600">
                          {formatDisplayDateTime(kqNew)}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleFieldChange("NGAY_KQ")}
                          className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${
                            selectedField === "NGAY_KQ"
                              ? "bg-amber-500 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {selectedField === "NGAY_KQ" ? "Đang sửa" : "Sửa ô này"}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Đánh giá khoảng thời gian Trước -> Sau */}
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <div className="text-slate-500 font-semibold mb-0.5">
                    ⏱️ Chờ thực hiện (TH_YL - YL):
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        waitOld !== null && (isExamGroup13 ? waitOld < 0 : waitOld <= 0)
                          ? "text-rose-600 font-bold"
                          : "text-slate-700"
                      }
                    >
                      Trước: {waitOld !== null ? `${waitOld}p` : "—"}
                    </span>
                    <span>➔</span>
                    <span
                      className={
                        waitNew !== null && (isExamGroup13 ? waitNew >= 0 : waitNew > 0)
                          ? "text-emerald-700 font-bold"
                          : "text-rose-600 font-bold"
                      }
                    >
                      Sau: {waitNew !== null ? `${waitNew}p` : "—"}{" "}
                      {waitNew !== null && (isExamGroup13 ? waitNew >= 0 : waitNew > 0)
                        ? "✓"
                        : "⚠️"}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-2">
                  <div className="text-slate-500 font-semibold mb-0.5">
                    ⏱️ Thời lượng (KQ - TH_YL):
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        durationOld !== null && (durationOld > 70 || durationOld <= 0)
                          ? "text-rose-600 font-bold"
                          : "text-slate-700"
                      }
                    >
                      Trước: {durationOld !== null ? `${durationOld}p` : "—"}
                    </span>
                    <span>➔</span>
                    <span
                      className={
                        durationNew !== null && durationNew > 0 && durationNew <= 70
                          ? "text-emerald-700 font-bold"
                          : "text-rose-600 font-bold"
                      }
                    >
                      Sau: {durationNew !== null ? `${durationNew}p` : "—"}{" "}
                      {durationNew !== null && durationNew > 0 && durationNew <= 70
                        ? "✓ (<=70p)"
                        : "⚠️"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Khi sửa các cột khác không phải thời gian XML3 (Mã DV, Tên DV, Số lượng, Đơn giá, Khoa, Bác sĩ...) */
            <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <span className="font-bold text-slate-800">
                    Cột đang chỉnh sửa:{" "}
                    <span className="font-mono text-teal-800 bg-white px-2 py-0.5 rounded-lg border border-teal-200 font-black">
                      {selectedField}
                    </span>{" "}
                    <span className="text-teal-900 font-bold">
                      ({getFieldLabel(selectedField)})
                    </span>
                  </span>
                </div>
                <span className="rounded-md bg-teal-100 text-teal-800 text-[11px] px-2.5 py-0.5 font-bold">
                  Bảng {effectiveTab} · Dòng STT {stt}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/80 rounded-xl px-3 py-1.5 border border-teal-100">
                <span className="text-slate-500 font-semibold shrink-0">
                  Giá trị hiện tại trong XML:
                </span>
                <span className="font-mono font-bold text-slate-800 break-all">
                  {currentOldValue !== "" ? (
                    currentOldValue
                  ) : (
                    <span className="text-slate-400 italic font-normal">(đang để trống)</span>
                  )}
                </span>
              </div>
            </div>
          )}

          {/* Chọn cột cần sửa (Bộ lọc tìm kiếm, Quick Chips, & Dropdown chi tiết) */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>🎯</span> Chọn cột dữ liệu cần sửa ({availableColumns.length} cột):
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={columnFilter}
                  onChange={(e) => setColumnFilter(e.target.value)}
                  placeholder="Lọc cột hoặc giá trị..."
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:outline-none w-48 shadow-2xs"
                />
                {columnFilter && (
                  <button
                    type="button"
                    onClick={() => setColumnFilter("")}
                    className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 text-[11px]"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Quick Chips chọn cột nhanh */}
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {filteredColumns.map((col) => {
                const isSelected = selectedField === col;
                const lbl = getFieldLabel(col);
                const colVal = customRow ? (customRow.row[col] ?? "") : "";
                const isColPlanned = existingPlannedMap.has(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleFieldChange(col)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition flex items-center gap-1 border shadow-2xs cursor-pointer ${
                      isSelected
                        ? "bg-teal-700 text-white border-teal-800 font-bold ring-2 ring-teal-300"
                        : isColPlanned
                          ? "bg-emerald-50 text-emerald-900 border-emerald-400 font-bold hover:bg-emerald-100"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                    title={`[${col} - ${lbl}]: ${colVal || "(trống)"}${
                      isColPlanned ? " (Đã có trong kế hoạch sửa)" : ""
                    }`}
                  >
                    {isColPlanned && <span className="text-emerald-600 font-black">✓</span>}
                    <span className="font-bold">{col}</span>
                    {lbl !== col && (
                      <span
                        className={`text-[10px] font-sans ${
                          isSelected ? "text-teal-100" : "text-slate-500"
                        }`}
                      >
                        ({lbl})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dropdown & Ô xem giá trị cũ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Hoặc chọn từ danh sách cột:
                </label>
                <select
                  value={selectedField}
                  onChange={(e) => handleFieldChange(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
                >
                  {filteredColumns.map((col) => {
                    const lbl = getFieldLabel(col);
                    const val = customRow ? (customRow.row[col] ?? "") : "";
                    return (
                      <option key={col} value={col}>
                        {col} — {lbl}{" "}
                        {val !== ""
                          ? `(Hiện tại: "${val.length > 25 ? val.slice(0, 25) + "..." : val}")`
                          : "(Hiện tại: trống)"}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Giá trị hiện tại trong XML:
                </label>
                <input
                  type="text"
                  value={currentOldValue}
                  readOnly
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-600 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Ô nhập giá trị mới thay thế */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                <span>✏️</span> Giá trị mới thay thế cho cột{" "}
                <span className="font-mono text-teal-800 font-black">{selectedField}</span>:
              </label>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setNewValue("");
                    setLyDo(`Bỏ trống trường ${selectedField} (xóa thông tin)`);
                  }}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
                  title="Xóa trắng ô này để bỏ trống giá trị trong XML"
                >
                  🗑️ Bỏ trống
                </button>
                <button
                  type="button"
                  onClick={() => setNewValue(currentOldValue)}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
                  title="Lấy lại đúng giá trị cũ ban đầu"
                >
                  ↺ Giá trị cũ
                </button>
                <button
                  type="button"
                  onClick={() => setNewValue((prev) => prev.toUpperCase())}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
                  title="Chuyển sang chữ VIẾT HOA toàn bộ (phù hợp mã ICD-10, mã DV, mã BS...)"
                >
                  🔤 VIẾT HOA
                </button>
                <button
                  type="button"
                  onClick={() => setNewValue((prev) => prev.trim())}
                  className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1 text-[11px] font-semibold transition shadow-2xs cursor-pointer"
                  title="Cắt bỏ khoảng trắng thừa đầu và cuối"
                >
                  ✂️ Cắt khoảng trắng
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={`Nhập giá trị mới cho ${selectedField} (hoặc để trống để xóa dữ liệu)...`}
                className="flex-1 rounded-xl border-2 border-teal-500 bg-teal-50/20 px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSave()}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 px-4 py-2 text-xs font-bold text-white shadow-md transition cursor-pointer"
                title="Lưu ngay giá trị này vào Kế hoạch sửa"
              >
                <span>💾</span> Lưu vào kế hoạch sửa
              </button>
            </div>

            {/* Trợ giúp hiển thị thời gian nếu trường là ngày giờ */}
            {isDateTimeFieldName(selectedField) && newValue && (
              <p className="mt-1 text-[11px] text-teal-800 font-medium flex items-center gap-1">
                <span>⏱️</span>
                <span>
                  Định dạng hiển thị: <b>{formatDisplayDateTime(newValue)}</b>
                  {newValue.replace(/\D/g, "").length === 12
                    ? " (chuẩn 12 chữ số YYYYMMDDHHmm)"
                    : newValue.replace(/\D/g, "").length === 8
                      ? " (chuẩn 8 chữ số YYYYMMDD)"
                      : ""}
                </span>
              </p>
            )}

            {!newValue.trim() && (
              <p className="mt-1 text-[11px] text-amber-800 font-medium flex items-center gap-1">
                <span>💡</span>
                <span>
                  Ô giá trị đang để trống. Nhấn <b>"Lưu vào kế hoạch sửa"</b> để lưu trạng thái xóa
                  bỏ / bỏ trống dữ liệu cột <b>{selectedField}</b> này.
                </span>
              </p>
            )}
          </div>

          {/* Gợi ý thông minh */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5">
            <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>⚡</span> Gợi ý sửa tự động nhanh:
              </span>
              {isXml3TimeField && isSameExecutionAndResult && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 rounded px-1.5 py-0.5">
                  ⚠️ Trùng giờ thực hiện &amp; kết quả (0p)
                </span>
              )}
            </div>

            {/* Khối gợi ý thời gian XML3 (chỉ hiển thị khi đang sửa trường thời gian XML3) */}
            {isXml3TimeField && (
              <div className="space-y-2 text-xs">
                {/* Khối 1: Ca trùng giờ (0 phút) -> Căn cứ NGAY_KQ trừ lùi giờ NGAY_TH_YL */}
                <div className="rounded-xl border border-rose-200 bg-white p-2.5 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-rose-800 flex items-center justify-between">
                    <span>
                      ⏱️ Trùng giờ (0p): Căn cứ giờ KQ (
                      {formatShortTime(record?.NGAY_KQ || customRow?.row?.NGAY_KQ) || "—"}) trừ lùi
                      giờ TH_YL:
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600 lowercase bg-rose-50 px-1.5 py-0.5 rounded">
                      (khuyên dùng)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(10)}
                      className="rounded-lg border border-rose-400 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-900 hover:bg-rose-100 shadow-xs transition"
                      title="Lùi NGAY_TH_YL về 10 phút trước giờ kết quả"
                    >
                      ⏱️ Lùi TH_YL -10p{" "}
                      {kqOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(kqOld, -10))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(8)}
                      className="rounded-lg border border-rose-400 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-900 hover:bg-rose-100 shadow-xs transition"
                      title="Lùi NGAY_TH_YL về 8 phút trước giờ kết quả"
                    >
                      ⏱️ Lùi TH_YL -8p{" "}
                      {kqOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(kqOld, -8))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(15)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title="Lùi NGAY_TH_YL về 15 phút trước giờ kết quả"
                    >
                      Lùi TH_YL -15p{" "}
                      {kqOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(kqOld, -15))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(20)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title="Lùi NGAY_TH_YL về 20 phút trước giờ kết quả"
                    >
                      Lùi TH_YL -20p{" "}
                      {kqOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(kqOld, -20))})`}
                    </button>
                  </div>
                </div>

                {/* Khối 2: Ca vượt thời lượng -> Căn cứ NGAY_TH_YL cộng thêm giờ KQ */}
                <div className="rounded-xl border border-teal-200 bg-white p-2.5 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-teal-800 flex items-center justify-between">
                    <span>
                      🕒 Căn cứ giờ TH_YL (
                      {formatShortTime(record?.NGAY_TH_YL || customRow?.row?.NGAY_TH_YL) || "—"}) để
                      cộng thêm giờ trả KQ:
                    </span>
                    <span className="text-[10px] font-semibold text-teal-700">
                      Điện tim / Xét nghiệm nhanh
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(8, "⭐ Chuẩn nhanh")}
                      className="rounded-lg border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 shadow-xs transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 8 phút (chuẩn thời lượng nhanh)"
                    >
                      ⭐ Chuẩn (+8p{" "}
                      {thOld && `➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 8))}`})
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(10, "⭐ Điện tim / CLS nhanh")}
                      className="rounded-lg border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 shadow-xs transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 10 phút (chuẩn điện tim/xét nghiệm nhanh)"
                    >
                      ⭐ Điện tim (+10p{" "}
                      {thOld && `➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 10))}`})
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(15)}
                      className="rounded-lg border border-teal-300 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 15 phút"
                    >
                      +15p {thOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 15))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(20)}
                      className="rounded-lg border border-teal-300 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 20 phút"
                    >
                      +20p {thOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 20))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(30)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 30 phút"
                    >
                      +30p {thOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 30))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(45)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 45 phút"
                    >
                      +45p {thOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 45))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(60)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 60 phút"
                    >
                      +60p {thOld && `(➔ ${formatShortTime(addMinutesToXmlDateTime(thOld, 60))})`}
                    </button>
                  </div>
                </div>

                {/* Khối 3: Công khám / Thứ tự y lệnh / Trùng máy */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {isExamGroup13 && (
                    <button
                      type="button"
                      onClick={applySuggestExamSync}
                      className="rounded-lg border border-teal-500 bg-teal-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-teal-700 shadow-xs"
                      title="Gán NGAY_YL = NGAY_TH_YL (ở công khám nhóm 13 hai thời gian này được phép trùng nhau)"
                    >
                      🩺 [Công khám 13] Đồng bộ NGAY_YL = NGAY_TH_YL
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={applySuggestFixOrder}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shadow-xs"
                    title="Đặt NGAY_YL trước NGAY_TH_YL 5 phút"
                  >
                    🕒 Sửa thứ tự y lệnh
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestShiftExecution(5)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shadow-xs"
                    title="Dịch NGAY_TH_YL thêm 5 phút tránh trùng máy"
                  >
                    🔀 Dịch máy +5p
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestShiftExecution(10)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shadow-xs"
                    title="Dịch NGAY_TH_YL thêm 10 phút tránh trùng máy"
                  >
                    🔀 Dịch máy +10p
                  </button>
                </div>
              </div>
            )}

            {/* Gợi ý cho XML7 (NGOAITRU_TUNGAY) */}
            {selectedField === "NGOAITRU_TUNGAY" && xml7NextDaySuggestion && (
              <div className="rounded-xl border border-teal-300 bg-teal-50/70 p-2.5 space-y-1.5">
                <div className="text-[10px] uppercase font-bold text-teal-900 flex items-center justify-between">
                  <span>
                    🏥 Quy tắc XML7: NGOAITRU_TUNGAY không được nhỏ hơn NGAY_RA (Ra viện:{" "}
                    {xml7NextDaySuggestion.displayNgayRa}):
                  </span>
                  <span className="text-[10px] font-semibold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                    Gợi ý chuẩn BHYT
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={applySuggestXml7NextDay}
                    className="rounded-lg border border-teal-500 bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700 shadow-xs transition flex items-center gap-1.5"
                    title={`Gợi ý chuẩn: Ngày ra viện là ${xml7NextDaySuggestion.displayNgayRa} ➔ Đặt NGOAITRU_TUNGAY = ${xml7NextDaySuggestion.displayNext}`}
                  >
                    <span>⚡</span> Đặt +1 ngày sau ra viện (➔ {xml7NextDaySuggestion.displayNext})
                  </button>
                </div>
              </div>
            )}

            {/* Gợi ý cho SO_CCCD */}
            {selectedField === "SO_CCCD" && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={applySuggestPaddedCccd}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shadow-2xs"
                  title="Thêm số 0 vào đầu cho đủ 12 chữ số"
                >
                  🪪 Chuẩn hóa 12 số CCCD
                </button>
                <button
                  type="button"
                  onClick={applySuggestClearCccd}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-800 hover:bg-rose-100 shadow-2xs flex items-center gap-1"
                  title="Xóa trắng trường SO_CCCD để bỏ trống theo quy định BHYT"
                >
                  <span>🗑️</span> Bỏ trống / Xóa thông tin SO_CCCD
                </button>
              </div>
            )}

            {/* Gợi ý cho KET_LUAN */}
            {selectedField === "KET_LUAN" && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {warning?.giaTri ? (
                  <button
                    type="button"
                    onClick={applySuggestFromGiaTri}
                    className="rounded-lg border border-teal-500 bg-teal-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-teal-700 shadow-xs"
                    title="Copy trực tiếp từ ô GIA_TRI trong XML4 của BA đó xuống ô KET_LUAN"
                  >
                    📋 Lấy từ ô GIA_TRI: "
                    {warning.giaTri.length > 25
                      ? warning.giaTri.slice(0, 25) + "..."
                      : warning.giaTri}
                    "
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    applySuggestSampleConclusion(
                      "Trên phiến đồ nền hồng cầu thấy nhiều lympho bào nằm phân tán hoặc đứng thành các đám, trong đó lympho bào nhỏ chiếm đa số, kèm rải rác đại thực bào.",
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                >
                  🔬 Mẫu kết luận hạch / TB
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applySuggestSampleConclusion(
                      "Các tế bào biểu mô có hình thái bình thường, không thấy tế bào ác tính.",
                    )
                  }
                  className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                >
                  🔬 Mẫu TB bình thường
                </button>
              </div>
            )}

            {/* Gợi ý cho Mã bệnh ICD-10 */}
            {(selectedField === "MA_BENH" ||
              selectedField === "MA_BENH_CHINH" ||
              selectedField === "MA_BENH_KT") && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const clean = newValue.toUpperCase().trim();
                    setNewValue(clean);
                    setLyDo(`Chuẩn hóa VIẾT HOA mã bệnh ${selectedField}: ${clean}`);
                  }}
                  className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 shadow-2xs"
                >
                  🔤 VIẾT HOA mã bệnh
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const clean = newValue.replace(/\./g, "").toUpperCase().trim();
                    setNewValue(clean);
                    setLyDo(`Loại bỏ dấu chấm mã bệnh ${selectedField}: ${clean}`);
                  }}
                  className="rounded-lg border border-teal-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 shadow-2xs"
                >
                  ✂️ Bỏ dấu chấm phân cách (vd: I10.0 ➔ I100)
                </button>
              </div>
            )}

            {/* Gợi ý cho các trường khác */}
            {!isXml3TimeField &&
              selectedField !== "SO_CCCD" &&
              selectedField !== "NGOAITRU_TUNGAY" &&
              selectedField !== "KET_LUAN" &&
              !selectedField.startsWith("MA_BENH") && (
                <div className="text-[11px] text-slate-600 bg-white/70 rounded-xl p-2 border border-amber-200/60 flex items-center gap-2">
                  <span>💡</span>
                  <span>
                    Đang chỉnh sửa trường <b>{selectedField}</b> ({getFieldLabel(selectedField)}).
                    Bạn có thể nhập giá trị mới hoặc bấm nút <b>"Bỏ trống"</b> để xóa trắng dữ liệu
                    cột này trong XML.
                  </span>
                </div>
              )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Lý do chỉnh sửa / Ghi chú đối soát:
            </label>
            <input
              type="text"
              value={lyDo}
              onChange={(e) => setLyDo(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-teal-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <div>
              {existingPlannedItems.length > 0 && onResetCorrection && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm("Khôi phục dòng này về dữ liệu XML ban đầu (hủy khỏi kế hoạch sửa)?")
                    ) {
                      onResetCorrection(maLk, effectiveTab, stt, maDichVu);
                      onClose();
                    }
                  }}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Hủy kế hoạch sửa của dòng này, khôi phục về dữ liệu gốc XML ban đầu"
                >
                  <span>↺</span> Khôi phục về ban đầu
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={!isFieldEmptyAllowed && !newValue.trim()}
                className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span>💾</span> Lưu vào kế hoạch sửa
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CorrectionPlanModal({
  isOpen,
  onClose,
  items,
  onRemoveItem,
  onRemoveItems,
  onClearAll,
  onAutoGenerate,
  onExportJson,
  onExportExcel,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: CorrectionItem[];
  onRemoveItem: (id: string) => void;
  onRemoveItems?: (ids: string[]) => void;
  onClearAll: () => void;
  onAutoGenerate: () => void;
  onExportJson: () => void;
  onExportExcel: () => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);

  const patientCount = useMemo(() => {
    return new Set(items.map((x) => x.maBa || x.maLk)).size;
  }, [items]);

  const handleTopScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  const handleBottomScroll = () => {
    if (topScrollRef.current && bottomScrollRef.current) {
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  const scrollByAmount = (amount: number) => {
    if (bottomScrollRef.current) {
      bottomScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const filteredItems = useMemo(() => {
    if (!filterQuery) return items;
    const q = filterQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.maBa.toLowerCase().includes(q) ||
        item.hoTen.toLowerCase().includes(q) ||
        item.maLk.toLowerCase().includes(q) ||
        item.maDichVu.toLowerCase().includes(q) ||
        item.field.toLowerCase().includes(q) ||
        item.tab.toLowerCase().includes(q),
    );
  }, [items, filterQuery]);

  const isAllSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));
  const isSomeSelected =
    filteredItems.length > 0 &&
    filteredItems.some((item) => selectedIds.has(item.id)) &&
    !isAllSelected;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of filteredItems) {
          next.delete(item.id);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const item of filteredItems) {
          next.add(item.id);
        }
        return next;
      });
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa ${count} mục đã chọn khỏi Kế hoạch chỉnh sửa tự động XML130?`,
      )
    ) {
      return;
    }
    const idList = Array.from(selectedIds);
    if (onRemoveItems) {
      onRemoveItems(idList);
    } else {
      for (const id of idList) {
        onRemoveItem(id);
      }
    }
    setSelectedIds(new Set());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 md:p-6 animate-in fade-in duration-150">
      <div className="w-full max-w-7xl max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Kế hoạch Chỉnh sửa Tự động XML130
                </h3>
                <span className="rounded-full bg-teal-100 border border-teal-300 px-2.5 py-0.5 text-xs font-black text-teal-800">
                  {items.length} mục · {patientCount} bệnh án
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Xuất file Excel hoặc JSON để nạp vào VNPT-HIS Extension thực hiện 6 bước tự động
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Lọc theo Mã BA, họ tên, tab..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none w-56"
            />

            {/* Cụm thao tác tích chọn nhiều mục để xóa */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-300 rounded-lg px-2.5 py-1 text-xs animate-in fade-in duration-150">
                <span className="font-bold text-rose-900">
                  Đã chọn: <span className="underline font-black">{selectedIds.size}</span> mục
                </span>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  className="rounded-md bg-rose-700 hover:bg-rose-800 text-white px-2.5 py-1 font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                  title="Xóa tất cả các mục đang được tích chọn khỏi Kế hoạch sửa"
                >
                  <span>🗑️</span> Xóa các mục đã chọn ({selectedIds.size})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 font-bold shadow-xs transition cursor-pointer"
                  title="Bỏ chọn toàn bộ"
                >
                  ✕ Bỏ chọn
                </button>
              </div>
            )}

            {items.length > 0 && selectedIds.size === 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1.5 font-bold text-rose-700 hover:bg-rose-100"
              >
                🗑️ Xóa danh sách
              </button>
            )}

            {/* Nút cuộn ngang nhanh để người dùng kéo kiểm tra dễ dàng */}
            {items.length > 0 && (
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={() => scrollByAmount(-350)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-xs"
                  title="Cuộn bảng sang trái"
                >
                  ◀ Cuộn trái
                </button>
                <button
                  type="button"
                  onClick={() => scrollByAmount(350)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1 shadow-xs"
                  title="Cuộn bảng sang phải"
                >
                  Cuộn phải ▶
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={items.length === 0}
              onClick={onExportJson}
              className="rounded-lg bg-indigo-700 px-3 py-1.5 font-bold text-white hover:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1"
              title="Xuất JSON sẵn sàng import vào Extension"
            >
              <span>📥</span> Xuất JSON (Extension)
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={onExportExcel}
              className="rounded-lg bg-teal-700 px-3 py-1.5 font-bold text-white hover:bg-teal-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1"
              title="Xuất Excel đối soát kế hoạch sửa"
            >
              <span>📊</span> Xuất Excel
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-hidden p-4 flex flex-col">
          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-3">
              <div className="text-4xl">📝</div>
              <div>Chưa có mục nào trong kế hoạch chỉnh sửa.</div>
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                Bạn có thể bấm nút <b>"✏️ Sửa"</b> trên từng dòng lỗi hoặc chọn nút{" "}
                <b>"⚡ Sửa hàng loạt"</b> trên từng tab lỗi của bảng cảnh báo để thêm các mục cần
                hiệu chỉnh vào kế hoạch!
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Thanh cuộn ngang phụ ở đỉnh bảng (Top Scrollbar) đồng bộ hai chiều */}
              <div
                ref={topScrollRef}
                onScroll={handleTopScroll}
                className="overflow-x-auto bg-slate-100 border-x border-t border-slate-200 h-3 rounded-t-xl"
                style={{ overflowX: "scroll" }}
              >
                <div style={{ width: "1600px", height: "1px" }} />
              </div>

              {/* Bảng chính có cuộn ngang và cuộn dọc độc lập */}
              <div
                ref={bottomScrollRef}
                onScroll={handleBottomScroll}
                className="flex-1 overflow-x-auto overflow-y-auto rounded-b-xl border border-slate-200"
                style={{ overflowX: "scroll" }}
              >
                <table className="w-full min-w-[1600px] text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 select-none sticky top-0 z-10 shadow-xs">
                    <tr>
                      <th className="px-3 py-2 border-r border-slate-200 w-10 min-w-[40px] text-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = isSomeSelected;
                          }}
                          onChange={handleToggleSelectAll}
                          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                          title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả các dòng"}
                        />
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-12 min-w-[48px] text-center">
                        STT
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-28 min-w-[110px]">
                        Mã Bệnh Án
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-44 min-w-[160px]">
                        Bệnh nhân
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-32 min-w-[120px]">
                        Thời gian (HIS)
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-20 min-w-[80px]">Tab</th>
                      <th className="px-3 py-2 border-r border-slate-200 w-52 min-w-[190px]">
                        Dịch vụ / Trường
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-36 min-w-[130px]">
                        Giá trị cũ
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 w-80 min-w-[280px]">
                        Giá trị mới
                      </th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[240px]">Lý do</th>
                      <th className="px-2 py-2 text-center w-14 min-w-[56px]">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item, idx) => {
                      const isSelected = selectedIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-teal-50/80 font-medium hover:bg-teal-100/70"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-3 py-2 text-center border-r border-slate-200">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRow(item.id)}
                              className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-teal-800">
                            {item.maBa || "—"}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            <div>{item.hoTen || "—"}</div>
                            <div className="font-mono text-[10px] text-slate-400">
                              LK: {item.maLk}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-slate-600 whitespace-nowrap">
                            <div>{item.tuNgay}</div>
                            <div className="text-[10px] text-slate-400">➔ {item.denNgay}</div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-teal-50 border border-teal-200 px-1.5 py-0.5 font-bold text-teal-900 text-[10px]">
                              {item.tab}
                            </span>
                            <div className="text-[10px] text-slate-400 mt-0.5">STT: {item.stt}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-mono font-bold text-indigo-700">{item.field}</div>
                            {item.tenDichVu && (
                              <div
                                className="text-[10px] text-slate-500 truncate max-w-xs"
                                title={item.tenDichVu}
                              >
                                {item.tenDichVu}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-rose-700 line-through break-words">
                            {item.oldValue || "(trống)"}
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] font-bold text-teal-800 break-words whitespace-normal bg-teal-50/40">
                            {item.newValue ? (
                              item.newValue
                            ) : (
                              <span className="text-rose-700 font-bold bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">
                                (xóa rỗng / để trống)
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-[11px] leading-tight break-words">
                            {item.lyDo}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => onRemoveItem(item.id)}
                              className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition"
                              title="Xóa mục này"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              💡 Mẹo: Dùng 2 nút <b>◀ Cuộn trái / Cuộn phải ▶</b> hoặc thanh cuộn ở trên/dưới bảng
              để đối chiếu toàn bộ các cột.
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 font-bold text-white hover:bg-slate-900 shadow-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
