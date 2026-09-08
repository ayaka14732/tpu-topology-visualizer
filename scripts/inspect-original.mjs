import { chromium } from "@playwright/test";
const browser = await chromium.launch({
  args: [
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
  ],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://tpu-visualizer.uc.r.appspot.com/");
await page.waitForTimeout(1800);
await page.getByTitle("Stop Auto-Rotate").click();
await page.screenshot({ path: "docs/reference/original-main.png" });
console.log(await page.locator("body").innerText());
console.log(
  await page.locator("select").evaluateAll((xs) =>
    xs.map((x) => ({
      value: x.value,
      options: [...x.options].map((o) => o.text),
    })),
  ),
);
await page.getByTitle("Color Settings").click();
await page.screenshot({ path: "docs/reference/original-colors.png" });
console.log(await page.locator("body").innerText());
await browser.close();
