import { Page, expect } from '@playwright/test';
import { githubLogin } from '@/utils/login-helpers';
import { accountDetails } from '@/config/account-details';


async function githubDeleteApplication(page: Page) {
    await page.goto(accountDetails.github.installationsUrl);

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    if (page.url().includes('github.com/login')) {
        await expect(page.getByRole('heading', { name: 'Sign in to GitHub' })).toBeVisible();

        await githubLogin(page);
    }

    const installedApp = page.getByText(accountDetails.github.appName);
    if (!(await installedApp.isVisible())) {
        return false;
    }

    await expect(page.getByText(`${accountDetails.github.appName} Configure`)).toBeVisible();
    await expect(page.getByText(accountDetails.github.appName)).toBeVisible();
    await page.getByRole('link', { name: 'Configure' }).click();

    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    await page.locator('.btn[value=Uninstall]').click();

    await page.reload();

    await expect(page.locator('h2.blankslate-heading')).toContainText('No installed GitHub Apps');
    return true;
}

export { githubDeleteApplication };