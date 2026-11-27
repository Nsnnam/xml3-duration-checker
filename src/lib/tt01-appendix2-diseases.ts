/**
 * Phụ lục II ban hành kèm theo Thông tư số 01/2025/TT-BYT
 * Danh mục một số bệnh được khám bệnh, chữa bệnh tại cơ sở KCB cấp cơ bản
 * và quy định mã đối tượng KCB 1.16 theo Quyết định 3276/QĐ-BYT.
 *
 * Tác giả: Nguyễn Sơn Nam (Nsnnam)
 */

export interface Tt01DiseaseRule {
  stt: number;
  name: string;
  rawIcd: string;
  condition?: string;
  /**
   * Danh sách tiền tố mã ICD hoặc mã cụ thể (ví dụ: ["C", "D00", "D01", "N18.4", "N18.5"])
   */
  prefixes?: string[];
  /**
   * Dải mã 3 ký tự: [từ mã, đến mã], ví dụ [["C00", "C97"], ["D00", "D09"]]
   */
  ranges?: [string, string][];
  /**
   * Các mã bị loại trừ rõ ràng
   */
  excludedCodes?: string[];
}

export interface DiseaseMatchResult {
  stt: number;
  matchedCode: string;
  diseaseName: string;
  condition?: string;
  rawIcd: string;
  sourceAppendix: "PL2" | "PL1";
}

/**
 * 106 nhóm bệnh theo Phụ lục II Thông tư 01/2025/TT-BYT
 */
