import { test, expect } from "@playwright/test";
import { mockAudio, openTuning } from "./audio-fixture";
test.beforeEach(async ({ page }) => {
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await mockAudio(page);
  await page.goto("./");
});
test("starts idle with accessible meter and all strings", async ({ page }) => {
  await expect(page.locator("#state")).toHaveText("Microphone off");
  await expect(
    page.getByRole("meter", { name: "Pitch offset in cents" }),
  ).toHaveAttribute("aria-valuetext", "No reading");
  await expect(page.locator(".str")).toHaveCount(6);
  await expect(page.locator("#target")).toHaveText("82.41 Hz");
});
test("fits the viewport and preserves responsive string layout", async ({
  page,
}) => {
  const width = page.viewportSize()!.width;
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(width);
  const first = await page.locator(".str").nth(0).boundingBox(),
    fourth = await page.locator(".str").nth(3).boundingBox();
  expect(first).not.toBeNull();
  expect(fourth).not.toBeNull();
  if (width < 640) expect(fourth!.y).toBeGreaterThan(first!.y);
  else expect(fourth!.y).toBe(first!.y);
  await expect(page.locator("#tuning-toggle")).toHaveAttribute(
    "aria-expanded",
    width >= 960 ? "true" : "false",
  );
});
test("changes preset, restores settings and chooses strings manually", async ({
  page,
}) => {
  await openTuning(page);
  await page
    .locator("label.row")
    .filter({ has: page.locator('input[value="drop-d"]') })
    .click();
  await expect(page.locator("#note")).toHaveText("D2");
  await page.locator(".str").nth(1).click();
  await expect(page.locator("#note")).toHaveText("A2");
  await expect(page.locator("#auto")).not.toBeChecked();
  await page.reload();
  await expect(page.locator("#note")).toHaveText("A2");
  await expect(page.locator(".js-name").first()).toHaveText("Drop D");
  await page.locator("label.check").click();
  await expect(page.locator("#auto")).toBeChecked();
});
test("processes synthetic audio through YIN and announces tuning transitions", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Start microphone", exact: true })
    .click();
  await expect(page.locator("#state")).toHaveText("In tune");
  await expect(page.locator("#heard")).toHaveText("82.41 Hz");
  await expect(page.locator("#announce")).toContainText("E2 in tune");
  await page.evaluate(() => {
    window.testAudio.frequency = 82.4069 * 2 ** (-15 / 1200);
  });
  await expect(page.locator("#state")).toHaveText("Flat");
  await page.evaluate(() => {
    window.testAudio.frequency = 82.4069 * 2 ** (15 / 1200);
  });
  await expect(page.locator("#state")).toHaveText("Sharp");
  await page.evaluate(() => {
    window.testAudio.amplitude = 0;
  });
  await expect(page.locator("#state")).toHaveText("Listening");
  await page
    .getByRole("button", { name: "Stop microphone", exact: true })
    .click();
  await expect(page.locator("#heard")).toHaveText("—");
  expect(await page.evaluate(() => window.testAudio.stops)).toBe(1);
});
test("automatic selection follows a new stable string", async ({ page }) => {
  await page.evaluate(() => {
    window.testAudio.frequency = 110;
  });
  await page.locator("#mic").click();
  await expect(page.locator("#note")).toHaveText("A2");
  await expect(page.locator("#state")).toHaveText("In tune");
  await page.locator(".str").nth(0).click();
  await expect(page.locator("#note")).toHaveText("E2");
  await expect(page.locator("#auto")).not.toBeChecked();
});
test("suppresses an octave-ambiguous reading without changing selection", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAudio.frequency = 164.81;
  });
  await page.locator("#mic").click();
  await page.waitForTimeout(600);
  await expect(page.locator("#note")).toHaveText("E2");
  await expect(page.locator("#state")).toHaveText("Listening");
  await expect(
    page.getByRole("meter", { name: "Pitch offset in cents" }),
  ).toHaveAttribute("aria-valuetext", "No reading");
  await expect(page.locator("#heard")).toHaveText("—");
  await openTuning(page);
  await page.getByText("Custom", { exact: true }).click();
  await page.waitForTimeout(700);
  await expect(page.locator("#rec")).toBeDisabled();
  await expect(page.locator("#step-now")).not.toContainText("164.81");
});
test("records a custom reference at the meter and invalidates it on base changes", async ({
  page,
}) => {
  await openTuning(page);
  await page.getByText("Custom", { exact: true }).click();
  await expect(page.locator("#auto")).toBeDisabled();
  await expect(page.locator("#rec")).toBeDisabled();
  if (page.viewportSize()!.width < 960)
    await expect(page.locator("#tuning-panel")).not.toBeVisible();
  await page.locator("#custom-string").selectOption("1");
  await expect(page.locator("#note")).toHaveText("A2");
  await page.locator("#custom-string").selectOption("0");
  await page.evaluate(() => {
    window.testAudio.frequency = 80;
  });
  await page.locator("#mic").click();
  await expect(page.locator("#rec")).toBeEnabled();
  await page.locator("#rec").click();
  await expect(page.locator("#target")).toHaveText("80.00 Hz");
  await expect(page.locator("#auto")).toBeEnabled();
  await expect(page.locator("#step-now")).toContainText("Step 4 of 4");
  await page.reload();
  await expect(page.locator("#target")).toHaveText("80.00 Hz");
  await openTuning(page);
  await page.locator("#base").selectOption("open-d");
  await expect(page.locator("#clr")).toBeDisabled();
  await expect(page.locator("#auto")).toBeDisabled();
});
test("clears a custom reference and pauses analysis during a tone", async ({
  page,
}) => {
  await openTuning(page);
  await page.getByText("Custom", { exact: true }).click();
  await page.locator("#mic").click();
  await expect(page.locator("#rec")).toBeEnabled();
  await page.locator("#rec").click();
  await page.locator("#clr").click();
  await expect(page.locator("#auto")).toBeDisabled();
  await page.locator("#tonebtn").click();
  await expect(page.locator("#state")).toHaveText("Playing E2 tone");
  await expect(page.locator("#rec")).toBeDisabled();
  await expect(page.locator("#heard")).toHaveText("—");
  await page.getByRole("button", { name: "Stop tone", exact: true }).click();
  await expect(page.locator("#rec")).toBeEnabled();
});
test("reports permission denial and succeeds on retry", async ({ page }) => {
  await page.evaluate(() => {
    window.testAudio.denied = true;
  });
  await page.locator("#mic").click();
  await expect(page.getByRole("alert")).toContainText("denied");
  await expect(page.locator("#mic")).toHaveText("Start microphone");
  await page.evaluate(() => {
    window.testAudio.denied = false;
  });
  await page.locator("#mic").click();
  await expect(page.locator("#state")).toHaveText("In tune");
  await expect(page.getByRole("alert")).not.toBeVisible();
});
test("cancels a pending permission request and disposes its late stream", async ({
  page,
}) => {
  await page.evaluate(() => {
    window.testAudio.pending = true;
  });
  await page.locator("#mic").click();
  await expect(page.locator("#mic")).toHaveText("Cancel microphone request");
  await page.locator("#mic").click();
  await page.evaluate(() => window.testAudio.resolvePermission?.());
  await expect.poll(() => page.evaluate(() => window.testAudio.stops)).toBe(1);
  await expect(page.locator("#state")).toHaveText("Microphone off");
});
test("supports keyboard string selection and native radio navigation", async ({
  page,
}) => {
  await page.locator(".str").nth(2).focus();
  await page.locator(".str").nth(2).press("Enter");
  await expect(page.locator("#note")).toHaveText("D3");
  await openTuning(page);
  await page.locator("input[name=mode][value=preset]").focus();
  await page.locator("input[name=mode][value=preset]").press("ArrowRight");
  await expect(page.locator("#custom-strip")).toBeVisible();
});
test("rejects corrupt persisted state without crashing", async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem(
      "aporia-tuner",
      '{"mode":"oops","sel":2.5,"ref":{"i":9,"f":-1}}',
    ),
  );
  await page.reload();
  await expect(page.locator("#note")).toHaveText("E2");
  await expect(page.locator("#state")).toHaveText("Microphone off");
});
test("labels simulations and never persists their reference", async ({
  page,
}) => {
  await page.goto("./?state=in");
  await expect(page.locator("#prov")).toHaveText("Simulation");
  await expect(page.locator("#state")).toHaveText("In tune");
  await openTuning(page);
  await page.getByText("Custom", { exact: true }).click();
  await expect(page.locator("#rec")).toBeDisabled();
});
test("automatically cleans up reference-tone playback", async ({ page }) => {
  await page.locator("#tonebtn").click();
  await expect(page.locator("#tonebtn")).toHaveText("Stop tone");
  await expect(page.locator("#tonebtn")).toHaveText("Play E2 tone", {
    timeout: 6000,
  });
  expect(await page.evaluate(() => window.testAudio.closes)).toBe(1);
});
