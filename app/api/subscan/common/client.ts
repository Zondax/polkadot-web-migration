interface SubscanClientConfig {
  network: string
  apiKey?: string
}

interface SubscanBaseResponse {
  code: number
  message: string
  generated_at: number
}

export class SubscanError extends Error {
  constructor(
    message: string,
    public subscanCode: number,
    public httpStatus: number
  ) {
    super(message)
    this.name = 'SubscanError'
  }
}

export class SubscanClient {
  private baseUrl: string
  private headers: Record<string, string>

  private getHttpStatusFromSubscanCode(code: number): number {
    switch (code) {
      case 10004: // Record Not Found
        return 404
      case 10001: // Invalid parameter
      case 10002: // Invalid format
        return 400
      case 10003: // Rate limit exceeded
        return 429
      default:
        return 500 // Internal server error for unknown codes
    }
  }

  constructor(config: SubscanClientConfig) {
    this.baseUrl = `https://${config.network}.api.subscan.io/api/v2`
    this.headers = {
      'Content-Type': 'application/json',
      ...(config.apiKey && { 'X-API-Key': config.apiKey }),
    }
  }

  async request<T extends SubscanBaseResponse, B extends Record<string, unknown>>(endpoint: string, body: B): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new SubscanError(`HTTP error! status: ${response.status}, error: ${errorText}`, 0, response.status)
    }

    const data: T = await response.json()

    if (data.code !== 0) {
      const httpStatus = this.getHttpStatusFromSubscanCode(data.code)
      throw new SubscanError(data.message, data.code, httpStatus)
    }

    return data
  }
}
