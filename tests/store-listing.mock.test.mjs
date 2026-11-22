// "Documents directly inside a folder" must work for ANY shop name, on Cloudflare D1.
// Bug (2026-11-22): the admin page failed with "D1 query failed: LIKE or GLOB pattern too complex" because the old query
// used LIKE 'catalogues/orders/<slug>/%/%'; D1 refuses LIKE patterns over 50 bytes, which long slugs pass.
// This runs the new condition (directChildren in lib/store.ts) on a real SQLite engine (node:sqlite, in memory).
// It proves the condition selects the right rows and uses no LIKE/GLOB. It does not talk to Cloudflare: D1's 50-byte
// limit itself is not reproduced here, so the LIKE-free guard below is what protects against the bug coming back.
//
// Run:  node --import ./tests/helpers/register.mjs --test tests/store-listing.mock.test.mjs
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { directChildren } = await import(pathToFileURL(path.join(root, "lib/store.ts")).href);

const LONG = "sri-venkateshwara-traditional-silk-sarees-and-fancy-kurtis-boutique-ab12"; // 72 characters
const paths = [
  "catalogues/a.json",
  "catalogues/b.json",
  `catalogues/${LONG}.json`,
  "catalogues/auth/9876543210.json", // subfolder: not a direct child of catalogues
  "catalogues/orders/a/o1.json",
  "catalogues/orders/a/o2.json",
  "catalogues/orders/ab/o9.json", // a different shop whose slug starts with "a"
  `catalogues/orders/${LONG}/o1.json`,
  `catalogues/orders/${LONG}/o2.json`,
  `catalogues/orders/${LONG}/o3.json`,
  `catalogues/orders/${LONG}/deeper/x.json`, // nested deeper: not a direct child
  "catalogues/enquiries/e1.json",
  "other/c.json",
];

function run(dir) {
  const db = new DatabaseSync(":memory:");
  db.exec("CREATE TABLE docs (path TEXT PRIMARY KEY, body TEXT)");
  const ins = db.prepare("INSERT INTO docs (path, body) VALUES (?, ?)");
  for (const p of paths) ins.run(p, "{}");
  const { where, params } = directChildren(dir);
  return { sql: where, rows: db.prepare(`SELECT path FROM docs WHERE ${where} ORDER BY path`).all(...params).map((r) => r.path) };
}

test("direct children only: not subfolders, not other folders, not a sibling shop with a similar slug", () => {
  assert.deepEqual(run("catalogues").rows, ["catalogues/a.json", "catalogues/b.json", `catalogues/${LONG}.json`].sort());
  assert.deepEqual(run("catalogues/orders/a").rows, ["catalogues/orders/a/o1.json", "catalogues/orders/a/o2.json"], "shop 'ab' is not shop 'a'");
  assert.deepEqual(run("catalogues/enquiries").rows, ["catalogues/enquiries/e1.json"]);
  assert.deepEqual(run("catalogues/auth").rows, ["catalogues/auth/9876543210.json"]);
  assert.deepEqual(run("catalogues/orders/nobody").rows, []);
});

test("a shop with a very long name lists its orders (the admin page bug)", () => {
  const dir = `catalogues/orders/${LONG}`;
  assert.ok(`${dir}/%/%`.length > 50, "the old LIKE pattern would have been over D1's 50-byte limit");
  assert.deepEqual(run(dir).rows, [`${dir}/o1.json`, `${dir}/o2.json`, `${dir}/o3.json`], "all 3 orders, not the nested file");
});

test("guard: the condition never uses LIKE or GLOB (D1 limits their pattern length)", () => {
  const { where } = directChildren(`catalogues/orders/${LONG}`);
  assert.ok(!/\b(like|glob)\b/i.test(where), where);
});
