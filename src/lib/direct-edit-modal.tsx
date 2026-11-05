import { useState, useMemo, useEffect, useRef } from "react";
import type { Xml3Record, ValidationWarning } from "./xml3-duration.ts";
import { parseXmlDateTime } from "./xml3-duration.ts";
import { formatXmlDateTime } from "./timezone.ts";
import {
  type CorrectionItem,
  toHisDateString,
  addMinutesToXmlDateTime,
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

export function DirectEditModal({
  isOpen,
  onClose,
  record,
  warning,
  source,
  onSaveCorrection,
}: {
  isOpen: boolean;
  onClose: () => void;
  record?: Xml3Record;
  warning?: ValidationWarning;
  source: string; // XML1, XML2, XML3, XML4
  onSaveCorrection: (item: CorrectionItem) => void;
}) {
  const patient = record?.patient || warning?.patient;
  const maLk = record?.MA_LK || warning?.MA_LK || "";
  const maBa = record?.MA_BN || warning?.MA_BN || patient?.MA_BN || "";
  const hoTen = record?.HO_TEN || warning?.HO_TEN || patient?.HO_TEN || "";
  const ngayVao = patient?.NGAY_VAO || "";
  const ngayRa = patient?.NGAY_RA || "";
  const stt = record?.STT || String(warning?.detailIndex || "1");
  const maDichVu = record?.MA_DICH_VU || warning?.MA_DICH_VU || "";
  const tenDichVu = record?.TEN_DICH_VU || warning?.TEN_DICH_VU || "";

  // Xác định trường mặc định cần sửa theo loại cảnh báo
  const defaultField = useMemo(() => {
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
    // Ca trùng giờ thực hiện và kết quả (0 phút): mặc định chọn NGAY_TH_YL để trừ lùi
    if (record?.NGAY_TH_YL && record?.NGAY_KQ && record.NGAY_TH_YL === record.NGAY_KQ)
      return "NGAY_TH_YL";
    return "NGAY_KQ";
  }, [source, record, warning]);

  const [selectedField, setSelectedField] = useState(defaultField);

  // Giá trị cũ ban đầu của trường đang chọn
  const currentOldValue = useMemo(() => {
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
  }, [source, selectedField, record, patient]);

  const [newValue, setNewValue] = useState(currentOldValue);
  const [lyDo, setLyDo] = useState("");

  const isExamGroup13 = record?.MA_NHOM?.trim() === "13";
  const ylOld = record?.NGAY_YL || "";
  const thOld = record?.NGAY_TH_YL || "";
  const kqOld = record?.NGAY_KQ || "";

  const durationOldVal = calcDiffMinutes(thOld, kqOld);
  const isSameExecutionAndResult = Boolean(
    (thOld && kqOld && thOld === kqOld) || durationOldVal === 0,
  );
  const isOverDuration = Boolean(durationOldVal !== null && durationOldVal > 70);

  useEffect(() => {
    if (isOpen) {
      setSelectedField(defaultField);
      let initialVal = "";
      let initialLyDo = "Chỉnh sửa dữ liệu tránh cảnh báo BHYT";

      if (source === "XML1") {
        if (defaultField === "SO_CCCD") initialVal = patient?.SO_CCCD || "";
        else if (defaultField === "NGAY_TTOAN") initialVal = patient?.NGAY_TTOAN || "";
        if (warning?.message) initialLyDo = warning.message;
      } else if (source === "XML3" && record) {
        if (isSameExecutionAndResult && record.NGAY_KQ) {
          // Ca trùng giờ thực hiện và trả kết quả: tự động gợi ý trừ lùi 10 phút tính từ NGAY_KQ
          initialVal = addMinutesToXmlDateTime(record.NGAY_KQ, -10);
          initialLyDo = `Trừ lùi giờ thực hiện y lệnh 10 phút so với giờ kết quả (${formatShortTime(record.NGAY_KQ)} ➔ ${formatShortTime(initialVal)}) để tránh trùng giờ (0 phút)`;
        } else if (isOverDuration && record.NGAY_TH_YL && defaultField === "NGAY_KQ") {
          // Ca vượt thời lượng: gợi ý điện tim / nhanh 10 phút tính từ NGAY_TH_YL
          initialVal = addMinutesToXmlDateTime(record.NGAY_TH_YL, 10);
          initialLyDo = `Rút ngắn thời lượng theo chuẩn điện tim/nhanh 10 phút tính từ giờ thực hiện (${formatShortTime(record.NGAY_TH_YL)} ➔ ${formatShortTime(initialVal)})`;
        } else if (defaultField === "NGAY_KQ") {
          initialVal = record.NGAY_KQ || "";
        } else if (defaultField === "NGAY_TH_YL") {
          initialVal = record.NGAY_TH_YL || "";
        } else if (defaultField === "NGAY_YL") {
          initialVal = record.NGAY_YL || "";
        } else if (defaultField === "MA_MAY") {
          initialVal = record.MA_MAY || "";
        } else if (defaultField === "TT_THAU") {
          initialVal = record.TT_THAU || "";
        }

        if (!isSameExecutionAndResult && !isOverDuration) {
          if (record?.hasDuplicateMachineWarning)
            initialLyDo = "Tránh trùng thời gian thực hiện trên cùng mã máy";
          else if (record?.hasOrderWarning) initialLyDo = "Khắc phục sai thứ tự thời gian y lệnh";
          else if (warning?.message) initialLyDo = warning.message;
        }
      }
      setNewValue(initialVal);
      setLyDo(initialLyDo);
    }
  }, [
    isOpen,
    defaultField,
    record,
    warning,
    patient,
    source,
    isSameExecutionAndResult,
    isOverDuration,
  ]);

  if (!isOpen) return null;

  // Khi đổi trường chọn
  const handleFieldChange = (f: string) => {
    setSelectedField(f);
    let oldVal = "";
    if (source === "XML1") {
      if (f === "SO_CCCD") oldVal = patient?.SO_CCCD || "";
      else if (f === "NGAY_TTOAN") oldVal = patient?.NGAY_TTOAN || "";
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

  const applySuggestSampleConclusion = (text: string) => {
    setSelectedField("KET_LUAN");
    setNewValue(text);
    setLyDo("Bổ sung nội dung kết luận chẩn đoán xét nghiệm / CLS");
  };

  const ylNew = selectedField === "NGAY_YL" ? newValue : ylOld;
  const thNew = selectedField === "NGAY_TH_YL" ? newValue : thOld;
  const kqNew = selectedField === "NGAY_KQ" ? newValue : kqOld;

  const waitOld = calcDiffMinutes(ylOld, thOld);
  const waitNew = calcDiffMinutes(ylNew, thNew);
  const durationOld = calcDiffMinutes(thOld, kqOld);
  const durationNew = calcDiffMinutes(thNew, kqNew);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newValue.trim()) {
      alert("Vui lòng nhập giá trị mới cần sửa!");
      return;
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
      tab: (["XML1", "XML2", "XML3", "XML4"].includes(source) ? source : "XML3") as
        "XML1" | "XML2" | "XML3" | "XML4",
      stt,
      maDichVu,
      tenDichVu,
      field: selectedField,
      oldValue: currentOldValue,
      newValue: newValue.trim(),
      lyDo,
      createdAt: new Date().toISOString(),
    };

    onSaveCorrection(item);
    onClose();
  };

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
            <b className="text-teal-700">{source}</b> · STT {stt}
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
          {/* Bảng đối chiếu 3 mốc thời gian Trước & Sau (Dành cho XML3) */}
          {source === "XML3" && record && (
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
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trường cần chỉnh sửa:
              </label>
              <select
                value={selectedField}
                onChange={(e) => handleFieldChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-teal-500 focus:outline-none"
              >
                {source === "XML3" && (
                  <>
                    <option value="NGAY_KQ">NGAY_KQ (Thời gian kết quả)</option>
                    <option value="NGAY_TH_YL">NGAY_TH_YL (Thời gian thực hiện)</option>
                    <option value="NGAY_YL">NGAY_YL (Thời gian y lệnh)</option>
                    <option value="MA_MAY">MA_MAY (Mã máy)</option>
                    <option value="TT_THAU">TT_THAU (Thông tin thầu)</option>
                    <option value="MA_DICH_VU">MA_DICH_VU (Mã dịch vụ)</option>
                  </>
                )}
                {source === "XML1" && (
                  <>
                    <option value="SO_CCCD">SO_CCCD (Số CCCD / Định danh)</option>
                    <option value="NGAY_TTOAN">NGAY_TTOAN (Thời gian thanh toán)</option>
                    <option value="MA_BENH_CHINH">MA_BENH_CHINH (Mã bệnh chính)</option>
                    <option value="MA_BENH_KT">MA_BENH_KT (Mã bệnh kèm theo)</option>
                  </>
                )}
                {source === "XML4" && (
                  <>
                    <option value="KET_LUAN">KET_LUAN (Kết luận CLS)</option>
                    <option value="GIA_TRI">GIA_TRI (Chỉ số xét nghiệm)</option>
                    <option value="NGAY_KQ">NGAY_KQ (Ngày kết quả CLS)</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Giá trị hiện tại (cũ):
              </label>
              <input
                type="text"
                value={currentOldValue}
                readOnly
                className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-800 mb-1">
              Giá trị mới thay thế:
            </label>
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              placeholder="Nhập giá trị mới (vd: 202611021430, 025221009314...)"
              className="w-full rounded-xl border-2 border-teal-500 bg-teal-50/20 px-3 py-2 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Gợi ý thông minh */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2.5">
            <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>⚡</span> Gợi ý sửa tự động nhanh:
              </span>
              {source === "XML3" && isSameExecutionAndResult && (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 rounded px-1.5 py-0.5">
                  ⚠️ Trùng giờ thực hiện &amp; kết quả (0p)
                </span>
              )}
            </div>

            {source === "XML3" && record && (
              <div className="space-y-2 text-xs">
                {/* Khối 1: Ca trùng giờ (0 phút) -> Căn cứ NGAY_KQ trừ lùi giờ NGAY_TH_YL */}
                <div className="rounded-xl border border-rose-200 bg-white p-2.5 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-rose-800 flex items-center justify-between">
                    <span>
                      ⏱️ Trùng giờ (0p): Căn cứ giờ KQ ({formatShortTime(record.NGAY_KQ) || "—"})
                      trừ lùi giờ TH_YL:
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
                      title={`Lùi NGAY_TH_YL về 10 phút trước giờ kết quả: ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -10))}`}
                    >
                      ⏱️ Lùi TH_YL -10p{" "}
                      {record.NGAY_KQ &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -10))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(8)}
                      className="rounded-lg border border-rose-400 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-900 hover:bg-rose-100 shadow-xs transition"
                      title={`Lùi NGAY_TH_YL về 8 phút trước giờ kết quả: ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -8))}`}
                    >
                      ⏱️ Lùi TH_YL -8p{" "}
                      {record.NGAY_KQ &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -8))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(15)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title={`Lùi NGAY_TH_YL về 15 phút trước giờ kết quả: ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -15))}`}
                    >
                      Lùi TH_YL -15p{" "}
                      {record.NGAY_KQ &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -15))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestRewindExecution(20)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition"
                      title={`Lùi NGAY_TH_YL về 20 phút trước giờ kết quả: ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -20))}`}
                    >
                      Lùi TH_YL -20p{" "}
                      {record.NGAY_KQ &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_KQ, -20))})`}
                    </button>
                  </div>
                </div>

                {/* Khối 2: Ca vượt thời lượng -> Căn cứ NGAY_TH_YL cộng thêm giờ KQ */}
                <div className="rounded-xl border border-teal-200 bg-white p-2.5 space-y-1.5">
                  <div className="text-[10px] uppercase font-bold text-teal-800 flex items-center justify-between">
                    <span>
                      🕒 Căn cứ giờ TH_YL ({formatShortTime(record.NGAY_TH_YL) || "—"}) để cộng thêm
                      giờ trả KQ:
                    </span>
                    <span className="text-[10px] font-semibold text-teal-700">
                      Điện tim / Xét nghiệm nhanh
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(10, "⭐ Điện tim / CLS nhanh")}
                      className="rounded-lg border border-emerald-500 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:bg-emerald-100 shadow-xs transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 10 phút (chuẩn điện tim/xét nghiệm nhanh)"
                    >
                      ⭐ Điện tim (+10p{" "}
                      {record.NGAY_TH_YL &&
                        `➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 10))}`}
                      )
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(15)}
                      className="rounded-lg border border-teal-300 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 15 phút"
                    >
                      +15p{" "}
                      {record.NGAY_TH_YL &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 15))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(20)}
                      className="rounded-lg border border-teal-300 bg-teal-50 px-2 py-1 text-[11px] font-semibold text-teal-900 hover:bg-teal-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 20 phút"
                    >
                      +20p{" "}
                      {record.NGAY_TH_YL &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 20))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(30)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 30 phút"
                    >
                      +30p{" "}
                      {record.NGAY_TH_YL &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 30))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(45)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 45 phút"
                    >
                      +45p{" "}
                      {record.NGAY_TH_YL &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 45))})`}
                    </button>
                    <button
                      type="button"
                      onClick={() => applySuggestAddDurationFromThYl(60)}
                      className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 transition"
                      title="Đặt NGAY_KQ = NGAY_TH_YL + 60 phút"
                    >
                      +60p{" "}
                      {record.NGAY_TH_YL &&
                        `(➔ ${formatShortTime(addMinutesToXmlDateTime(record.NGAY_TH_YL, 60))})`}
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

            {source === "XML1" && (
              <button
                type="button"
                onClick={applySuggestPaddedCccd}
                className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                title="Thêm số 0 vào đầu cho đủ 12 chữ số"
              >
                🪪 Chuẩn hóa 12 số CCCD
              </button>
            )}

            {source === "XML4" && (
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

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-xl bg-teal-700 px-5 py-2 text-xs font-bold text-white hover:bg-teal-800 shadow-md transition flex items-center gap-1.5"
            >
              <span>💾</span> Lưu vào kế hoạch sửa
            </button>
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
  onClearAll,
  onAutoGenerate,
  onExportJson,
  onExportExcel,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: CorrectionItem[];
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onAutoGenerate: () => void;
  onExportJson: () => void;
  onExportExcel: () => void;
}) {
  const [filterQuery, setFilterQuery] = useState("");
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

  if (!isOpen) return null;

  const filteredItems = items.filter((item) => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.maBa.toLowerCase().includes(q) ||
      item.hoTen.toLowerCase().includes(q) ||
      item.maLk.toLowerCase().includes(q) ||
      item.maDichVu.toLowerCase().includes(q) ||
      item.field.toLowerCase().includes(q) ||
      item.tab.toLowerCase().includes(q)
    );
  });

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
            {items.length > 0 && (
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
                <div style={{ width: "1550px", height: "1px" }} />
              </div>

              {/* Bảng chính có cuộn ngang và cuộn dọc độc lập */}
              <div
                ref={bottomScrollRef}
                onScroll={handleBottomScroll}
                className="flex-1 overflow-x-auto overflow-y-auto rounded-b-xl border border-slate-200"
                style={{ overflowX: "scroll" }}
              >
                <table className="w-full min-w-[1550px] text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 select-none sticky top-0 z-10 shadow-xs">
                    <tr>
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
                    {filteredItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                          {item.newValue}
                        </td>
                        <td className="px-3 py-2 text-slate-600 text-[11px] leading-tight break-words">
                          {item.lyDo}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Xóa mục này"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
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