export const TT01_APPENDIX_2_RULES: Tt01DiseaseRule[] = [
  {
    stt: 1,
    name: "Bệnh lao",
    rawIcd: "Từ A15 đến A19 (trừ mã A15)",
    ranges: [["A16", "A19"]],
    excludedCodes: ["A15"],
  },
  { stt: 2, name: "Bệnh phong (bệnh Hansen)", rawIcd: "A30", prefixes: ["A30"] },
  { stt: 3, name: "Nhiễm mycobacteria ở da", rawIcd: "A31.1", prefixes: ["A31.1", "A311"] },
  { stt: 4, name: "Nhiễm khuẩn mycobacteria khác", rawIcd: "A31.8", prefixes: ["A31.8", "A318"] },
  {
    stt: 5,
    name: "Nhiễm khuẩn mycobacteria không xác định",
    rawIcd: "A31.9",
    prefixes: ["A31.9", "A319"],
  },
  {
    stt: 6,
    name: "Viêm gan virus B mạn, có đồng nhiễm virus D",
    rawIcd: "B18.0",
    prefixes: ["B18.0", "B180"],
  },
  {
    stt: 7,
    name: "Viêm gan virus B mạn, không có đồng nhiễm virus D",
    rawIcd: "B18.1",
    prefixes: ["B18.1", "B181"],
  },
  { stt: 8, name: "Viêm gan virus C mạn tính", rawIcd: "B18.2", prefixes: ["B18.2", "B182"] },
  { stt: 9, name: "HIV/AIDS", rawIcd: "Từ B20 đến B24", ranges: [["B20", "B24"]] },
  { stt: 10, name: "Nhiễm zygomycota", rawIcd: "B46", prefixes: ["B46"] },
  {
    stt: 11,
    name: "Nhóm u ác tính",
    rawIcd: "Từ C00 đến C97",
    ranges: [["C00", "C97"]],
    condition:
      "Đối với mã C38.4 và C83.5 người bệnh được hưởng quyền lợi ngay trong lượt KCB có chẩn đoán xác định.",
  },
  { stt: 12, name: "Nhóm u tân sinh tại chỗ", rawIcd: "Từ D00 đến D09", ranges: [["D00", "D09"]] },
  {
    stt: 13,
    name: "Bệnh tăng hồng cầu mạn (hoặc Đa hồng cầu vô căn)",
    rawIcd: "C94.1 hoặc D45",
    prefixes: ["C94.1", "C941", "D45"],
  },
  {
    stt: 14,
    name: "U tân sinh khác không chắc chắn hoặc không biết sinh chất của mô lympho, tạo huyết",
    rawIcd: "D47",
    prefixes: ["D47"],
  },
  { stt: 15, name: "Nhóm bệnh tan máu bẩm sinh (Thalassemia)", rawIcd: "D56", prefixes: ["D56"] },
  { stt: 16, name: "Bệnh hồng cầu liềm", rawIcd: "D57", prefixes: ["D57"] },
  { stt: 17, name: "Thiếu máu tan máu mắc phải", rawIcd: "D59", prefixes: ["D59"] },
  {
    stt: 18,
    name: "Suy tủy xương một dòng hồng cầu mắc phải (giảm nguyên hồng cầu)",
    rawIcd: "D60",
    prefixes: ["D60"],
  },
  {
    stt: 19,
    name: "Các thể suy tủy xương khác",
    rawIcd: "D61",
    prefixes: ["D61"],
    condition:
      "Đối với mã D61.9 người bệnh được hưởng quyền lợi ngay trong lượt KCB có chẩn đoán xác định.",
  },
  { stt: 20, name: "Thiếu yếu tố VIII di truyền (Hemophilia A)", rawIcd: "D66", prefixes: ["D66"] },
  { stt: 21, name: "Thiếu yếu tố IX di truyền (Hemophilia B)", rawIcd: "D67", prefixes: ["D67"] },
  { stt: 22, name: "Các bất thường đông máu khác", rawIcd: "D68", prefixes: ["D68"] },
  { stt: 23, name: "Tăng tiểu cầu tiền phát", rawIcd: "D75.2", prefixes: ["D75.2", "D752"] },
  {
    stt: 24,
    name: "Các bệnh của tổ chức lympho - liên võng và mô bào",
    rawIcd: "D76",
    prefixes: ["D76"],
  },
  { stt: 25, name: "Bệnh sarcoid", rawIcd: "D86", prefixes: ["D86"] },
  {
    stt: 26,
    name: "Suy giáp khác",
    rawIcd: "E03 (trừ mã E03.0, E03.1)",
    prefixes: ["E03"],
    excludedCodes: ["E03.0", "E030", "E03.1", "E031"],
  },
  {
    stt: 27,
    name: "Bướu không độc khác (chèn khí quản, thanh quản)",
    rawIcd: "E04",
    prefixes: ["E04"],
  },
  { stt: 28, name: "Nhiễm độc giáp (cường giáp)", rawIcd: "E05", prefixes: ["E05"] },
  {
    stt: 29,
    name: "Nhóm bệnh đái tháo đường có biến chứng/tổn thương đa cơ quan",
    rawIcd: "E10.2-E10.8, E11.2-E11.8, E12, E13, E14",
    prefixes: [
      "E10.2",
      "E102",
      "E10.3",
      "E103",
      "E10.4",
      "E104",
      "E10.5",
      "E105",
      "E10.6",
      "E106",
      "E10.7",
      "E107",
      "E10.8",
      "E108",
      "E11.2",
      "E112",
      "E11.3",
      "E113",
      "E11.4",
      "E114",
      "E11.5",
      "E115",
      "E11.6",
      "E116",
      "E11.7",
      "E117",
      "E11.8",
      "E118",
      "E12",
      "E13",
      "E14",
    ],
    excludedCodes: [
      "E12.0",
      "E120",
      "E12.1",
      "E121",
      "E13.0",
      "E130",
      "E13.1",
      "E131",
      "E14.0",
      "E140",
      "E14.1",
      "E141",
    ],
    condition:
      "Tổn thương đa cơ quan hoặc biến chứng loét bàn chân, bệnh thận mạn, tim mạch, mắt, thần kinh...",
  },
  {
    stt: 30,
    name: "Cường cận giáp và các rối loạn khác của tuyến cận giáp",
    rawIcd: "E21",
    prefixes: ["E21"],
  },
  { stt: 31, name: "Cường tuyến yên", rawIcd: "E22", prefixes: ["E22"] },
  { stt: 32, name: "Suy tuyến yên", rawIcd: "E23", prefixes: ["E23"] },
  {
    stt: 33,
    name: "Thiểu năng vỏ thượng thận nguyên phát/suy vỏ thượng thận cấp",
    rawIcd: "E27.1, E27.2, E27.4",
    prefixes: ["E27.1", "E271", "E27.2", "E272", "E27.4", "E274"],
  },
  { stt: 34, name: "Tăng năng tủy thượng thận", rawIcd: "E27.5", prefixes: ["E27.5", "E275"] },
  { stt: 35, name: "Rối loạn chuyển hóa acid amin thơm", rawIcd: "E70", prefixes: ["E70"] },
  {
    stt: 36,
    name: "Rối loạn chuyển hóa acid amin chuỗi nhánh và acid béo",
    rawIcd: "E71",
    prefixes: ["E71"],
  },
  { stt: 37, name: "Các rối loạn khác của chuyển hóa acid amin", rawIcd: "E72", prefixes: ["E72"] },
  {
    stt: 38,
    name: "Rối loạn chuyển hóa đồng (bệnh Wilson)",
    rawIcd: "E83.0",
    prefixes: ["E83.0", "E830"],
  },
  {
    stt: 39,
    name: "Nhóm bệnh tâm thần",
    rawIcd: "Từ F00 đến F99 (trừ F07.2, F51.0)",
    ranges: [["F00", "F99"]],
    excludedCodes: ["F07.2", "F072", "F51.0", "F510"],
    condition:
      "Đối với các mã F20, F31, F32 kháng thuốc hưởng quyền lợi ngay trong lượt KCB chẩn đoán xác định.",
  },
  {
    stt: 40,
    name: "Viêm não - màng não và viêm tủy do vi khuẩn",
    rawIcd: "G04.2",
    prefixes: ["G04.2", "G042"],
  },
  { stt: 41, name: "Bệnh Parkinson", rawIcd: "G20", prefixes: ["G20"] },
  { stt: 42, name: "Hội chứng Parkinson thứ phát", rawIcd: "G21", prefixes: ["G21"] },
  { stt: 43, name: "Động kinh", rawIcd: "G40", prefixes: ["G40"] },
  { stt: 44, name: "Nhược cơ", rawIcd: "G70.0", prefixes: ["G70.0", "G700"] },
  { stt: 45, name: "Bại não liệt tứ chi co cứng", rawIcd: "G80.0", prefixes: ["G80.0", "G800"] },
  { stt: 46, name: "Liệt hai chân và liệt tứ chi", rawIcd: "G82", prefixes: ["G82"] },
  { stt: 47, name: "Tắc mạch võng mạc", rawIcd: "H34", prefixes: ["H34"] },
  {
    stt: 48,
    name: "Điếc thần kinh giác quan",
    rawIcd: "H90.3, H90.4, H90.5",
    prefixes: ["H90.3", "H903", "H90.4", "H904", "H90.5", "H905"],
  },
  { stt: 49, name: "Nghe kém đặc hiệu khác", rawIcd: "H91.8", prefixes: ["H91.8", "H918"] },
  {
    stt: 50,
    name: "Nhóm bệnh hệ tuần hoàn nặng / can thiệp phẫu thuật",
    rawIcd: "Từ I00 đến I99 (trừ I10, I20*, I34*, I49.9, I67.9, I83*, I95, I99)",
    ranges: [["I00", "I99"]],
    // Ngoại lệ theo thông tư: I10 (tăng HA thông thường), I20 (trừ I20.0, I20.1, I20.8, I20.9), I34 (trừ I34.0-I34.9), I49.9, I67.9, I83, I95, I99
    excludedCodes: ["I10", "I49.9", "I499", "I67.9", "I679", "I95", "I99", "I20", "I34", "I83"],
    // Riêng các mã này trong dải trừ thì lại ĐƯỢC hưởng theo thông tư:
    prefixes: [
      "I20.0",
      "I200",
      "I20.1",
      "I201",
      "I20.8",
      "I208",
      "I20.9",
      "I209",
      "I34.0",
      "I340",
      "I34.1",
      "I341",
      "I34.2",
      "I342",
      "I34.8",
      "I348",
      "I34.9",
      "I349",
      "I83.0",
      "I830",
      "I83.1",
      "I831",
      "I83.2",
      "I832",
      "I83.9",
      "I839",
    ],
  },
  { stt: 51, name: "Bệnh phổi tắc nghẽn mạn tính khác (COPD)", rawIcd: "J44", prefixes: ["J44"] },
  { stt: 52, name: "Tăng bạch cầu ái toan ở phổi", rawIcd: "J82", prefixes: ["J82"] },
  { stt: 53, name: "Áp xe phổi và trung thất", rawIcd: "J85", prefixes: ["J85"] },
  { stt: 54, name: "Mủ lồng ngực (nhiễm trùng màng phổi nặng)", rawIcd: "J86", prefixes: ["J86"] },
  { stt: 55, name: "Tràn dịch dưỡng trấp", rawIcd: "J94.0", prefixes: ["J94.0", "J940"] },
  { stt: 56, name: "Bệnh của cơ hoành", rawIcd: "J98.6", prefixes: ["J98.6", "J986"] },
  {
    stt: 57,
    name: "Mất khả năng giãn của tâm vị (Achalasia)",
    rawIcd: "K22.0",
    prefixes: ["K22.0", "K220"],
  },
  { stt: 58, name: "Bệnh Crohn (viêm ruột từng vùng)", rawIcd: "K50", prefixes: ["K50"] },
  { stt: 59, name: "Suy gan cấp và bán cấp", rawIcd: "K72.0", prefixes: ["K72.0", "K720"] },
  { stt: 60, name: "Viêm gan mãn hoạt động", rawIcd: "K73.2", prefixes: ["K73.2", "K732"] },
  {
    stt: 61,
    name: "Viêm gan tái hoạt động, không đặc hiệu",
    rawIcd: "K73.9",
    prefixes: ["K73.9", "K739"],
  },
  { stt: 62, name: "Viêm gan tự miễn", rawIcd: "K75.4", prefixes: ["K75.4", "K754"] },
  { stt: 63, name: "Viêm mô bào", rawIcd: "L03", prefixes: ["L03"] },
  { stt: 64, name: "Pemphigus", rawIcd: "L10", prefixes: ["L10"] },
  { stt: 65, name: "Pemphigoid", rawIcd: "L12", prefixes: ["L12"] },
  { stt: 66, name: "Vảy nến mủ toàn thân", rawIcd: "L40.1", prefixes: ["L40.1", "L401"] },
  {
    stt: 67,
    name: "Vảy phấn dạng lichen và đậu mùa cấp tính",
    rawIcd: "L41.0",
    prefixes: ["L41.0", "L410"],
  },
  { stt: 68, name: "Vảy phấn đỏ nang lông", rawIcd: "L44.0", prefixes: ["L44.0", "L440"] },
  {
    stt: 69,
    name: "Tổn thương phổi trong bệnh lý thấp khớp",
    rawIcd: "M05.1",
    prefixes: ["M05.1", "M051"],
  },
  { stt: 70, name: "Viêm khớp trẻ em", rawIcd: "M08", prefixes: ["M08"] },
  { stt: 71, name: "Gút (thống phong)", rawIcd: "M10", prefixes: ["M10"] },
  {
    stt: 72,
    name: "Bệnh Lupus ban đỏ hệ thống có tổn thương phủ tạng",
    rawIcd: "M32.1",
    prefixes: ["M32.1", "M321"],
  },
  {
    stt: 73,
    name: "Các dạng khác của Lupus ban đỏ hệ thống",
    rawIcd: "M32.8",
    prefixes: ["M32.8", "M328"],
  },
  { stt: 74, name: "Xơ cứng toàn thể", rawIcd: "M34", prefixes: ["M34"] },
  {
    stt: 75,
    name: "Các tổn thương hệ thống khác của mô liên kết",
    rawIcd: "M35",
    prefixes: ["M35"],
  },
  { stt: 76, name: "Gù và ưỡn cột sống", rawIcd: "M40", prefixes: ["M40"] },
  { stt: 77, name: "Vẹo cột sống", rawIcd: "M41", prefixes: ["M41"] },
  { stt: 78, name: "Bệnh viêm cột sống dính khớp", rawIcd: "M45", prefixes: ["M45"] },
  { stt: 79, name: "Viêm xương tủy", rawIcd: "M86", prefixes: ["M86"] },
  { stt: 80, name: "Suy thận mạn, giai đoạn 3", rawIcd: "N18.3", prefixes: ["N18.3", "N183"] },
  { stt: 81, name: "Suy thận mạn, giai đoạn 4", rawIcd: "N18.4", prefixes: ["N18.4", "N184"] },
  { stt: 82, name: "Suy thận mạn, giai đoạn 5", rawIcd: "N18.5", prefixes: ["N18.5", "N185"] },
  { stt: 83, name: "Chửa trứng", rawIcd: "O01", prefixes: ["O01"] },
  {
    stt: 84,
    name: "Biến chứng sau sẩy thai, chửa ngoài tử cung và chửa trứng",
    rawIcd: "O08",
    prefixes: ["O08"],
  },
  { stt: 85, name: "Tiền sản giật", rawIcd: "O14", prefixes: ["O14"] },
  { stt: 86, name: "Đái tháo đường trong khi có thai", rawIcd: "O24", prefixes: ["O24"] },
  { stt: 87, name: "Rau cài răng lược", rawIcd: "O43.2", prefixes: ["O43.2", "O432"] },
  { stt: 88, name: "Rau tiền đạo", rawIcd: "O44", prefixes: ["O44"] },
  { stt: 89, name: "Đa hồng cầu sơ sinh", rawIcd: "P61.1", prefixes: ["P61.1", "P611"] },
  { stt: 90, name: "Não úng thủy bẩm sinh", rawIcd: "Q03", prefixes: ["Q03"] },
  {
    stt: 91,
    name: "Các dị tật bẩm sinh của hệ thống tuần hoàn (tim bẩm sinh)",
    rawIcd: "Từ Q20 đến Q28",
    ranges: [["Q20", "Q28"]],
  },
  {
    stt: 92,
    name: "Không có thận và các khuyết tật khác của thận",
    rawIcd: "Q60",
    prefixes: ["Q60"],
  },
  { stt: 93, name: "Biến dạng bẩm sinh của khớp háng", rawIcd: "Q65", prefixes: ["Q65"] },
  { stt: 94, name: "Các biến dạng bẩm sinh của bàn chân", rawIcd: "Q66", prefixes: ["Q66"] },
  { stt: 95, name: "Các biến dạng cơ xương bẩm sinh khác", rawIcd: "Q68", prefixes: ["Q68"] },
  { stt: 96, name: "Tật đa ngón", rawIcd: "Q69", prefixes: ["Q69"] },
  { stt: 97, name: "Tật dính ngón", rawIcd: "Q70", prefixes: ["Q70"] },
  { stt: 98, name: "Các khuyết tật thiếu hụt của chi trên", rawIcd: "Q71", prefixes: ["Q71"] },
  { stt: 99, name: "Các khuyết tật thiếu hụt của chi dưới", rawIcd: "Q72", prefixes: ["Q72"] },
  { stt: 100, name: "Bệnh vảy cá bẩm sinh", rawIcd: "Q80", prefixes: ["Q80"] },
  { stt: 101, name: "Bong biểu bì bọng nước", rawIcd: "Q81", prefixes: ["Q81"] },
  { stt: 102, name: "Hội chứng Turner", rawIcd: "Q96", prefixes: ["Q96"] },
  {
    stt: 103,
    name: "Các phát hiện bất thường khác về nước tiểu",
    rawIcd: "R82",
    prefixes: ["R82"],
  },
  {
    stt: 104,
    name: "Lọc máu ngoài cơ thể (thận nhân tạo)",
    rawIcd: "Z49.1",
    prefixes: ["Z49.1", "Z491"],
  },
  {
    stt: 105,
    name: "Sự có mặt của các thiết bị cấy ghép tim và mạch máu",
    rawIcd: "Z95",
    prefixes: ["Z95"],
  },
  // Mục 106: Các bệnh thuộc Phụ lục I Thông tư 01/2025/TT-BYT
  {
    stt: 106,
    name: "Các bệnh thuộc Phụ lục I Thông tư 01/2025/TT-BYT (chuyển cấp / cấp chuyên sâu)",
    rawIcd: "Theo mã ICD-10 tại Phụ lục I",
    prefixes: [
      "A17",
      "A31.0",
      "A310",
      "B41.0",
      "B410",
      "B42.0",
      "B420",
      "B44.0",
      "B440",
      "B45.0",
      "B450",
      "B46.0",
      "B460",
      "B46.4",
      "B464",
      "C25",
      "C37",
      "C38",
      "C70",
      "C71",
      "C79.3",
      "C793",
      "D46",
      "F33",
      "F42",
      "G04",
      "G35",
      "G36.0",
      "G360",
      "H35.1",
      "H351",
      "I50",
      "I97.0",
      "I970",
      "J84",
      "L95.0",
      "L950",
      "P70.2",
      "P702",
      "Q04",
      "Q06",
      "U84.3",
      "U843",
    ],
  },
];

