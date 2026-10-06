import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeStyleName,
  findExistingStyle,
  filterStyles,
} from "../src/lib/style-contracts.mjs";

test("creation recognizes normalized existing names before a real POST", () => {
  const existing = { styleId: 7, name: "Korean Makeup", isActive: true };
  assert.equal(normalizeStyleName("  Ｋorean\t Makeup  "), "Korean Makeup");
  assert.equal(findExistingStyle([existing], "  KOREAN\nmakeup "), existing);
  assert.equal(findExistingStyle([existing], "Natural"), undefined);
});

test("search preserves real row identity and backend order without mutating data", () => {
  const rows = [
    { styleId: 2, name: "Korean" },
    { styleId: 1, name: null },
    { styleId: 3, name: "Korean Makeup" },
  ];
  assert.deepEqual(filterStyles(rows, " KOREAN "), [rows[0], rows[2]]);
  assert.deepEqual(filterStyles(rows, ""), rows);
  assert.deepEqual(filterStyles(rows, "unknown"), []);
  assert.equal(rows[1].name, null);
});
