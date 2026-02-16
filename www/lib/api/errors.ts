export interface ApiErrorBody {
  error: string;
  code?: string;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
    public readonly response: Response
  ) {
    super(body.error);
    this.name = 'ApiClientError';
  }

  get code(): string | undefined {
    return this.body.code;
  }
}
