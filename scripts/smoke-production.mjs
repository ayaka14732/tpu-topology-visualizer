import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [],
    external = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => {
    if (new URL(route.request().url()).hostname !== "127.0.0.1") {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.locator('[data-ready="true"]').waitFor();
  await page.getByTitle("Stop Auto-Rotate", { exact: true }).click();
  assert.equal(
    await page.getByTestId("topology-scene").getAttribute("data-chips"),
    "64",
  );
  await page.getByTitle("Color Settings", { exact: true }).click();
  await page.getByLabel("Color Scheme", { exact: true }).selectOption("pastel");
  await page
    .getByRole("button", { name: "Reset to Scheme Default", exact: true })
    .scrollIntoViewIfNeeded();
  await page
    .getByRole("button", { name: "Reset to Scheme Default", exact: true })
    .click();
  await page.getByTitle("Back to Main", { exact: true }).click();
  await page.getByLabel("TPU version", { exact: true }).selectOption("3");
  assert.equal(
    await page.getByTestId("topology-scene").getAttribute("data-chips"),
    "64",
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(
    "Production smoke passed: WebGL scene, controls, colors, family switch; no external requests or page errors.",
  );
} finally {
  await browser.close();
}
