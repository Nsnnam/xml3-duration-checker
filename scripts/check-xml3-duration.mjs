import assert from "node:assert/strict";
import {
  DEFAULT_GROUP_CODES,
  GROUP_OPTIONS,
  getChronologyIssues,
  withPatientInfo,
  minutesBetween,
  parseXmlDateTime,
} from "../src/lib/xml3-duration.ts";
import { formatXmlDateTime } from "../src/lib/timezone.ts";

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

const linked = withPatientInfo(
  { MA_LK: "LK-001", MA_BN: "", HO_TEN: "" },
  new Map([["LK-001", { MA_LK: "LK-001", MA_BN: "BN-001", HO_TEN: "Nguyễn Văn A" }]]),
);
assert.equal(linked.MA_BN, "BN-001");
assert.equal(linked.HO_TEN, "Nguyễn Văn A");
assert.equal(linked.MA_LK, "LK-001");
console.log("XML3 duration, 18-group filter, chronology and XML1/XML3 join smoke test: OK");
