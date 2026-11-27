import {
  matchTt01Appendix2,
  checkPatientDiseasesTt01,
} from "../src/lib/tt01-appendix2-diseases.ts";

const testCodes = [
  "C50.1",
  "N18.4",
  "N18.5",
  "Z49.1",
  "A15",
  "A16.2",
  "E11.7",
  "I10",
  "K29.7",
  "D56",
  "J44",
  "G20",
  "Z95",
];

console.log("=== KIỂM TRA MÃ ICD ĐƠN LẺ ===");
for (const code of testCodes) {
  const res = matchTt01Appendix2(code);
  console.log(code, "->", res ? `${res.diseaseName} [${res.rawIcd}]` : "NULL (Không thuộc PL2)");
}

console.log("\n=== KIỂM TRA TỔNG HỢP BỆNH CHÍNH + KÈM THEO ===");
const checkRes = checkPatientDiseasesTt01("K29.7", "I10; N18.4; E11.7");
console.log("Has Appendix 2 disease:", checkRes.hasAppendix2Disease);
for (const d of checkRes.matchedDiseases) {
  console.log(`- Mã: ${d.matchedCode} | Bệnh: ${d.diseaseName} | TT12 PL2 STT: ${d.stt}`);
}
