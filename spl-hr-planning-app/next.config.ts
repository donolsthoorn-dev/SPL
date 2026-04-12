import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** Zorgt dat Next de app-map als root ziet i.p.v. een bovenliggende map met package-lock (monorepo). */
const nextConfig: NextConfig = {
  outputFileTracingRoot: appRoot,
};

export default nextConfig;
