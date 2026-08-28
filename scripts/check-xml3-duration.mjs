import assert from "node:assert/strict";
import { minutesBetween, parseXmlDateTime } from "../src/lib/xml3-duration.ts";

assert.equal(minutesBetween("202608280800", "202608280910"), 70);
assert.equal(minutesBetween("202608280800", "202608280911"), 71);
assert.equal(minutesBetween("202608282350", "202608290020"), 30);
assert.equal(minutesBetween("202608280900", "202608280859"), -1);
assert.equal(parseXmlDateTime("202613010900"), null);
console.log("XML3 duration logic smoke test: OK");
