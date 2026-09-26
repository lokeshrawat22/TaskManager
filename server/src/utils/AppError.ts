export class AppError extends Error {
  statusCode: number;
  errors?: Record<string, string>;

  constructor(
    message: string,
    statusCode: number,
    errors?: Record<string, string>
  ) {
    super(message);

    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;

    Object.setPrototypeOf(this, AppError.prototype);
  }
}