/**
 * Kiểm tra xem một mã ICD-10 có nằm trong dải 3 ký tự (ví dụ: 'C50' nằm trong 'C00'-'C97') hay không.
 */
function isCodeIn3CharRange(code3: string, fromCode: string, toCode: string): boolean {
  if (code3.length < 3 || fromCode.length < 3 || toCode.length < 3) return false;
  const letter = code3.charAt(0);
  const fromLetter = fromCode.charAt(0);
  const toLetter = toCode.charAt(0);

  if (letter < fromLetter || letter > toLetter) return false;

  const numPart = parseInt(code3.slice(1, 3), 10);
  if (Number.isNaN(numPart)) return false;

  if (letter === fromLetter && letter === toLetter) {
    const fromNum = parseInt(fromCode.slice(1, 3), 10);
    const toNum = parseInt(toCode.slice(1, 3), 10);
    return numPart >= fromNum && numPart <= toNum;
  }
  if (letter === fromLetter) {
    const fromNum = parseInt(fromCode.slice(1, 3), 10);
    return numPart >= fromNum;
  }
  if (letter === toLetter) {
    const toNum = parseInt(toCode.slice(1, 3), 10);
    return numPart <= toNum;
  }
  return true;
}

/**
 * Khớp một mã ICD bất kỳ với Phụ lục II Thông tư 01/2025/TT-BYT
 */
