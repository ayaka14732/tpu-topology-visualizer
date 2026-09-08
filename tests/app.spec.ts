import { test, expect } from "@playwright/test";
async function ready(page: import("@playwright/test").Page, path = "/") {
  await page.goto(path);
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await page.getByTitle("Stop Auto-Rotate", { exact: true }).click();
}
test("default view, family matching, layouts, and system specifications", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page);
  await expect(page.getByLabel("TPU version", { exact: true })).toHaveValue(
    "2",
  );
  await expect(page.getByLabel("Topology", { exact: true })).toHaveValue("6");
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-chips",
    "64",
  );
  await page.getByLabel("TPU version", { exact: true }).selectOption("3");
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-chips",
    "64",
  );
  await expect(page.getByLabel("Topology", { exact: true })).toHaveValue("5");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await page
    .getByLabel("Topology", { exact: true })
    .selectOption({ label: "8x16" });
  await page.getByLabel("Cylinder (Wrap Y)", { exact: true }).check();
  await expect(page.getByTitle("Stop Auto-Rotate")).toBeVisible();
  await page
    .getByLabel("Topology", { exact: true })
    .selectOption({ label: "1x1" });
  await expect(
    page.getByLabel("Cartesian Grid", { exact: true }),
  ).toBeChecked();
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-links",
    "0",
  );
  await page.getByRole("button", { name: "System Specs" }).click();
  await expect(page.getByText("Total Chips", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("colors validate, persist, reset, and toggles remain in sync", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("ICI X (Cu)", { exact: true }).uncheck();
  await page.getByTitle("Color Settings", { exact: true }).click();
  await expect(
    page.getByLabel("ICI X (Copper)", { exact: true }),
  ).not.toBeChecked();
  const color = page.getByRole("textbox", {
    name: "TPUs hex color",
    exact: true,
  });
  await color.fill("123abc");
  await color.press("Enter");
  await expect(color).toHaveValue("#123abc");
  await color.fill("bad-value");
  await color.press("Tab");
  await expect(color).toHaveValue("#123abc");
  await page.reload();
  await page.getByTitle("Color Settings", { exact: true }).click();
  await expect(color).toHaveValue("#123abc");
  await page
    .getByRole("button", { name: "Reset TPUs to default", exact: true })
    .click();
  await expect(color).toHaveValue("#4285F4");
  await page.getByLabel("Color Scheme", { exact: true }).selectOption("pastel");
  await expect(
    page.getByRole("textbox", { name: "Background hex color", exact: true }),
  ).toHaveValue("#FFF5F5");
  await page.getByLabel("Schematic Outlines", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Reset to Scheme Default", exact: true })
    .click();
  await expect(color).toHaveValue("#FFB5E8");
});
test("URL state restores topology, layout, theme, hidden categories, and partition legend", async ({
  page,
}) => {
  await ready(
    page,
    "/?platform=viperlite_pod&topo=16x16&layout=xy&theme=greyscale&hide=host,pcie&partition_mode=grid-of-rings&stack_axes=model:4,data:64&active_axis=model",
  );
  await expect(
    page.getByLabel("Torus (Wrap X-Y)", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Hosts", { exact: true })).not.toBeChecked();
  await expect(page.getByText("model axis", { exact: true })).toBeVisible();
  await expect(page).toHaveURL("http://127.0.0.1:5173/");
  await page.getByTitle("Color Settings", { exact: true }).click();
  await expect(page.getByLabel("Color Scheme", { exact: true })).toHaveValue(
    "greyscale",
  );
});
test("picking a TPU reveals its physical and logical coordinates; drag stops rotation", async ({
  page,
}) => {
  await ready(page, "/?platform=viperfish&topo=1x1x1&hide=host,pcie,node-base");
  await page.mouse.click(720, 465);
  await expect(page.getByTestId("selection")).toContainText("TPU [0,0,0]");
  await expect(page.getByTestId("selection")).toContainText(
    "seq: 0, model: 0, data: 0",
  );
  await page.mouse.click(1300, 100);
  await expect(page.getByText("Select an element...")).toBeVisible();
  await page.getByTitle("Start Auto-Rotate", { exact: true }).click();
  await page.mouse.move(900, 500);
  await page.mouse.down();
  await page.mouse.move(980, 540, { steps: 5 });
  await page.mouse.up();
  await expect(
    page.getByTitle("Start Auto-Rotate", { exact: true }),
  ).toBeVisible();
});
test("largest published slice and repeated topology switches render without exceptions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await ready(page, "/?platform=ghostfish&topo=16x16x32");
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-chips",
    "8192",
  );
  for (const label of ["4x4x8_twisted", "1x1x1", "4x4x4", "2x4x4"]) {
    await page.getByLabel("Topology", { exact: true }).selectOption({ label });
    await expect(page.getByTestId("topology-scene")).toHaveAttribute(
      "data-ready",
      "true",
    );
  }
  expect(errors).toEqual([]);
});
test("mobile controls fit and remain scrollable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  const box = await page.getByRole("complementary").boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: /Controls/ }).click();
  await page.getByTitle("Color Settings", { exact: true }).click();
  await page
    .getByRole("button", { name: "Reset to Scheme Default", exact: true })
    .scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Reset to Scheme Default", exact: true }),
  ).toBeVisible();
});
test("missing WebGL displays a usable fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Hardware Acceleration Missing" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "[Try Anyway]", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Hardware Acceleration Missing" }),
  ).toBeVisible();
});

