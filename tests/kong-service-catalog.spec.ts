import { test, expect } from '@playwright/test';
import { apiKonnectDeleteInstance, apiKonnectDeleteService, apiKonnectDeleteLeftovers } from '@/api/konnect';
import { konnectLogin, githubLogin } from '@/utils/login-helpers';
import { githubDeleteApplication } from '@/utils/github-helpers';
import { KongServiceCatalogServicesPage } from '@/pages/k-sc-services.page';
import { KongServiceCatalogIntegrationsPage } from '@/pages/k-sc-integrations.page';
import { KongServiceCatalogResourcesPage } from '@/pages/k-sc-resources.page';
import { accountDetails } from '@/config/account-details';

test.describe('Kong Service Catalog', () => {
    let githubIntegrationId: string;
    let serviceId: string;
    let instanceId: string;

    test.beforeAll(async ({ browser, request }) => {
        const page = await browser.newPage();
        const isGitHubAppDeleted = await githubDeleteApplication(page);
        // console.log('Found GitHub application to delete:', isGitHubAppDeleted);
        await page.close();
        
        const {services, instances } = await apiKonnectDeleteLeftovers(request);
        // console.log('Deleted services:', services);
        // console.log('Deleted instances:', instances);
    });

    test.afterAll(async ({ browser, request }) => {
        const page = await browser.newPage();
        await apiKonnectDeleteService(request, serviceId);
        await apiKonnectDeleteInstance(request, instanceId);
        await githubDeleteApplication(page);
    });

    test('Add GitHub Integration', async ({ page, baseURL }) => {
        const servicesPage = new KongServiceCatalogServicesPage(page);
        const integrationsPage = new KongServiceCatalogIntegrationsPage(page);
        const resourcesPage = new KongServiceCatalogResourcesPage(page);

        // Navigate to the Konnect login page
        await page.goto(accountDetails.kong.signInUrl, { waitUntil: 'networkidle' });
        await konnectLogin(page);

        // Navigate to the Konnect Service Catalog page
        await servicesPage.navigateToServiceCatalog();
        await servicesPage.verifyNavigationElements(accountDetails.kong.orgName, accountDetails.kong.region);

        // open a new tab to the GitHub Organization Applications page
        const githubPage = await page.context().newPage();
        await githubPage.goto(accountDetails.github.installationsUrl, { waitUntil: 'networkidle' });

        if (githubPage.url().includes('github.com/login')) {
            await expect(githubPage.getByRole('heading', { name: 'Sign in to GitHub' })).toBeVisible();
            await githubLogin(githubPage);
        }

        await expect(githubPage.getByLabel(`${accountDetails.github.orgName} settings`).getByRole('link', { name: accountDetails.github.orgName })).toBeVisible();
        await expect(githubPage.getByRole('heading', { name: 'Installed GitHub Apps', exact: true })).toBeVisible();
        await expect(githubPage.getByRole('heading', { name: 'No installed GitHub Apps' })).toBeVisible();

        // switch back to the main page (Konnect UI - Service Catalog)
        await servicesPage.page.bringToFront();

        // Add a new Service Catalog entity
        serviceId = await servicesPage.createService(accountDetails.kong.serviceName);

        // Verify that the service ID is displayed in the service catalog
        await servicesPage.verifyServiceId(serviceId);

        // navigate to service catalog landing page
        await servicesPage.navigateToServiceCatalog();

        // Verify our specific service in the table data
        await servicesPage.verifyServiceInTable(accountDetails.kong.serviceName, serviceId);

        // navigate to service catalog - integrations page
        await integrationsPage.navigateToIntegrations();

        // open the integration card for GitHub
        await integrationsPage.selectGitHubIntegration();

        await integrationsPage.verifyGitHubIntegrationPage(baseURL!);

        // Add a new GitHub integration instance
        githubIntegrationId = await integrationsPage.createGitHubIntegration();

        await integrationsPage.authorizeGitHubIntegration(accountDetails.github.orgName);

        instanceId = await integrationsPage.saveIntegrationInstance();

        await integrationsPage.verifyGitHubResourceInTable(`${accountDetails.github.orgName}/${accountDetails.github.repoName}`, githubIntegrationId);
        

        // Nagivate to Resources page
        await resourcesPage.navigateToResources();
        
        await resourcesPage.verifyResourceInResourcesTable(accountDetails.github.repoName, githubIntegrationId);

        const integrationId = await resourcesPage.openResourceDetails(accountDetails.github.repoName);

        await resourcesPage.mapResourceToService(serviceId, accountDetails.kong.serviceName, integrationId);

        // Navigate back to Resources page
        await resourcesPage.navigateToResources();

        // update the table data after mapping the resource
        await resourcesPage.verifyResourceMappedStatus(accountDetails.github.repoName);
    });
});
