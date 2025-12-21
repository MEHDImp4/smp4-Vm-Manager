/**
 * Pagination Utilities
 * Reusable pagination functions for Prisma queries
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination params from request query
 * @param {object} query - req.query object
 * @returns {{ page: number, limit: number, skip: number }}
 */
const parsePaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page, 10) || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit, 10) || DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
};

/**
 * Execute paginated Prisma query
 * @param {object} model - Prisma model (e.g., prisma.instance)
 * @param {object} queryOptions - Prisma query options (where, include, orderBy, etc.)
 * @param {object} paginationParams - { page, limit } from parsePaginationParams
 * @returns {Promise<{ data: any[], pagination: object }>}
 */
const paginate = async (model, queryOptions = {}, paginationParams = {}) => {
    const { page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = paginationParams;
    const skip = (page - 1) * limit;

    // Execute count and find in parallel
    const [total, data] = await Promise.all([
        model.count({ where: queryOptions.where }),
        model.findMany({
            ...queryOptions,
            skip,
            take: limit,
        })
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

/**
 * Format paginated response (for manual use)
 * @param {any[]} data - Array of items
 * @param {number} total - Total count
 * @param {object} params - { page, limit }
 */
const formatPaginatedResponse = (data, total, { page, limit }) => {
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
        }
    };
};

module.exports = {
    DEFAULT_PAGE,
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePaginationParams,
    paginate,
    formatPaginatedResponse
};
