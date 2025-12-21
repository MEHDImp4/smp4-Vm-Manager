/**
 * Domain Service
 * Business logic for domain management
 */

const { prisma } = require('../db');
const proxmoxService = require('./proxmox.service');
const cloudflareService = require('./cloudflare.service');
const log = require('./logger.service');

/**
 * Generate sanitized subdomain name
 * Format: [suffix]-[user]-[instance]
 */
const generateSubdomain = (suffix, userName, instanceName) => {
    const cleanSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanUser = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanInstance = instanceName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return `${cleanSuffix}-${cleanUser}-${cleanInstance}`
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
};

/**
 * Validate subdomain suffix
 */
const validateSuffix = (suffix) => {
    if (!suffix) {
        return { valid: false, error: "Custom suffix is required" };
    }

    const cleanSuffix = suffix.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanSuffix.length < 3) {
        return { valid: false, error: "Suffix must be at least 3 alphanumeric characters" };
    }

    return { valid: true, cleanSuffix };
};

/**
 * Check if subdomain is available (globally unique)
 */
const isSubdomainAvailable = async (subdomain) => {
    const existing = await prisma.domain.findUnique({
        where: { subdomain }
    });
    return !existing;
};

/**
 * Get instance IP from Proxmox
 */
const getInstanceIp = async (vmid) => {
    const interfaces = await proxmoxService.getLXCInterfaces(vmid);
    const eth0 = interfaces.find(i => i.name === 'eth0');
    return eth0 && eth0.inet ? eth0.inet.split('/')[0] : null;
};

/**
 * Create a custom domain for an instance
 */
const createDomain = async ({ instance, user, port, customSuffix, isPaidRequest }) => {
    // Validate suffix
    const validation = validateSuffix(customSuffix);
    if (!validation.valid) {
        const error = new Error(validation.error);
        error.statusCode = 400;
        throw error;
    }

    // Check domain limits (3 free, unlimited paid)
    const freeDomains = instance.domains.filter(d => !d.isPaid);
    const isPaidDomain = freeDomains.length >= 3;

    if (isPaidDomain && isPaidRequest !== true) {
        const error = new Error("Maximum of 3 free domains reached");
        error.statusCode = 400;
        error.requiresPurchase = true;
        throw error;
    }

    // Generate subdomain
    const subdomain = generateSubdomain(customSuffix, user.name, instance.name);

    // Check availability
    const isAvailable = await isSubdomainAvailable(subdomain);
    if (!isAvailable) {
        const error = new Error(`Domain ${subdomain} is already active`);
        error.statusCode = 400;
        throw error;
    }

    // Get instance IP
    const ip = await getInstanceIp(instance.vmid);
    if (!ip) {
        const error = new Error("Instance must have an IP address to bind a domain");
        error.statusCode = 400;
        throw error;
    }

    const fullHostname = `${subdomain}.smp4.xyz`;
    const serviceUrl = `http://${ip}:${port}`;

    // Add to Cloudflare
    await cloudflareService.addTunnelIngress(fullHostname, serviceUrl);

    // Save to DB
    const domain = await prisma.domain.create({
        data: {
            subdomain,
            port: parseInt(port),
            isPaid: isPaidDomain,
            instanceId: instance.id
        }
    });

    return domain;
};

/**
 * Delete a domain
 */
const deleteDomain = async (domain) => {
    const fullHostname = `${domain.subdomain}.smp4.xyz`;

    // Remove from Cloudflare
    await cloudflareService.removeTunnelIngress(fullHostname);

    // Remove from DB
    await prisma.domain.delete({
        where: { id: domain.id }
    });
};

/**
 * Get domain with ownership validation
 */
const getDomainWithOwner = async (domainId, instanceId, userId) => {
    const domain = await prisma.domain.findUnique({
        where: { id: domainId },
        include: { instance: true }
    });

    if (!domain || domain.instance.id !== instanceId || domain.instance.userId !== userId) {
        return null;
    }

    return domain;
};

/**
 * Get all domains for an instance
 */
const getInstanceDomains = async (instanceId, userId) => {
    const instance = await prisma.instance.findUnique({
        where: { id: instanceId },
        include: {
            domains: {
                select: {
                    id: true,
                    subdomain: true,
                    port: true,
                    isPaid: true,
                    createdAt: true
                }
            }
        }
    });

    if (!instance || instance.userId !== userId) {
        return null;
    }

    return instance.domains;
};

module.exports = {
    generateSubdomain,
    validateSuffix,
    isSubdomainAvailable,
    getInstanceIp,
    createDomain,
    deleteDomain,
    getDomainWithOwner,
    getInstanceDomains
};
