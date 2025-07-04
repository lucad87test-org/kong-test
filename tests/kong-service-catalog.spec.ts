import { test, expect, Page, APIRequestContext } from '@playwright/test';

// Function to extract table data with headers mapped to values
async function getTableDataMappedByHeaders(page: Page) {
  // Wait to ensure table is loaded
  await page.waitForSelector('table.table', { state: 'visible' });
  
  // Debug: count tables and rows
  //   const tableCount = await page.$$eval('table.table', tables => tables.length);
  //   const rowCount = await page.$$eval('table.table tbody tr', rows => rows.length);
  //   console.log(`Found ${tableCount} tables with ${rowCount} total rows`);
  
  // First get all header titles
  const headers = await page.$$eval('table.table th', (thElements) => {
    return thElements.map((th) => {
      // Get the header label text
      const labelElement = th.querySelector('.table-header-label');
      const text = labelElement?.textContent?.trim() || '';
      return text === 'actions' ? 'actions' : text;
    });
  });
  
  //   console.log('Found headers:', headers);

  // Get all rows
  const rowsData = await page.$$eval('table.table tbody tr', (rows, headers) => {
    // console.log(`Processing ${rows.length} rows with ${headers.length} headers`);
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData: Record<string, string> = {};
      
      // Map each cell to its corresponding header
      cells.forEach((cell, index) => {
        if (index < headers.length) {
          const header = headers[index];
          // Extract text content - handling specific cell formats
          let cellValue = '';
          
          // Handle service name
          if (cell.querySelector('.service-name')) {
            cellValue = cell.querySelector('.service-name')?.textContent || '';
          }
          // Handle ID with copy functionality
          else if (cell.querySelector('.copy-text')) {
            cellValue = cell.querySelector('.copy-text')?.textContent || '';
          }
          // Handle standard text cells
          else {
            cellValue = cell.textContent?.trim() || '';
          }
          
          rowData[header] = cellValue;
        }
      });
      
      return rowData;
    });
  }, headers);

  return rowsData;
}

// Function to select a specific integration card by name with scrolling support
async function selectIntegrationByName(page: Page, name: string) {
  //   console.log(`Looking for integration card: "${name}"`);
  
  // Try to find the card directly first
  const cardLocator = page.locator(`.k-card.integration-card:has(.integration-name:text-is("${name}"))`);
  
  // Check if the card exists
  const count = await cardLocator.count();
  if (count === 0) {
    // If not found, scroll through the page to look for it
    // console.log(`Integration "${name}" not immediately visible, scrolling to find it...`);
    
    let foundCard = false;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;
    
    while (!foundCard && scrollAttempts < maxScrollAttempts) {
      // Scroll down
      await page.evaluate(() => {
        window.scrollBy(0, 500);
      });
      
      // Wait a moment for content to load/render
      await page.waitForTimeout(300);
      
      // Check if card is now visible
      const newCount = await cardLocator.count();
      if (newCount > 0) {
        foundCard = true;
        // console.log(`Found "${name}" integration card after scrolling`);
      }
      
      scrollAttempts++;
    }
    
    if (!foundCard) {
      // Get all available cards for better error reporting
      const availableCards = await page.$$eval('.integration-name', elements => 
        elements.map(el => el.textContent)
      );
      
      // console.error(`Integration card "${name}" not found after scrolling. Available integrations: ${availableCards.join(', ')}`);
      throw new Error(`Integration card "${name}" not found after scrolling`);
    }
  }
  
  // Make sure the card is in view before clicking
  await cardLocator.scrollIntoViewIfNeeded();
  
    // Click the card
    //   console.log(`Clicking on "${name}" integration card`);
    //   await cardLocator.click();
  
  return cardLocator;
}

