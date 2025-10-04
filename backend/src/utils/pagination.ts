/**
 * Pagination Utility
 * Eliminates duplication of pagination logic across controllers
 * 
 * Issue Fix: Pagination logic duplicated in 2 controllers
 * Solution: Generic pagination helper for consistent implementation
 */

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * Paginated result structure
 */
export interface PaginatedResult<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Generic pagination helper
 * Works with any Prisma model
 * 
 * @param model - Prisma model (e.g., prisma.property)
 * @param where - Prisma where clause for filtering
 * @param params - Pagination parameters
 * @param include - Prisma include clause for relations
 * @returns Paginated result with items and metadata
 * 
 * @example
 * const result = await paginate(
 *   prisma.property,
 *   { agentId, status: 'available' },
 *   { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
 *   { paymentPlans: true }
 * );
 */
export async function paginate<T>(
  model: any,
  where: any,
  params: PaginationParams,
  include?: any
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder } = params;

  // Execute count and fetch in parallel for better performance
  const [total, items] = await Promise.all([
    model.count({ where }),
    model.findMany({
      where,
      include,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Calculate pagination metadata without fetching items
 * Useful when you already have items and just need metadata
 */
export function calculatePaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore: page < totalPages,
  };
}


