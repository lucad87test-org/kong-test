import { Page, Locator, expect } from '@playwright/test';
import { getTableDataMappedByHeaders, selectIntegrationByName } from '@/utils/general-helpers';

export class KongServiceCatalogIntegrationsPage {
    readonly page: Page;

    // Integration elements
    readonly pageHeaderTitle: Locator;
    readonly addIntegrationInstanceButton: Locator;
    readonly authorizeButton: Locator;
    readonly integrationDisplayNameInput: Locator;
    readonly integrationNameInput: Locator;
    readonly saveIntegrationInstanceButton: Locator;
    readonly integrationInstanceBadge: Locator;

    constructor(page: Page) {
        this.page = page;

        // Integration elements
        this.pageHeaderTitle = page.getByTestId('page-header-title');
        this.addIntegrationInstanceButton = page.getByTestId('add-integration-instance-button');
        this.authorizeButton = page.getByTestId('authorize-button');
        this.integrationDisplayNameInput = page.getByTestId('integration-display-name-input');
        this.integrationNameInput = page.getByTestId('integration-name-input');
        this.saveIntegrationInstanceButton = page.getByTestId('save-integration-instance-button');
        this.integrationInstanceBadge = page.locator('.integration-instance-about-card .badge-content .badge-content-wrapper span.badge-text');
    }

    async navigateToIntegrations() {
        await this.page.goto('service-catalog/integrations');
        await this.page.waitForLoadState('load');
    }

    async selectGitHubIntegration() {
        const githubCard = await selectIntegrationByName(this.page, 'GitHub');
        await expect(githubCard).toBeVisible();
        await expect(githubCard).toContainText('GitHub');
        await expect(githubCard).toContainText('Not Installed');
        
        await githubCard.click();
        return githubCard;
    }

    async verifyGitHubIntegrationPage(baseURL: string) {
        await expect(this.pageHeaderTitle).toContainText('GitHub');
        await expect(this.addIntegrationInstanceButton).toBeVisible();
        expect(this.page.url()).toBe(`${baseURL}service-catalog/integrations/github/instances`);
    }

    async createGitHubIntegration(): Promise<string> {
        await this.addIntegrationInstanceButton.click();
        
        await expect(this.pageHeaderTitle).toBeVisible();
        await expect(this.authorizeButton).toBeVisible();
        await expect(this.integrationDisplayNameInput).toBeVisible();
        await expect(this.integrationNameInput).toBeVisible();

        const githubIntegrationTitle = await this.pageHeaderTitle.textContent() || '';
        const match = githubIntegrationTitle.match(/Edit instance (.*)/);
        const githubIntegrationId = match ? match[1] : '';
        
        await expect(this.integrationDisplayNameInput).toHaveValue(githubIntegrationId);
        await expect(this.integrationNameInput).toHaveValue(githubIntegrationId.toLowerCase());

        return githubIntegrationId;
    }

    async authorizeGitHubIntegration(organizationName: string) {
        await this.authorizeButton.click();
        await expect(this.page.getByRole('heading', { name: 'Install Konnect Service' })).toBeVisible();

        await this.page.getByRole('link', { name: `@${organizationName}` }).click();
        await expect(this.page.getByRole('heading', { name: 'Install & Authorize Konnect' })).toBeVisible();
        await expect(this.page.getByRole('button', { name: 'Install & Authorize' })).toBeVisible();

        await this.page.getByRole('button', { name: 'Install & Authorize' }).click();
    }

    async saveIntegrationInstance(): Promise<string> {
        await this.saveIntegrationInstanceButton.click();
        await expect(this.integrationInstanceBadge).toHaveText('Authorized');
        
        const instanceId = this.page.url().split('/').pop() || '';
        return instanceId;
    }

    async verifyGitHubResourceInTable(repositoryName: string, githubIntegrationId: string) {
        const tableData = await getTableDataMappedByHeaders(this.page);
        expect(tableData.length).toBeGreaterThan(0);

        const ourGithubRepo = tableData.find(row => row['GitHub Repository'] === repositoryName);
        const currentDate = new Date();

        if (ourGithubRepo) {
            expect(ourGithubRepo['GitHub Repository']).toBe(repositoryName);
            expect(ourGithubRepo['Description']).toBe('-');
            expect(ourGithubRepo['Resource Type']).toBe('Repository');
            expect(ourGithubRepo['Instance']).toBe(githubIntegrationId);
            expect(ourGithubRepo['Resource Status']).toBe('Unmapped');

            const ingestDate = new Date(ourGithubRepo['Ingested Date']);
            expect(ingestDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(ingestDate.getMonth()).toBe(currentDate.getMonth());
            expect(ingestDate.getDay()).toBe(currentDate.getDay());
        }
    }
}
