import { test, expect } from "@playwright/test";

test("renders the login page with phone input", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { name: "Welcome Back" })).toBeVisible();
  await expect(page.getByLabel("Phone Number")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send Verification Code" })
  ).toBeVisible();
});

test("rejects empty phone number with client-side validation", async ({ page }) => {
  await page.goto("/login");

  await page.getByRole("button", { name: "Send Verification Code" }).click();
  await expect(page.getByText("Phone number is required")).toBeVisible();
});

test("formats the phone number as the user types", async ({ page }) => {
  await page.goto("/login");

  const phone = page.getByLabel("Phone Number");
  await phone.fill("912345678");
  await expect(phone).toHaveValue("9-12-34-56-78");
});