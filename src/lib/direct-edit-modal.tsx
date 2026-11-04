import { useState, useMemo, useEffect } from "react";
import type { Xml3Record, ValidationWarning } from "./xml3-duration.ts";
import {
  type CorrectionItem,
  toHisDateString,
  addMinutesToXmlDateTime,
} from "./correction-plan.ts";

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

  useEffect(() => {
    if (isOpen) {
      setSelectedField(defaultField);
      let initialVal = "";
      if (source === "XML1") {
        if (defaultField === "SO_CCCD") initialVal = patient?.SO_CCCD || "";
        else if (defaultField === "NGAY_TTOAN") initialVal = patient?.NGAY_TTOAN || "";
      } else if (source === "XML3" && record) {
        if (defaultField === "NGAY_KQ") initialVal = record.NGAY_KQ || "";
        else if (defaultField === "NGAY_TH_YL") initialVal = record.NGAY_TH_YL || "";
        else if (defaultField === "NGAY_YL") initialVal = record.NGAY_YL || "";
        else if (defaultField === "MA_MAY") initialVal = record.MA_MAY || "";
        else if (defaultField === "TT_THAU") initialVal = record.TT_THAU || "";
      }
      setNewValue(initialVal);

      let initialLyDo = "Chỉnh sửa dữ liệu tránh cảnh báo BHYT";
      if (record?.hasDuplicateMachineWarning)
        initialLyDo = "Tránh trùng thời gian thực hiện trên cùng mã máy";
      else if (record?.status === "warning")
        initialLyDo = "Rút ngắn thời lượng thực hiện dịch vụ kỹ thuật <= 70 phút";
      else if (record?.hasOrderWarning) initialLyDo = "Khắc phục sai thứ tự thời gian y lệnh";
      else if (warning?.message) initialLyDo = warning.message;
      setLyDo(initialLyDo);
    }
  }, [isOpen, defaultField, record, warning, patient, source]);

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
  const applySuggestShortenDuration = (mins = 30) => {
    if (record?.NGAY_TH_YL) {
      const calculated = addMinutesToXmlDateTime(record.NGAY_TH_YL, mins);
      setSelectedField("NGAY_KQ");
      setNewValue(calculated);
      setLyDo(`Rút ngắn thời lượng thực hiện xuống ${mins} phút (chuẩn <= 70 phút)`);
    }
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
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
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

        {/* Form chỉnh sửa */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
          <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
            <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
              <span>⚡</span> Gợi ý sửa tự động nhanh:
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {source === "XML3" && (
                <>
                  <button
                    type="button"
                    onClick={() => applySuggestShortenDuration(30)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    title="Đặt NGAY_KQ = NGAY_TH_YL + 30 phút"
                  >
                    ⏱️ Đặt thời lượng 30p
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestShortenDuration(60)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    title="Đặt NGAY_KQ = NGAY_TH_YL + 60 phút"
                  >
                    ⏱️ Đặt thời lượng 60p
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestShiftExecution(5)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    title="Dịch NGAY_TH_YL thêm 5 phút tránh trùng máy"
                  >
                    🔀 Dịch máy +5p
                  </button>
                  <button
                    type="button"
                    onClick={() => applySuggestShiftExecution(10)}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    title="Dịch NGAY_TH_YL thêm 10 phút tránh trùng máy"
                  >
                    🔀 Dịch máy +10p
                  </button>
                  <button
                    type="button"
                    onClick={applySuggestFixOrder}
                    className="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                    title="Đặt NGAY_YL trước NGAY_TH_YL 5 phút"
                  >
                    🕒 Sửa thứ tự y lệnh
                  </button>
                </>
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
                <>
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
                </>
              )}
            </div>
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

  const patientCount = useMemo(() => {
    return new Set(items.map((x) => x.maBa || x.maLk)).size;
  }, [items]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Kế hoạch Chỉnh sửa Tự động XML130 ·{" "}
                <span className="text-teal-700">{items.length} mục</span> ({patientCount} bệnh án)
              </h3>
              <p className="text-xs text-slate-500">
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
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Lọc theo Mã BA, họ tên, tab..."
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-teal-500 focus:outline-none w-64"
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
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onAutoGenerate}
              className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 font-bold text-amber-900 hover:bg-amber-100 flex items-center gap-1 shadow-xs"
              title="Tự động quét toàn bộ lỗi và tạo kế hoạch sửa tối ưu"
            >
              <span>⚡</span> Tự động tạo kế hoạch
            </button>
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
        <div className="flex-1 overflow-auto p-4">
          {items.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm space-y-3">
              <div className="text-4xl">📝</div>
              <div>Chưa có mục nào trong kế hoạch chỉnh sửa.</div>
              <div className="text-xs text-slate-500 max-w-md mx-auto">
                Bạn có thể bấm nút <b>"✏️ Sửa"</b> trên từng dòng lỗi của bảng cảnh báo, hoặc bấm
                nút <b className="text-amber-700">"⚡ Tự động tạo kế hoạch"</b> để công cụ tự động
                đề xuất phương án khắc phục toàn bộ lỗi!
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-[11px] uppercase tracking-wider text-slate-600 select-none">
                  <tr>
                    <th className="px-3 py-2 border-r border-slate-200 w-12 text-center">STT</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-28">Mã Bệnh Án</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-36">Bệnh nhân</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-28">Thời gian (HIS)</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-20">Tab</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-48">Dịch vụ / Trường</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-32">Giá trị cũ</th>
                    <th className="px-3 py-2 border-r border-slate-200 w-36">Giá trị mới</th>
                    <th className="px-3 py-2 border-r border-slate-200">Lý do</th>
                    <th className="px-2 py-2 text-center w-12">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono font-bold text-teal-800">
                        {item.maBa || "—"}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        <div>{item.hoTen || "—"}</div>
                        <div className="font-mono text-[10px] text-slate-400">LK: {item.maLk}</div>
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
                      <td className="px-3 py-2 font-mono text-[11px] text-rose-700 line-through break-all">
                        {item.oldValue || "(trống)"}
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] font-bold text-teal-700 break-all bg-teal-50/30">
                        {item.newValue}
                      </td>
                      <td className="px-3 py-2 text-slate-600 text-[11px] leading-tight">
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
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <div>
            Định dạng tương thích 100% với <b>VNPT-HIS XML130 Auto Editor Extension</b>.
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
