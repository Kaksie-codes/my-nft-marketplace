import { Response } from 'express';

// ── Standard response shapes ─────────────────────────────────────────────────

interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
}

// ── Response helpers ─────────────────────────────────────────────────────────

/**
 * Send a successful single-item response.
 *
 * Usage: return sendSuccess(res, user);
 * Shape: { success: true, data: { ... } }
 */
export function sendSuccess<T>(res: Response, data: T, status = 200): void {
  res.status(status).json({ success: true, data } satisfies SuccessResponse<T>);
}

/**
 * Send a successful paginated list response.
 *
 * Usage: return sendPaginated(res, nfts, total, page, limit);
 * Shape: { success: true, data: [...], pagination: { total, page, limit, pages } }
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number
): void {
  res.status(200).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  } satisfies PaginatedResponse<T>);
}

/**
 * Send a 400 Bad Request error response.
 *
 * Usage: return sendBadRequest(res, 'address required');
 * Shape: { success: false, error: 'address required' }
 */
export function sendBadRequest(res: Response, error: string): void {
  res.status(400).json({ success: false, error } satisfies ErrorResponse);
}

/**
 * Send a 404 Not Found error response.
 *
 * Usage: return sendNotFound(res, 'User not found');
 * Shape: { success: false, error: 'User not found' }
 */
export function sendNotFound(res: Response, error: string): void {
  res.status(404).json({ success: false, error } satisfies ErrorResponse);
}

/**
 * Send a 500 Server Error response.
 * Always logs the original error to the console for debugging.
 *
 * Usage: return sendServerError(res, err, 'GET /users/:address');
 * Shape: { success: false, error: 'Server error' }
 */
export function sendServerError(res: Response, err: unknown, context?: string): void {
  console.error(`Server error${context ? ` [${context}]` : ''}:`, err);
  res.status(500).json({ success: false, error: 'Server error' } satisfies ErrorResponse);
}