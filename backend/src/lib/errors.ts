export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const unauthenticated = () =>
  new AppError(401, "UNAUTHENTICATED", "Authentication is required.");
export const invalidCredentials = () =>
  new AppError(401, "INVALID_CREDENTIALS", "Invalid username or password");
export const forbiddenRole = () =>
  new AppError(403, "FORBIDDEN_ROLE", "You are not allowed to do this.");
export const notFound = () => new AppError(404, "NOT_FOUND", "This record was not found.");
export const validationError = (details?: unknown) =>
  new AppError(422, "VALIDATION_ERROR", "Invalid input.", details);