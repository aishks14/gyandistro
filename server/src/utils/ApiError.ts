/** Any error thrown with this class becomes a clean JSON response. */
export class ApiError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = 'Sign in to continue') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'You do not have access to this action') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Already exists') {
    return new ApiError(409, message);
  }
  static tooMany(message = 'Too many requests') {
    return new ApiError(429, message);
  }
}
