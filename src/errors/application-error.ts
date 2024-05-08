export default class ApplicationError extends Error {
  public message = 'ApplicationError';

  public status = 500;

  constructor(message?: string, status?: number) {
    super();
    if (message != null) {
      this.message = message;
    }
    if (status != null) {
      this.status = status;
    }
  }
}
