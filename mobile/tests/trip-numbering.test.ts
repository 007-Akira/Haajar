import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cardSource = readFileSync(
  new URL("../src/components/cards/event-card.tsx", import.meta.url),
  "utf8"
);
const homeSource = readFileSync(
  new URL("../src/features/home/screens/home-screen.tsx", import.meta.url),
  "utf8"
);

test("trip cards display their sequential list position", () => {
  assert.match(homeSource, /map\(\(event, index\) =>/);
  assert.match(homeSource, /index=\{index\}/);
  assert.match(cardSource, /String\(index \+ 1\)\.padStart\(2, "0"\)/);
  assert.doesNotMatch(cardSource, /active \? "01" : "02"/);
});
