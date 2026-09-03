/** Downloads the exact Figma exports and rewrites the asset map to local files.
 * Run soon after export: Figma URLs expire. No access tokens are needed.
 */
import { Buffer } from "node:buffer";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  await readFile(path.join(root, "assets/figma/manifest.json"), "utf8"),
);
const sources = [];
const failures = [];
for (const [name, url] of Object.entries(manifest)) {
  let filename = `${name}.png`;
  try {
    let bytes;
    try {
      bytes = await readFile(path.join(root, "assets/figma", filename));
    } catch {}
    if (!bytes || bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      bytes = Buffer.from(await response.arrayBuffer());
      const png = bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
      const svg = bytes.toString("utf8", 0, 1000).includes("<svg");
      if (!png && !svg) throw new Error("Response was not a PNG or SVG asset");
      filename = `${name}.${png ? "png" : "svg"}`;
      await writeFile(path.join(root, "assets/figma", filename), bytes);
    }
    sources.push(`  ${name}: require('../assets/figma/${filename}'),`);
  } catch (error) {
    failures.push(name);
    sources.push(`  ${name}: { uri: ${JSON.stringify(url)} },`);
    console.error(`${name}: ${error.message}`);
  }
}
await writeFile(
  path.join(root, "constants/figma-assets.ts"),
  "// Generated from the exact Figma exports.\nexport const assets = {\n" +
    sources.join("\n") +
    "\n} as const;\n",
);
console.log(
  `${Object.keys(manifest).length - failures.length} assets available locally; ${failures.length} remain remote.`,
);
if (failures.length) {
  console.error(
    "If exports have expired, re-export the matching assets from Figma and update the manifest.",
  );
  process.exitCode = 1;
}