for (const size of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
]) {
  test(`mobile sheet reserves scene space and preserves controls at ${size.width}px`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: size,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await ready(page);
    const toggle = page.getByRole("button", { name: /Controls/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(
      page.getByLabel("TPU version", { exact: true }),
    ).not.toBeVisible();
    const collapsed = await page.getByTestId("topology-scene").boundingBox();
    expect(collapsed!.height).toBeGreaterThan(size.height * 0.8);
    await toggle.tap();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const scene = await page.getByTestId("topology-scene").boundingBox();
    const panel = await page.getByRole("complementary").boundingBox();
    expect(scene!.y + scene!.height).toBeLessThanOrEqual(panel!.y + 1);
    expect(scene!.height).toBeGreaterThan(size.height * 0.4);
    await page.getByLabel("TPU version", { exact: true }).tap();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "TPU v6e", exact: true })
      .tap();
    await page.getByTitle("Color Settings", { exact: true }).tap();
    await page
      .getByLabel("Color Scheme", { exact: true })
      .selectOption("pastel");
    await page
      .getByRole("button", { name: "Reset to Scheme Default", exact: true })
      .scrollIntoViewIfNeeded();
    await page
      .getByRole("button", { name: "Reset to Scheme Default", exact: true })
      .tap();
    await toggle.tap();
    await toggle.tap();
    await expect(page.getByLabel("Color Scheme", { exact: true })).toHaveValue(
      "pastel",
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(size.width);
    await page.setViewportSize({ width: 844, height: 390 });
    const landscape = await page.getByTestId("topology-scene").boundingBox();
    const sidebar = await page.getByRole("complementary").boundingBox();
    expect(landscape!.x).toBeGreaterThanOrEqual(sidebar!.width);
    expect(landscape!.height).toBe(390);
    await toggle.tap();
    await page.getByTitle("Stop Auto-Rotate", { exact: true }).tap();
    await expect(
      page.getByTitle("Start Auto-Rotate", { exact: true }),
    ).toBeVisible();
    await context.close();
  });
}

test("mobile version picker opens on touch and selects a family", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await ready(page);
  await page.getByRole("button", { name: /Controls/ }).tap();
  const version = page.getByLabel("TPU version", { exact: true });
  await version.tap();
  const dialog = page.getByRole("dialog", {
    name: "Choose TPU version",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "TPU v6e", exact: true }).tap();
  await expect(dialog).not.toBeVisible();
  await expect(version).toHaveText("TPU v6e");
  await expect(page.getByLabel("Topology", { exact: true })).toHaveValue("5");
  await expect(page.getByTestId("topology-scene")).toHaveAttribute(
    "data-chips",
    "64",
  );
  await version.tap();
  await page.getByRole("button", { name: "Close TPU version" }).tap();
  await expect(version).toBeFocused();
  await version.tap();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await context.close();
});
