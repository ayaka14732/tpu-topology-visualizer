import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on("pageerror", (e) => console.log("ERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});
await page.goto("http://localhost:5173");
await page.getByTitle("Stop Auto-Rotate").click();
await page.mouse.move(1200, 50);
await page.waitForTimeout(500);
await page.screenshot({ path: "docs/reference/local-main.png" });
console.log(await page.locator("aside").innerText());
await page.getByTitle("Color Settings").click();
await page.screenshot({ path: "docs/reference/local-colors.png" });
await page.getByTitle("Back to Main").click();
await page.getByLabel("Torus (Wrap X-Y)", { exact: true }).check();
await page.getByTitle("Stop Auto-Rotate").click();
await page.mouse.move(1200, 50);
await page.waitForTimeout(500);
await page.screenshot({ path: "docs/reference/local-torus.png" });
await browser.close();