export function matchTt01Appendix2(rawCode: string): DiseaseMatchResult | null {
  if (!rawCode) return null;
  const cleanCode = rawCode.trim().toUpperCase();
  if (!cleanCode) return null;

  // Lấy 3 ký tự đầu (ví dụ C50, N18, A16)
  const code3 = cleanCode.replace(/[^A-Z0-9]/g, "").slice(0, 3);
  const codeWithoutDot = cleanCode.replace(/\./g, "");

  for (const rule of TT01_APPENDIX_2_RULES) {
    // 1. Kiểm tra mã bị loại trừ trước
    if (rule.excludedCodes) {
      const isExcluded = rule.excludedCodes.some((ex) => {
        const cleanEx = ex.toUpperCase();
        return cleanCode === cleanEx || codeWithoutDot === cleanEx.replace(/\./g, "");
      });
      if (isExcluded) continue;
    }

    // 2. Kiểm tra prefixes cụ thể
    if (rule.prefixes && rule.prefixes.length > 0) {
      for (const pref of rule.prefixes) {
        const pUpper = pref.toUpperCase();
        const pWithoutDot = pUpper.replace(/\./g, "");
        if (
          cleanCode === pUpper ||
          cleanCode.startsWith(`${pUpper}.`) ||
          cleanCode.startsWith(pUpper) ||
          codeWithoutDot === pWithoutDot ||
          codeWithoutDot.startsWith(pWithoutDot)
        ) {
          return {
            stt: rule.stt,
            matchedCode: cleanCode,
            diseaseName: rule.name,
            condition: rule.condition,
            rawIcd: rule.rawIcd,
            sourceAppendix: rule.stt === 106 ? "PL1" : "PL2",
          };
        }
      }
    }

    // 3. Kiểm tra dải mã 3 ký tự (ranges)
    if (rule.ranges && rule.ranges.length > 0) {
      for (const [fromC, toC] of rule.ranges) {
        if (isCodeIn3CharRange(code3, fromC, toC)) {
          return {
            stt: rule.stt,
            matchedCode: cleanCode,
            diseaseName: rule.name,
            condition: rule.condition,
            rawIcd: rule.rawIcd,
            sourceAppendix: "PL2",
          };
        }
      }
    }
  }

  return null;
}

