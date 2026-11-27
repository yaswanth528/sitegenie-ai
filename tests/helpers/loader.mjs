// Lets plain Node (no extra tools) run this project's TypeScript files in tests: resolves the "@/..." alias and
// extension-less imports. Node itself strips the type annotations.
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const EXTS = [".ts", ".tsx", ".js", ".mjs"];
const known = /\.(?:[cm]?[jt]sx?|json|node)$/;

function probe(target) {
  if (existsSync(target) && statSync(target).isFile()) return target;
  for (const ext of EXTS) if (existsSync(target + ext)) return target + ext;
  for (const ext of EXTS) if (existsSync(path.join(target, "index" + ext))) return path.join(target, "index" + ext);
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let target = null;
  if (specifier.startsWith("@/")) target = path.join(root, specifier.slice(2));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:") && !known.test(specifier))
    target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
  if (target) {
    const found = probe(target);
    if (found) return nextResolve(pathToFileURL(found).href, context);
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // Next.js ships "next/server" as a CommonJS file without an ESM export map.
    if (/^next\/[\w-]+$/.test(specifier)) return nextResolve(specifier + ".js", context);
    throw err;
  }
}
