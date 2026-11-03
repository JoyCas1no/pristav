// Собирает pristav.html (формат Artifact, без doctype) и index.html (для статичного хостинга) из src/.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rd = (f) => fs.readFileSync(path.join(root, "src", f), "utf8");
const head = rd("head.html"), data = rd("data.js"), gen = rd("gen.js"), career = rd("career.js"), music = rd("music.js"), cloud = rd("cloud.js"), engine = rd("engine.js");
const code = [data, gen, career, music, cloud, engine].join("\n");
fs.writeFileSync(path.join(root, "pristav.html"), `${head}\n<script>\n${code}</script>\n`);

const [before, after] = head.split('<div id="app">');
const full = `<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n${before}</head>\n<body>\n<div id="app">${after}\n<script>\n${code}</script>\n</body>\n</html>\n`;

fs.writeFileSync(path.join(root, "index.html"), full);
fs.writeFileSync(path.join(root, ".nojekyll"), "");
console.log("built pristav.html and index.html");
