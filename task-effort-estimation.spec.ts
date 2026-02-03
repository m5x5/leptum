import { test, expect } from '@playwright/test';

test('task effort estimation feature', async ({ page }) => {
  // Navigate to the app
  await page.goto('http://localhost:3000');

  // Wait for the page to load
  await page.waitForSelector('text=Add Task');

  // Click the Add Task button
  await page.click('text=Add Task');

  // Fill in task details including effort estimates
  await page.fill('input[placeholder="Enter task name..."]', 'Test Task with Effort');
  await page.fill('input[placeholder="Enter description..."]', 'A test task for effort estimation');

  // Select effort size
  await page.selectOption('select[id="task-effort"]', 'M');

  // Enter numeric estimate
  await page.fill('input[id="task-numeric-estimate"]', '3.5');

  // Submit the form
  await page.click('button:has-text("Add Task")');

  // Verify the task appears with effort badges
  await expect(page.locator('text=Test Task with Effort')).toBeVisible();
  await expect(page.locator('text=M')).toBeVisible(); // Effort badge
  await expect(page.locator('text=3.5')).toBeVisible(); // Numeric estimate badge

  // Test editing the task
  await page.click('[title="Task actions"]'); // Click the dots menu
  await page.click('text=Edit');

  // Update effort estimates
  await page.selectOption('select', 'L'); // Change effort size
  await page.fill('input[placeholder="e.g., 2.5"]', '5.0'); // Change numeric estimate

  // Save changes
  await page.click('button:has-text("Save")');

  // Verify updated effort estimates
  await expect(page.locator('text=L')).toBeVisible();
  await expect(page.locator('text=5')).toBeVisible();

  // Mark task as complete to test velocity tracking
  await page.click('input[type="checkbox"]'); // Check the task

  // Verify task is marked complete
  await expect(page.locator('text=Test Task with Effort')).toHaveClass(/line-through/);
});