async function auth0Login(auth0Page: Page) {
    // Verify that the Auth0 login page is displayed
    expect(auth0Page.url()).toContain('dev-d3rsvpl2fqxk1poj.eu.auth0.com/u/login');
    await expect(auth0Page.locator('header')).toContainText('Log in to dev-d3rsvpl2fqxk1poj to continue to Kong App.');
    await expect(auth0Page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
    await expect(auth0Page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(auth0Page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();

    // Fill in the email and password fields
    await auth0Page.getByRole('textbox', { name: 'Email address' }).fill('luca.donnaloia.test@gmail.com');
    await auth0Page.getByRole('textbox', { name: 'Password' }).fill('Qwertyui00_!');
    await auth0Page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function konnectLogin(page: Page) {
    // Verify that the login form is displayed
    await page.getByRole('button', { name: 'Continue with SSO' }).click();
    await expect(page.getByRole('heading', { name: 'Company SSO' })).toBeVisible();
    await expect(page.getByTestId('signin-page-form-layout').locator('div').filter({ hasText: 'Company SSOEnter your' }).first()).toBeVisible();

    // Fill in the organization login path
    await expect(page.getByTestId('organization-sso-login-submit-button')).toHaveAttribute('disabled');
    await page.getByTestId('organization-login-path-input').fill('okta-login-d3rsvpl2fqxk1poj');
    await expect(page.getByTestId('organization-sso-login-submit-button')).not.toHaveAttribute('disabled');

    // Click the submit button to proceed to the Auth0 login page
    await page.getByTestId('organization-sso-login-submit-button').click();

    // Wait for the Auth0 login page to load
    await page.waitForLoadState('networkidle');

    // Continue with the Auth0 login process
    await auth0Login(page);
}

async function konnectLogout(page: Page) {
    // Navigate to the Konnect UI
    await page.goto('https://cloud.konghq.com/eu/service-catalog');
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    if (!page.url().includes('/login')) {
        await page.getByTestId('account-dropdown').click();
        await expect(page.getByTestId('account-dropdown-item-log-out')).toBeVisible();
        await page.getByTestId('account-dropdown-item-log-out').click();
        await page.waitForLoadState('networkidle');
    }
}

async function githubLogin(githubPage: Page) {
    await githubPage.getByRole('textbox', { name: 'Username or email address' }).fill('luca.donnaloia.test@gmail.com');
    await githubPage.getByRole('textbox', { name: 'Password' }).fill('Qwertyui00_!');
    await githubPage.getByRole('button', { name: 'Sign in', exact: true }).click();

    // TODO: Eventually, add the 2FA step if required
}

async function konnectDeleteIntegration(page: Page, githubIntegrationId: string) {
    await page.goto('https://cloud.konghq.com/eu/service-catalog/integrations/github/instances');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    // If not already logged in, log in to the Konnect UI
    if (page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        await expect(page.getByText('Email address Email address* Forgot your password? Continue New to Konnect?')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Continue with SSO' })).toBeVisible();

        await konnectLogin(page);
    }

    await page.getByTestId('row-actions-dropdown-trigger').click();
    await expect(page.getByTestId('actions-dropdown').getByTestId('dropdown-list')).toBeVisible();
    await page.getByTestId(`uninstall-instance-${githubIntegrationId.toLowerCase()}`).click();
    await page.getByTestId('confirmation-input').click();
    await page.getByTestId('confirmation-input').fill(githubIntegrationId);
    await expect(page.getByTestId('modal-action-button')).toBeVisible();
    await page.getByTestId('modal-action-button').click();
    await expect(page.getByTestId('add-integration-instance-button')).toBeVisible();
}

async function konnectDeleteService(page: Page) {
    await page.goto('https://cloud.konghq.com/eu/service-catalog');

    // // Wait for the page to load completely
    // await page.waitForLoadState('networkidle');

    // If not already logged in, log in to the Konnect UI
    if (page.url().includes('/login')) {
        await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
        await expect(page.getByText('Email address Email address* Forgot your password? Continue New to Konnect?')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Continue with SSO' })).toBeVisible();

        await konnectLogin(page);
    }

    const tabIndex = await getServiceRowTabIndex(page, 'lucad87test-service');

    await page.locator(`tr[tabindex='${tabIndex}'] [data-testid='row-actions-dropdown-trigger']`).click();
    await expect(page.getByTestId('actions-dropdown').getByTestId('dropdown-list')).toBeVisible();
    await page.getByTestId('delete-service-undefined').click();
    await page.getByTestId('confirmation-input').click();
    await page.getByTestId('confirmation-input').fill('lucad87test-service');
    await expect(page.getByTestId('modal-action-button')).toBeVisible();
    await page.getByTestId('modal-action-button').click();
    await expect(page.getByTestId('entity-create-button')).toBeVisible();
}

async function githubDeleteApplication(page: Page) {
    await page.goto('https://github.com/organizations/lucad87test-org/settings/installations');

    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');

    if (page.url().includes('github.com/login')) {
        await expect(page.getByRole('heading', { name: 'Sign in to GitHub' })).toBeVisible();

        await githubLogin(page);
    }

    await expect(page.getByText('Konnect Service Catalog Configure')).toBeVisible();
    await expect(page.getByText('Konnect Service Catalog')).toBeVisible();
    await page.getByRole('link', { name: 'Configure' }).click();

    page.on('dialog', async dialog => {
        await dialog.accept();
    });

    await page.locator('.btn[value=Uninstall]').click();

    await page.reload();

    await expect(page.locator('h2.blankslate-heading')).toContainText('No installed GitHub Apps');
}

async function getServiceRowTabIndex(page: Page, serviceName: string): Promise<string | null> {
  // Find the TR element containing the div with class 'service-name' and the specified text
  const tabIndex = await page.evaluate((name) => {
    // Find the div with class 'service-name' containing the service name text
    const serviceNameDiv = Array.from(document.querySelectorAll('.service-name'))
      .find(div => div.textContent?.trim() === name);
    
    // If div is found, traverse up to find the containing TR
    if (serviceNameDiv) {
      let element = serviceNameDiv;
      // Traverse up the DOM to find the TR parent
      while (element && element.tagName !== 'TR') {
        element = element.parentElement as HTMLElement;
      }
      
      // If TR is found, return its tabindex
      if (element && element.tagName === 'TR') {
        return element.getAttribute('tabindex');
      }
    }
    
    return null;
  }, serviceName);
  
  return tabIndex;
}

async function apiKonnectDeleteService(request: APIRequestContext, serviceId: string) {
    // Make a DELETE request to the Konnect API to delete the service
    const response = await request.delete(`https://eu.api.konghq.com/servicehub/v1/services/${serviceId}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer kpat_lweAZN3YWwe6hefz9IuFksPwxNFfw7pR1R2gCqPsWWkQZKcHv'
        }
    });

    // Check if the response status is 204 No Content, indicating successful deletion
    if (response.status() !== 204) {
        throw new Error(`Failed to delete service with ID ${serviceId}. Status: ${response.status()}`);
    }

}

async function apiKonnectDeleteInstance(request: APIRequestContext, instanceId: string) {
    // Make a DELETE request to the Konnect API to delete the integration
    const response = await request.delete(`https://eu.api.konghq.com/servicehub/v1/integration-instances/${instanceId}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer kpat_lweAZN3YWwe6hefz9IuFksPwxNFfw7pR1R2gCqPsWWkQZKcHv'
        }
    });

    // Check if the response status is 204 No Content, indicating successful deletion
    if (response.status() !== 204) {
        throw new Error(`Failed to delete integration with ID ${instanceId}. Status: ${response.status()}`);
    }
}

test.describe('Kong Service Catalog', () => {
    let githubIntegrationId: string;
    let serviceId: string;
    let instanceId: string;

    test.beforeAll(async ({ browser }) => {
    });
    
    test.afterAll(async ({ browser, request }) => {
        const page = await browser.newPage();
        // await konnectLogout(page);
        // await konnectDeleteIntegration(page, githubIntegrationId);
        // await konnectDeleteService(page);
        await apiKonnectDeleteService(request, serviceId);
        await apiKonnectDeleteInstance(request, instanceId);
        await githubDeleteApplication(page);
    });

    // Test to check if the Kong Service Catalog can add a github integration
    test('Add GitHub Integration', async ({ page }) => {
        // Navigate to the Konnect UI Service Catalog page
        await page.goto('https://cloud.konghq.com/eu/service-catalog/');

        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');

        // If not already logged in, log in to the Konnect UI
        if (page.url().includes('/login')) {
            await expect(page.getByRole('heading', { name: 'Log In' })).toBeVisible();
            await expect(page.getByText('Email address Email address* Forgot your password? Continue New to Konnect?')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Continue with SSO' })).toBeVisible();

            await konnectLogin(page);
        }

        // Wait for the Service Catalog page to load
        await expect(page.getByRole('link', { name: 'Kong Konnect' })).toBeVisible();
        await expect(page.getByTestId('dropdown-trigger-button')).toBeVisible();

        // Verify that the sidebar is visible and contains the "Services" item as active
        await expect(page.getByTestId('sidebar-item-services')).toHaveClass(/active/);

        // Verify the organization name and region
        await expect(page.getByTestId('organization-name')).toContainText('lucad87');
        await expect(page.getByLabel('More regions')).toContainText('EU (Europe)');

        // open a new tab to the GitHub Organization Applications page
        const githubPage = await page.context().newPage();

        // Navigate to the GitHub Organization Applications page
        await githubPage.goto('https://github.com/organizations/lucad87test-org/settings/installations');

        // Wait for the page to load completely
        await githubPage.waitForLoadState('networkidle');

        if (githubPage.url().includes('github.com/login')) {
            await expect(githubPage.getByRole('heading', { name: 'Sign in to GitHub' })).toBeVisible();

            await githubLogin(githubPage);
        }

        await expect(githubPage.getByLabel('lucad87test-org settings').getByRole('link', { name: 'lucad87test-org' })).toBeVisible();
        await expect(githubPage.getByRole('heading', { name: 'Installed GitHub Apps', exact: true })).toBeVisible();
        await expect(githubPage.getByRole('heading', { name: 'No installed GitHub Apps' })).toBeVisible();

        // switch back to the main page (Konnect UI - Service Catalog)
        await page.bringToFront();
        await expect(page.getByTestId('entity-create-button')).toBeVisible();

        // Add a new Service Catalog entity
        await page.getByTestId('entity-create-button').click();

        // await page.waitForLoadState('load');
        await expect(page.getByTestId('service-fullscreen-form')).toContainText('Create Service');

        await page.getByTestId('service-display-name').click();
        await page.getByTestId('service-display-name').fill('lucad87test-service');
        await expect(page.getByTestId('service-name')).toHaveValue('lucad87test-service');
        await page.getByTestId('service-submit-button').click();
        await expect(page.getByTestId('page-header-breadcrumbs').getByRole('link', { name: 'Service Catalog' })).toBeVisible();
        await expect(page.getByTestId('service-actions-dropdown')).toBeVisible();
        await expect(page.getByTestId('about-section-content').getByText('lucad87test-service')).toBeVisible();
        await expect(page.getByLabel('Overview')).toContainText('No Resources Yet');
        await expect(page.getByRole('button', { name: 'Map Resources' })).toBeVisible();

        // get the service ID from the URL
        serviceId = page.url().match(/service-catalog\/([0-9a-f-]+)/)?.[1] || '';

        // Verify that the service ID is displayed in the service catalog
        await page.getByTestId('copy-tooltip-wrapper').hover();
        await expect(page.locator('.popover-content').locator('div').filter({ hasText: serviceId })).toBeVisible();

        // navigate to service catalog landing page
        await page.goto('https://cloud.konghq.com/eu/service-catalog')
        await page.waitForLoadState('load');

        // Wait for table to be visible
        await page.waitForSelector('table.table', { state: 'visible', timeout: 30000 });

        // Extract table data with headers mapped to values
        const tableData = await getTableDataMappedByHeaders(page);
        // console.log('Table Data:', tableData);

        // Assert that the table contains data
        expect(tableData.length).toBeGreaterThan(0);

        // Find our specific service in the table data
        const ourService = tableData.find(row => row['Service'] === 'lucad87test-service');

        const currentDate = new Date();
        // Verify specific cell values for our service
        if (ourService) {
            // Verify service name
            expect(ourService['Service']).toBe('lucad87test-service');
            
            // Verify ID format (should be a UUID-like string with some prefix showing in the table)
            expect(ourService['ID']).toMatch(/[a-f0-9]+\.../); // ID should match the format shown in the table

            // const serviceId = 'd62c5f03-6425-431e-8276-438b67364540'; // Example service ID
            const serviceIdInitialPart = serviceId.substring(0, 8); // Get the first 8 characters
            expect(ourService['ID']).toContain(serviceIdInitialPart); // Should contain the first 8 characters of the service ID

            // Verify Resources count
            expect(ourService['Resources']).toMatch(/^\d+$/); // Should be a number
            expect(ourService['Resources']).toBe('0'); // Initially, no resources should be mapped

            // Extract the date parts from Created at and Updated at
            const createdAtDate = new Date(ourService['Created at']);
            const updatedAtDate = new Date(ourService['Updated at']);

            // Verify createdAtDate is compliant with current date
            expect(createdAtDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(createdAtDate.getMonth()).toBe(currentDate.getMonth());
            expect(createdAtDate.getDay()).toBe(currentDate.getDay());

            // Verify updatedAtDate is compliant with current date
            expect(updatedAtDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(updatedAtDate.getMonth()).toBe(currentDate.getMonth());
            expect(updatedAtDate.getDay()).toBe(currentDate.getDay());
        }

        // navigate to service catalog - integrations page
        await page.goto('https://cloud.konghq.com/eu/service-catalog/integrations');
        await page.waitForLoadState('load');

        // open the integration card for GitHub
        const githubCard = await selectIntegrationByName(page, 'GitHub');
        await expect(githubCard).toBeVisible();
        await expect(githubCard).toContainText('GitHub');
        await expect(githubCard).toContainText('Not Installed')

        await githubCard.click();

        await expect(page.getByTestId('page-header-title')).toContainText('GitHub');
        await expect(page.getByTestId('add-integration-instance-button')).toBeVisible();
        expect(page.url()).toBe('https://cloud.konghq.com/eu/service-catalog/integrations/github/instances');

        // Add a new GitHub integration instance
        await page.getByTestId('add-integration-instance-button').click();

        await expect(page.getByTestId('page-header-title')).toBeVisible();
        await expect(page.getByTestId('authorize-button')).toBeVisible();
        await expect(page.getByTestId('integration-display-name-input')).toBeVisible();
        await expect(page.getByTestId('integration-name-input')).toBeVisible();

        const githubIntegrationTitle = await page.getByTestId('page-header-title').textContent() || '';
        const match = githubIntegrationTitle.match(/Edit instance (.*)/);
        githubIntegrationId = match ? match[1] : '';
        // Verify the integration name is set correctly
        await expect(page.getByTestId('integration-display-name-input')).toHaveValue(githubIntegrationId)
        // Verify the instance name is set correctly
        await expect(page.getByTestId('integration-name-input')).toHaveValue(githubIntegrationId.toLowerCase());

        await page.getByTestId('authorize-button').click();
        await expect(page.getByRole('heading', { name: 'Install Konnect Service' })).toBeVisible();

        await page.getByRole('link', { name: '@lucad87test-org lucad87test-' }).click();
        await expect(page.getByRole('heading', { name: 'Install & Authorize Konnect' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Install & Authorize' })).toBeVisible();
        await page.getByRole('button', { name: 'Install & Authorize' }).click();

        await page.getByTestId('save-integration-instance-button').click();
        await expect(page.locator('.integration-instance-about-card .badge-content .badge-content-wrapper span.badge-text')).toHaveText('Authorized');

        instanceId = page.url().split('/').pop() || '';
        console.log('GitHub Integration Instance ID:', instanceId);

        const tableDataGithubIntegrations = await getTableDataMappedByHeaders(page);

        // Assert that the table contains data
        expect(tableDataGithubIntegrations.length).toBeGreaterThan(0);

        // Find our specific GitHub integration in the table data
        const ourGithubRepo = tableData.find(row => row['GitHub Repository'] === 'lucad87test-org/kong-test');

        // Verify specific cell values for our GitHub integration
        if (ourGithubRepo) {
            // Verify service name
            expect(ourGithubRepo['GitHub Repository']).toBe('lucad87test-org/kong-test');
            expect(ourGithubRepo['Description']).toBe('-');
            expect(ourGithubRepo['Resource Type']).toBe('Repository');
            expect(ourGithubRepo['Instance']).toBe(githubIntegrationId);
            expect(ourGithubRepo['Resource Status']).toBe('Unmapped');

            // Extract the date parts from Ingested Date
            const ingestDate = new Date(ourGithubRepo['Ingested Date']);

            // Verify ingestDate is compliant with current date
            expect(ingestDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(ingestDate.getMonth()).toBe(currentDate.getMonth());
            expect(ingestDate.getDay()).toBe(currentDate.getDay());
        }

        // Nagivate to Resources page
        await page.goto('https://cloud.konghq.com/eu/service-catalog/resources/resources-list');
        await expect(page.getByTestId('page-header-title')).toContainText('Resources');

        const tableDataResources = await getTableDataMappedByHeaders(page);

        // Assert that the table contains data
        expect(tableDataResources.length).toBeGreaterThan(0);

        // Find our specific GitHub integration in the table data
        const ourGithubResource = tableDataResources.find(row => row['Resource Name'] === 'kong-test');

        if (ourGithubResource) {
            // Verify resource name
            expect(ourGithubResource['Resource Name']).toBe('kong-test');
            expect(ourGithubResource['Resource Type']).toBe('Repository');
            expect(ourGithubResource['Instance']).toBe(githubIntegrationId);
            expect(ourGithubResource['Resource Status']).toBe('Unmapped');

            // Extract the date parts from Ingested Date
            const ingestDate = new Date(ourGithubResource['Ingested Date']);

            // Verify ingestDate is compliant with current date
            expect(ingestDate.getFullYear()).toBe(currentDate.getFullYear());
            expect(ingestDate.getMonth()).toBe(currentDate.getMonth());
            expect(ingestDate.getDay()).toBe(currentDate.getDay());

            // Open the resource details slideout
            await page.locator('[data-testid=resource-name-cell][title=kong-test]').click();

            await expect(page.getByTestId('slideout-container')).toBeVisible();

            const integrationId = await page.locator('.slideout-content .integration-details .copy-text').textContent() || '';

            await expect(page.getByTestId('slideout-title')).toContainText('kong-test');
            await expect(page.getByTestId('map-service-action-button')).toBeVisible();
            await page.getByTestId('map-service-action-button').click();

            await expect(page.getByTestId('resource-action-modal').locator('div').filter({ hasText: 'Map Resource' }).nth(2)).toBeVisible();
            await expect(page.getByTestId('select-input')).toBeVisible();
            await page.getByTestId('select-input').click();

            await expect(page.locator(`.modal-content .select-item-container button[value='${serviceId}']`)).toBeVisible();

            await page.locator(`.modal-content .select-item-container button[value='${serviceId}']`).click();

            await expect(page.getByTestId('select-input')).toHaveValue('lucad87test-service');
            await expect(page.getByTestId('modal-action-button')).toBeVisible();

            // intercept the API response of the click action
            const addResourcePromise = page.waitForResponse(`https://eu.api.konghq.com/servicehub/v1/resources/${integrationId}/services`);
            // Click the action button to map the resource
            await page.getByTestId('modal-action-button').click();
            // Wait for the response to complete
            const addResourceResponse = await addResourcePromise;
            // Verify the response status
            expect(addResourceResponse.status()).toBe(201);

            // Navigate back to Resources page
            await page.goto('https://cloud.konghq.com/eu/service-catalog/resources/resources-list');

            // update the table data after mapping the resource
            const updatedTableDataResources = await getTableDataMappedByHeaders(page);

            // Assert that the table contains data
            expect(updatedTableDataResources.length).toBeGreaterThan(0);

            // Find our specific GitHub integration in the updated table data
            const updatedOurGithubResource = updatedTableDataResources.find(row => row['Resource Name'] === 'kong-test') || {};

            // Verify Resource Status after mapping
            expect(updatedOurGithubResource['Resource Status']).toBe('1 Service');
        }
    })
});
