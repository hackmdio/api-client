export class HackMDError extends Error {
  constructor (message: string) {
    super(message)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class HttpResponseError extends HackMDError {
  public constructor (
    message: string,
    readonly code: number,
    readonly statusText: string,
  ) {
    super(message)
  }
}

export class MissingRequiredArgument extends HackMDError {}
export class InternalServerError extends HttpResponseError {}
export class TooManyRequestsError extends HttpResponseError {
  public constructor (
    message: string,
    readonly code: number,
    readonly statusText: string,
    readonly userLimit: number,
    readonly userRemaining: number,
    readonly resetAfter?: number,
  ) {
    super(message, code, statusText)
  }
}
