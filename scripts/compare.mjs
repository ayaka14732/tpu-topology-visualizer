import { chromium } from "playwright";
import fs from "node:fs";
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = {};
for (const [name, url] of [
  ["original", "https://tpu-visualizer.uc.r.appspot.com/"],
  ["local", "http://localhost:5173/"],
]) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(url);
  await page.getByTitle("Stop Auto-Rotate", { exact: true }).click();
  await page.mouse.move(1400, 50);
  await page.waitForTimeout(300);
  results[name] = await page
    .locator("aside, #ui-layer > div")
    .first()
    .evaluate((el) => ({
      box: JSON.stringify(el.getBoundingClientRect()),
      labels: [...el.querySelectorAll("select, h1, input[type=radio]")].map(
        (e) => ({
          tag: e.tagName,
          rect: JSON.stringify(e.getBoundingClientRect()),
        }),
      ),
    }));
  await page.getByText("Torus (Wrap X-Y)", { exact: true }).click();
  await page.getByTitle("Stop Auto-Rotate", { exact: true }).click();
  await page.mouse.move(1400, 50);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `docs/reference/${name}-torus.png` });
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `docs/reference/${name}-torus-zoomed-out.png`,
  });
  await page.close();
}
fs.writeFileSync(
  "docs/reference/layout-measurements.json",
  JSON.stringify(results, null, 2),
);
await browser.close();
