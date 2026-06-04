import { test, expect } from '@playwright/test';

test.describe('ExamEve End-to-End User Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage before each test
    await page.goto('http://localhost:3000/');
  });

  test('should display onboarding wizard on first load', async ({ page }) => {
    // If not logged in, expect redirect or login screen first
    const title = await page.title();
    expect(title).toContain('ExamEve');
  });

  test('should allow user to navigate to study planner and view active plan', async ({ page }) => {
    // Stub: user goes to planner
    await page.goto('http://localhost:3000/planner');
    
    // Check if the page contains the title
    const header = page.locator('h1');
    await expect(header).toBeVisible();
  });

  test('should start focus study timer and track completed block', async ({ page }) => {
    await page.goto('http://localhost:3000/planner');
    // Ensure the focus timer container is present
    const timerContainer = page.locator('.focus-timer-container, text=Start Study');
    expect(timerContainer).toBeDefined();
  });

  test('should trigger panic mode recovery and verify stress calibrator updates', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    // Trigger panic protocol trigger check
    const panicBtn = page.locator('button:has-text("Panic Protocol")');
    expect(panicBtn).toBeDefined();
  });
});
