import { expect, Page } from '@playwright/test';

const loginConstants = {
    auth0Instance: 'dev-d3rsvpl2fqxk1poj',
    konnectOrgSsoLoginPath: 'okta-login-d3rsvpl2fqxk1poj',
};

const USERNAME = process.env.USERNAME || '';
const PASSWORD = process.env.PASSWORD || '';

async function auth0Login(auth0Page: Page) {
    expect(auth0Page.url()).toContain(`${loginConstants.auth0Instance}.eu.auth0.com/u/login`);
    await expect(auth0Page.locator('header')).toContainText(`Log in to ${loginConstants.auth0Instance} to continue to Kong App.`);
    await expect(auth0Page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(auth0Page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(auth0Page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();

    await auth0Page.getByRole('textbox', { name: 'Email address' }).fill(USERNAME);
    await auth0Page.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await auth0Page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function konnectLogin(page: Page) {
    await page.getByRole('button', { name: 'Continue with SSO' }).click();
    await expect(page.getByRole('heading', { name: 'Company SSO' })).toBeVisible();
    await expect(page.getByTestId('signin-page-form-layout').locator('div').filter({ hasText: 'Company SSOEnter your' }).first()).toBeVisible();
    await expect(page.getByTestId('organization-sso-login-submit-button')).toHaveAttribute('disabled');

    await page.getByTestId('organization-login-path-input').fill(loginConstants.konnectOrgSsoLoginPath);
    await expect(page.getByTestId('organization-sso-login-submit-button')).not.toHaveAttribute('disabled');

    await page.getByTestId('organization-sso-login-submit-button').click();
    await page.waitForLoadState('networkidle');
    
    await auth0Login(page);

    await page.getByTestId('kong-ui-konnect-app-shell-region-select-input').click();
    await page.getByTestId('select-item-eu').click();
    await expect(page.getByTestId('kong-ui-konnect-app-shell-region-select-input')).toHaveValue('EU (Europe)');
    await page.getByTestId('kong-ui-konnect-app-shell-region-select-submit').click();

    await page.waitForResponse(response => response.status() === 202);
}

async function githubLogin(githubPage: Page) {
    await githubPage.getByRole('textbox', { name: 'Username or email address' }).fill(USERNAME);
    await githubPage.getByRole('textbox', { name: 'Password' }).fill(PASSWORD);
    await githubPage.getByRole('button', { name: 'Sign in', exact: true }).click();

    // TODO: Eventually, add the 2FA step if required
}

export { konnectLogin, githubLogin };