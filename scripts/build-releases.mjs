import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", shell: true });
  if (result.status) process.exit(result.status);
};
const copyDir = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};

run("npx", ["vite", "build", "--config", "vite.spa.config.ts"]);
const web = path.join(root, "releases", "web");
copyDir(path.join(root, "dist-web"), web);
fs.writeFileSync(
  path.join(web, "README.txt"),
  "NsN_XMLcheck\n\nChạy: python -m http.server 5173 rồi mở http://localhost:5173\n",
);

const singleDir = path.join(root, "releases", "single-page");
fs.rmSync(singleDir, { recursive: true, force: true });
fs.mkdirSync(singleDir, { recursive: true });
const htmlPath = path.join(root, "dist-web", "index.html");
let html = fs.readFileSync(htmlPath, "utf8");
const assetDir = path.join(root, "dist-web", "assets");
for (const asset of fs.readdirSync(assetDir)) {
  const absolute = path.join(assetDir, asset);
  if (!fs.statSync(absolute).isFile()) continue;
  const data = fs.readFileSync(absolute);
  const mime = asset.endsWith(".css")
    ? "text/css"
    : asset.endsWith(".jpg") || asset.endsWith(".jpeg")
      ? "image/jpeg"
      : "application/octet-stream";
  const dataUrl = `data:${mime};base64,${data.toString("base64")}`;
  html = html.replaceAll(`./assets/${asset}`, dataUrl).replaceAll(`/assets/${asset}`, dataUrl);
}
fs.writeFileSync(path.join(singleDir, "xml3-duration-checker.html"), html);
console.log("Release folders ready under releases/web and releases/single-page");
