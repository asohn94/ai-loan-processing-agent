import { expect, test, type Page } from '@playwright/test';

async function openComposer(page: Page) {
  await page.getByRole('button', { name: 'Request Missing Documents', exact: true }).click();
  const composer = page.getByRole('dialog', { name: 'New message' });
  await expect(composer.getByLabel('To', { exact: true })).toHaveValue('johnsmith@gmail.com');
  await expect(composer.getByLabel('Message body')).toHaveValue(/Tax return/);
  return composer;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Close welcome message' }).click();
  await expect(page.getByLabel('Fictional applicant')).toHaveValue('0');
});

test('Send closes the composer and remembers the simulated request after navigation and refresh', async ({ page }) => {
  const composer = await openComposer(page);
  await composer.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(composer).toBeHidden();
  await expect(page.getByText('Document request sent successfully.')).toBeVisible();
  await expect(page.getByText('Simulated send · No email was sent.')).toBeVisible();

  const sent = page.getByRole('button', { name: 'Request Sent', exact: true });
  await expect(sent).toBeDisabled();
  await expect(sent.locator('svg.lucide-check')).toBeVisible();
  await expect(page.getByRole('heading', {
    name: 'The agent identified missing documentation and the document request has been sent. Awaiting client response.',
  })).toBeVisible();
  await expect(page.getByText('Tax return — Missing', { exact: true })).toBeVisible();

  const nav = page.getByRole('navigation', { name: 'Workspace navigation' });
  await nav.getByRole('button', { name: 'Affordability' }).click();
  await expect(sent).toBeDisabled();

  const applicant = page.getByLabel('Fictional applicant');
  await applicant.selectOption({ label: 'Jane Doe' });
  await expect(page.getByRole('button', { name: 'Go to Human Review', exact: true })).toBeEnabled();
  await applicant.selectOption({ label: 'John Smith' });
  await expect(sent).toBeDisabled();

  await page.reload();
  await expect(sent).toBeDisabled();
  await expect(page.getByText('Tax return — Missing', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Request Missing Documents', exact: true })).toHaveCount(0);
});

test('closing the composer leaves the application ready to request documents', async ({ page }) => {
  const composer = await openComposer(page);
  await composer.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(composer).toBeHidden();
  const request = page.getByRole('button', { name: 'Request Missing Documents', exact: true });
  await expect(request).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Request Sent', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(request).toBeEnabled();
});
