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

// Bước 1: Thay thế các file ảnh thành Data URI Base64
for (const asset of fs.readdirSync(assetDir)) {
  const absolute = path.join(assetDir, asset);
  if (!fs.statSync(absolute).isFile()) continue;
  if (
    asset.endsWith(".jpg") ||
    asset.endsWith(".jpeg") ||
    asset.endsWith(".png") ||
    asset.endsWith(".webp")
  ) {
    const data = fs.readFileSync(absolute);
    const mime = asset.endsWith(".png") ? "image/png" : "image/jpeg";
    const dataUrl = `data:${mime};base64,${data.toString("base64")}`;
    html = html.replaceAll(`./assets/${asset}`, dataUrl).replaceAll(`/assets/${asset}`, dataUrl);
  }
}

// Bước 2: Inline CSS trực tiếp vào thẻ <style>
for (const asset of fs.readdirSync(assetDir)) {
  if (asset.endsWith(".css")) {
    const absolute = path.join(assetDir, asset);
    const cssContent = fs.readFileSync(absolute, "utf8");
    const cssLinkRegex = new RegExp(`<link[^>]*href=["'][^"']*${asset}["'][^>]*>`, "gi");
    html = html.replace(cssLinkRegex, () => `<style>\n${cssContent}\n</style>`);
  }
}

// Bước 3: Inline JS trực tiếp vào thẻ <script type="module"> đặt trước </body> (an toàn 100% khi mở file:/// offline)
for (const asset of fs.readdirSync(assetDir)) {
  if (asset.endsWith(".js")) {
    const absolute = path.join(assetDir, asset);
    let jsContent = fs.readFileSync(absolute, "utf8");
    // Thoát tất cả các chuỗi </script (kể cả hoa thường) để trình duyệt không đóng thẻ script sớm
    jsContent = jsContent.replace(/<\/script/gi, "<\\/script");
    const jsScriptRegex = new RegExp(
      `<script[^>]*src=["'][^"']*${asset}["'][^>]*>\\s*<\\/script>`,
      "gi",
    );
    // Xóa thẻ script ở <head>
    html = html.replace(jsScriptRegex, () => "");
    // Chèn script trực tiếp trước </body> để đảm bảo DOM #root đã sẵn sàng khi mở offline file:///
    html = html.replace(
      "</body>",
      () => `<script type="module">\n${jsContent}\n</script>\n</body>`,
    );
  }
}

fs.writeFileSync(path.join(singleDir, "xml3-duration-checker.html"), html);
console.log("Release folders ready under releases/web and releases/single-page");
