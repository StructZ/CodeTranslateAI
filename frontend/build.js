import esbuild from "esbuild";
import "dotenv/config";

const define = {
  "process.env.BACKEND_URL": JSON.stringify(process.env.BACKEND_URL || ""),
};

esbuild
  .build({
    entryPoints: ["scripts/content.js", "background.js"],
    bundle: true,
    outdir: "dist",
    define: define,
  })
  .catch(() => process.exit(1));

console.log("Build complete. Files are in the /dist folder.");
