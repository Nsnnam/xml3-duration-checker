import assert from "node:assert/strict";
import { getChronologyIssues, minutesBetween, parseXmlDateTime } from "../src/lib/xml3-duration.ts";
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
assert.equal(formatXmlDateTime("202608280930"), "08/28/2026 09:30");
console.log("XML3 duration, group-filter support and chronology smoke test: OK");
