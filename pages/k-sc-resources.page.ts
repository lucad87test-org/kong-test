import { Page, Locator, expect } from '@playwright/test';
import { getTableDataMappedByHeaders } from '@/utils/general-helpers';

export class KongServiceCatalogResourcesPage {
    readonly page: Page;

    // Resource elements
    readonly pageHeaderTitle: Locator;
    readonly slideoutContainer: Locator;
    readonly slideoutTitle: Locator;
    readonly mapServiceActionButton: Locator;
    readonly resourceActionModal: Locator;
    readonly selectInput: Locator;
    readonly modalActionButton: Locator;

    constructor(page: Page) {
        this.page = page;

        // Resource elements
        this.pageHeaderTitle = page.getByTestId('page-header-title');
        this.slideoutContainer = page.getByTestId('slideout-container');
        this.slideoutTitle = page.getByTestId('slideout-title');
        this.mapServiceActionButton = page.getByTestId('map-service-action-button');
        this.resourceActionModal = page.getByTestId('resource-action-modal');
        this.selectInput = page.getByTestId('select-input');
        this.modalActionButton = page.getByTestId('modal-action-button');
    }

    async navigateToResources() {
        await this.page.goto('service-catalog/resources/resources-list');
        await this.page.waitForLoadState('load');
        await expect(this.pageHeaderTitle).toContainText('Resources');
    }

    async verifyResourceInResourcesTable(resourceName: string, githubIntegrationId: string) {
        const tableData = await getTableDataMappedByHeaders(this.page);
        expect(tableData.length).toBeGreaterThan(0);

        const ourGithubResource = tableData.find(row => row['Resource Name'] === resourceName);
        const currentDate = new Date();

        if (ourGithubResource) {
            expect(ourGithubResource['Resource Name']).toBe(resourceName);
            expect(ourGithubResource['Resource Type']).toBe('Repository');
            expect(ourGithubResource['Instance']).toBe(githubIntegrationId);
            expect(ourGithubResource['Resource Status']).toBe('Unmapped');

            const ingestDate = new Date(ourGithubResource['Ingested Date']);
            expect(ingestDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(ingestDate.getMonth()).toBe(currentDate.getMonth());
            expect(ingestDate.getDay()).toBe(currentDate.getDay());
        }
    }

    async openResourceDetails(resourceName: string) {
        await this.page.locator(`[data-testid=resource-name-cell][title=${resourceName}]`).click();
        await expect(this.slideoutContainer).toBeVisible();
        await expect(this.slideoutTitle).toContainText(resourceName);
        await expect(this.mapServiceActionButton).toBeVisible();

        const integrationId = await this.page.locator('.slideout-content .integration-details .copy-text').textContent() || '';
        return integrationId;
    }

    async mapResourceToService(serviceId: string, serviceName: string, integrationId: string) {
        await this.mapServiceActionButton.click();
        await expect(this.resourceActionModal.locator('div').filter({ hasText: 'Map Resource' }).nth(2)).toBeVisible();
        await expect(this.selectInput).toBeVisible();

        await this.selectInput.click();
        await expect(this.page.locator(`.modal-content .select-item-container button[value='${serviceId}']`)).toBeVisible();

        await this.page.locator(`.modal-content .select-item-container button[value='${serviceId}']`).click();
        await expect(this.selectInput).toHaveValue(serviceName);
        await expect(this.modalActionButton).toBeVisible();

        // Intercept the API response
        const addResourcePromise = this.page.waitForResponse(`https://eu.api.konghq.com/servicehub/v1/resources/${integrationId}/services`);
        await this.modalActionButton.click();
        const addResourceResponse = await addResourcePromise;
        expect(addResourceResponse.status()).toBe(201);
    }

    async verifyResourceMappedStatus(resourceName: string) {
        const updatedTableData = await getTableDataMappedByHeaders(this.page);
        expect(updatedTableData.length).toBeGreaterThan(0);

        const updatedResource = updatedTableData.find(row => row['Resource Name'] === resourceName);
        if (updatedResource) {
            expect(updatedResource['Resource Status']).toBe('1 Service');
        }
    }
}
