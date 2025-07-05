# Kong Service Catalog - E2E Tests

This repository contains end-to-end tests for the Kong Service Catalog UI. The tests are written in TypeScript using the [Playwright](https://playwright.dev/) framework.

The test suite covers the following scenarios:
- Logging into Kong Konnect and GitHub.
- Creating and verifying services in the Service Catalog.
- Adding and authorizing a GitHub integration.
- Mapping resources to services.
- Cleaning up created services, integrations, and resources after tests.

## Prerequisites

Before running the tests, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or later)
- [npm](https://www.npmjs.com/)

You will also need access to:
- A Kong Konnect account with permissions to manage the Service Catalog.
- A GitHub account with permissions to install and configure GitHub Apps in an organization.

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure Environment Variables

This project uses [`dotenvx`](https://github.com/dotenvx/dotenvx) to manage environment variables. The `.env` file containing the necessary credentials for Kong Konnect and GitHub is encrypted.

You will need the decryption key to run the tests. 

#### IMPORTANT

The key file `.env.keys` must be placed in the root of the project, at the same level of this README and the .env file.

You can obtain the key file from [this link](https://browser.lucad.cloud/api/public/dl/k5H28HeA/public/.env.keys?token=1OMNGVhlg4wOUDsJzz3bJef4ZTxg2f8ttJENKnAZvv8mV-713IlhY8Jzi_QSxKCrkIC-NFxQOVJ2S1T6N0_UYG8Pk4SwetuFPVfXEYj-fZlmnk1s4-NmdmjfjiMmgUEb) (it will expires on September 2025).

## Running the Tests

To run the entire test suite, use the following command:

```bash
npx playwright test
```

To run a specific test file:

```bash
npx playwright test tests/kong-service-catalog.spec.ts
```

Playwright will run the tests in a headless browser by default. To see the browser UI, run the tests in headed mode:

```bash
npx playwright test --headed
```

## Project Structure

- `tests/`: Contains the Playwright test files.
  - `kong-service-catalog.spec.ts`: The main test file for the service catalog workflow.
- `pages/`: Page Object Models for different parts of the UI (e.g., Services, Integrations, Resources).
- `utils/`: Helper functions for tasks like logging in or cleaning up test data.
- `api/`: Functions for making direct API calls to Kong Konnect for setup and teardown.
- `playwright.config.ts`: Configuration file for Playwright.
