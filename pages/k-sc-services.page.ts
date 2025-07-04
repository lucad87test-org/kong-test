import { Page, Locator, expect, APIRequest } from '@playwright/test';
import { getTableDataMappedByHeaders } from '@/utils/general-helpers';

export class KongServiceCatalogServicesPage {
    readonly page: Page;

    // Navigation elements
    readonly kongKonnectLink: Locator;
    readonly dropdownTriggerButton: Locator;
    readonly sidebarServicesItem: Locator;
    readonly organizationName: Locator;
    readonly moreRegionsLabel: Locator;

    // Service creation elements
    readonly entityCreateButton: Locator;
    readonly serviceFullscreenForm: Locator;
    readonly serviceDisplayName: Locator;
    readonly serviceName: Locator;
    readonly serviceSubmitButton: Locator;

    // Service details elements
    readonly pageHeaderBreadcrumbs: Locator;
    readonly serviceActionsDropdown: Locator;
    readonly aboutSectionContent: Locator;
    readonly overviewLabel: Locator;
    readonly mapResourcesButton: Locator;
    readonly copyTooltipWrapper: Locator;

    constructor(page: Page) {
        this.page = page;

        // Navigation elements
        this.kongKonnectLink = page.getByRole('link', { name: 'Kong Konnect' });
        this.dropdownTriggerButton = page.getByTestId('dropdown-trigger-button');
        this.sidebarServicesItem = page.getByTestId('sidebar-item-services');
        this.organizationName = page.getByTestId('organization-name');
        this.moreRegionsLabel = page.getByLabel('More regions');

        // Service creation elements
        this.entityCreateButton = page.getByTestId('entity-create-button');
        this.serviceFullscreenForm = page.getByTestId('service-fullscreen-form');
        this.serviceDisplayName = page.getByTestId('service-display-name');
        this.serviceName = page.getByTestId('service-name');
        this.serviceSubmitButton = page.getByTestId('service-submit-button');

        // Service details elements
        this.pageHeaderBreadcrumbs = page.getByTestId('page-header-breadcrumbs');
        this.serviceActionsDropdown = page.getByTestId('service-actions-dropdown');
        this.aboutSectionContent = page.getByTestId('about-section-content');
        this.overviewLabel = page.getByLabel('Overview');
        this.mapResourcesButton = page.getByRole('button', { name: 'Map Resources' });
        this.copyTooltipWrapper = page.getByTestId('copy-tooltip-wrapper');
    }

    async navigateToServiceCatalog() {
        await this.page.goto('service-catalog');

        const res = await this.page.waitForResponse(res => 
            !!res.url().match(/https:\/\/global\.api\.konghq\.com\/v1\/notifications\/inbox/) && 
            res.status() === 200
        );
        const responseBody = await res.json();

        // console.log('Response from notifications inbox:', responseBody);
    }

    async verifyNavigationElements(organizationName: string, region: string) {
        await expect(this.kongKonnectLink).toBeVisible();
        await expect(this.dropdownTriggerButton).toBeVisible();
        await expect(this.sidebarServicesItem).toHaveClass(/active/);
        await expect(this.organizationName).toContainText(organizationName);
        await expect(this.moreRegionsLabel).toContainText(region);
    }

    async createService(serviceName: string): Promise<string> {
        await expect(this.entityCreateButton).toBeVisible();
        await this.entityCreateButton.click();
        
        await expect(this.serviceFullscreenForm).toContainText('Create Service');
        
        await this.serviceDisplayName.click();
        await this.serviceDisplayName.fill(serviceName);
        await expect(this.serviceName).toHaveValue(serviceName);
        
        await this.serviceSubmitButton.click();
        
        // Verify service creation
        await expect(this.pageHeaderBreadcrumbs.getByRole('link', { name: 'Service Catalog' })).toBeVisible();
        await expect(this.serviceActionsDropdown).toBeVisible();
        await expect(this.aboutSectionContent.getByText(serviceName)).toBeVisible();
        await expect(this.overviewLabel).toContainText('No Resources Yet');
        await expect(this.mapResourcesButton).toBeVisible();

        // Extract and return service ID from URL
        const serviceId = this.page.url().match(/service-catalog\/([0-9a-f-]+)/)?.[1] || '';
        return serviceId;
    }

    async verifyServiceId(serviceId: string) {
        await this.copyTooltipWrapper.hover();
        await expect(this.page.locator('.popover-content').locator('div').filter({ hasText: serviceId })).toBeVisible();
    }

    async getServiceTableData() {
        await this.page.waitForSelector('table.table', { state: 'visible', timeout: 30000 });
        return await getTableDataMappedByHeaders(this.page);
    }

    async verifyServiceInTable(serviceName: string, serviceId: string) {
        const tableData = await this.getServiceTableData();
        expect(tableData.length).toBeGreaterThan(0);

        const ourService = tableData.find(row => row['Service'] === serviceName);
        const currentDate = new Date();

        if (ourService) {
            expect(ourService['Service']).toBe(serviceName);
            expect(ourService['ID']).toMatch(/[a-f0-9]+\.\.\./);
            
            const serviceIdInitialPart = serviceId.substring(0, 8);
            expect(ourService['ID']).toContain(serviceIdInitialPart);
            
            expect(ourService['Resources']).toBe('0');
            
            const createdAtDate = new Date(ourService['Created at']);
            const updatedAtDate = new Date(ourService['Updated at']);
            
            expect(createdAtDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(createdAtDate.getMonth()).toBe(currentDate.getMonth());
            expect(createdAtDate.getDay()).toBe(currentDate.getDay());
            
            expect(updatedAtDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(updatedAtDate.getMonth()).toBe(currentDate.getMonth());
            expect(updatedAtDate.getDay()).toBe(currentDate.getDay());
        }
    }
}
