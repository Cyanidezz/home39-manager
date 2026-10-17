// Takes full-page screenshots of the app running against the fake backend.
//
//   1. node tools/visual-qa/mock-supabase.mjs            (terminal 1, port 54321)
//   2. NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=mock SUPABASE_SERVICE_ROLE_KEY=mock \
//      npm run dev -- -p 3991                              (terminal 2, from repo root)
//   3. node tools/visual-qa/screenshot.mjs [outDir] [page,page,...] [desktop|mobile|both]
//
// Pages are paths such as /dashboard; with no list a default set is captured.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { sampleBills } from "./fixtures.mjs";

const base = process.env.APP_URL || "http://localhost:3991";
const chrome = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = path.resolve(process.argv[2] || "visual-qa-shots");
const mode = process.argv[4] || "both";

const current = sampleBills[1];
const defaultPages = [
  "/", "/login", "/dashboard", "/rooms", "/rooms/A", "/rooms/A/bills", `/rooms/A/bills/${current.id}`,
  "/rooms/A/bills/new", "/expenses", "/settings/homepage", "/settings/payment", `/pay/${current.public_token}`,
];
const pages = process.argv[3] && process.argv[3] !== "all" ? process.argv[3].split(",") : defaultPages;

const viewports = {
  desktop: { width: 1280, height: 900, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

fs.mkdirSync(outDir, { recursive: true });
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "home39-qa-"));
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, userDataDir, args: ["--no-sandbox"] });

async function signIn(page) {
  await page.goto(`${base}/login`, { waitUntil: "networkidle0" });
  await page.type("#email", "test@example.com");
  await page.type("#password", "mock-password");
  await Promise.all([
    page.waitForFunction(() => location.pathname.startsWith("/dashboard"), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
}

const slug = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 60));

try {
  for (const name of mode === "both" ? ["desktop", "mobile"] : [mode]) {
    const page = await browser.newPage();
    await page.setViewport(viewports[name]);
    const problems = [];
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("console", (msg) => { if (msg.type() === "error") problems.push(`console: ${msg.text().slice(0, 160)}`); });
    await signIn(page);
    for (const route of pages) {
      await page.goto(`${base}${route}`, { waitUntil: "networkidle2", timeout: 60000 });
      await new Promise((resolve) => setTimeout(resolve, 400));
      const file = path.join(outDir, `${slug(route)}.${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`${name.padEnd(7)} ${route} -> ${file}`);
    }
    if (problems.length) console.log(`[${name}] browser messages:\n  ${[...new Set(problems)].join("\n  ")}`);
    await page.close();
  }
} finally {
  await browser.close();
  fs.rmSync(userDataDir, { recursive: true, force: true });
}