/**
 * Tách và kiểm tra tất cả các mã bệnh của bệnh nhân (bệnh chính + các bệnh kèm theo)
 */
export function checkPatientDiseasesTt01(
  mainDiseaseCode?: string,
  subDiseaseCodesStr?: string,
): {
  hasAppendix2Disease: boolean;
  matchedDiseases: DiseaseMatchResult[];
} {
  const codes: string[] = [];

  if (mainDiseaseCode) {
    const mainClean = mainDiseaseCode.trim();
    if (mainClean) codes.push(mainClean);
  }

  if (subDiseaseCodesStr) {
    // Tách bằng dấu chấm phẩy, dấu phẩy, dấu cách, hoặc gạch chéo
    const parts = subDiseaseCodesStr
      .split(/[;,/|\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    codes.push(...parts);
  }

  const matchedDiseases: DiseaseMatchResult[] = [];
  const seenCodes = new Set<string>();

  for (const c of codes) {
    const upper = c.toUpperCase();
    if (seenCodes.has(upper)) continue;
    seenCodes.add(upper);

    const match = matchTt01Appendix2(upper);
    if (match) {
      matchedDiseases.push(match);
    }
  }

  return {
    hasAppendix2Disease: matchedDiseases.length > 0,
    matchedDiseases,
  };
}
