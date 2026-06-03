import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(__dirname, "../src/lib/planning-core.ts");
const outfile = path.join(__dirname, "../public/planning-core.js");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  format: "iife",
  globalName: "SplPlanningCore",
  outfile,
  platform: "neutral",
  target: ["es2020"],
  logLevel: "info",
});

console.log(`Wrote ${outfile}`);
