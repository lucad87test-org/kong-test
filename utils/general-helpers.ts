import { Page } from '@playwright/test';

// Function to extract table data with headers mapped to values
async function getTableDataMappedByHeaders(page: Page) {
    await page.waitForSelector('table.table', { state: 'visible' });

    // Debug: count tables and rows
    // const tableCount = await page.$$eval('table.table', tables => tables.length);
    // const rowCount = await page.$$eval('table.table tbody tr', rows => rows.length);
    // console.log(`Found ${tableCount} tables with ${rowCount} total rows`);

    // First get all header titles
    const headers = await page.$$eval('table.table th', (thElements) => {
        return thElements.map((th) => {
            // Get the header label text
            const labelElement = th.querySelector('.table-header-label');
            const text = labelElement?.textContent?.trim() || '';
            return text === 'actions' ? 'actions' : text;
        });
    });

    // Get all rows
    const rowsData = await page.$$eval('table.table tbody tr', (rows, headers) => {
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
                    if (cell.querySelector('.service-name')) { cellValue = cell.querySelector('.service-name')?.textContent || ''; }
                    // Handle ID with copy functionality
                    else if (cell.querySelector('.copy-text')) { cellValue = cell.querySelector('.copy-text')?.textContent || ''; }
                    // Handle standard text cells
                    else { cellValue = cell.textContent?.trim() || ''; }
                    
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
    // Try to find the card directly first
    const cardLocator = page.locator(`.k-card.integration-card:has(.integration-name:text-is("${name}"))`);

    // Check if the card exists
    const count = await cardLocator.count();

    // If not found, scroll through the page to look for it
    if (count === 0) {
        let foundCard = false;
        let scrollAttempts = 0;
        const maxScrollAttempts = 10;

        while (!foundCard && scrollAttempts < maxScrollAttempts) {
            // Scroll down
            await page.evaluate(() => { window.scrollBy(0, 500); });
            
            // Wait a moment for content to load/render
            await page.waitForTimeout(300);
            
            // Check if card is now visible
            const newCount = await cardLocator.count();

            if (newCount > 0) { foundCard = true; }
            
            scrollAttempts++;
        }

        if (!foundCard) {
            const availableCards = await page.$$eval('.integration-name', elements => elements.map(el => el.textContent));
            throw new Error(`Integration card "${name}" not found after scrolling`);
        }
    }

    await cardLocator.scrollIntoViewIfNeeded();

    return cardLocator;
}

export { getTableDataMappedByHeaders, selectIntegrationByName };