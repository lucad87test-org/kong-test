import { APIRequestContext } from '@playwright/test';

const KONNECT_API_TOKEN = process.env.KONNECT_API_TOEKEN || '';

async function apiKonnectDeleteService(request: APIRequestContext, serviceId: string) {
    const response = await request.delete(`https://eu.api.konghq.com/servicehub/v1/services/${serviceId}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KONNECT_API_TOKEN}`
        }
    });

    if (response.status() !== 204) {
        throw new Error(`Failed to delete service with ID ${serviceId}. Status: ${response.status()}`);
    }

}

async function apiKonnectDeleteInstance(request: APIRequestContext, instanceId: string) {
    const response = await request.delete(`https://eu.api.konghq.com/servicehub/v1/integration-instances/${instanceId}`, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KONNECT_API_TOKEN}`
        }
    });

    if (response.status() !== 204) {
        throw new Error(`Failed to delete integration with ID ${instanceId}. Status: ${response.status()}`);
    }
}

async function apiKonnectDeleteLeftovers(request: APIRequestContext) {
    const services = await apiKonnectGetServices(request);
    const instances = await apiKonnectGetInstances(request);

    if (services.data.length > 0) {
        const serviceIds: string[] = services.data.map((service: any) => service.id);

        for (const serviceId of serviceIds) {
            try {
                await apiKonnectDeleteService(request, serviceId);
            } catch (error) {
                console.error(`Error deleting service with ID ${serviceId}:`, error);
            }
        }
    }

    if (instances.data.length > 0) {
        const instanceIds: string[] = instances.data
            .filter((instance: any) => instance.integration_name === 'github')
            .map((instance: any) => instance.id);

        for (const instanceId of instanceIds) {
            try {
                await apiKonnectDeleteInstance(request, instanceId);
            } catch (error) {
                console.error(`Error deleting integration with ID ${instanceId}:`, error);
            }
        }
    }

    return {
        services: services.data.map((service: any) => service.id),
        instances: instances.data
            .filter((instance: any) => instance.integration_name === 'github')
            .map((instance: any) => instance.id)
    };
}

async function apiKonnectGetServices(request: APIRequestContext) {
    const response = await request.get('https://eu.api.konghq.com/servicehub/v1/services', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KONNECT_API_TOKEN}`
        }
    });

    if (response.status() !== 200) {
        throw new Error(`Failed to fetch services. Status: ${response.status()}`);
    }

    const data = await response.json();

    return data
}

async function apiKonnectGetInstances(request: APIRequestContext) {
    const response = await request.get('https://eu.api.konghq.com/servicehub/v1/integration-instances', {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${KONNECT_API_TOKEN}`
        }
    });

    if (response.status() !== 200) {
        throw new Error(`Failed to fetch integration instances. Status: ${response.status()}`);
    }

    const data = await response.json();

    return data
}

export { apiKonnectDeleteService, apiKonnectDeleteInstance, apiKonnectDeleteLeftovers };