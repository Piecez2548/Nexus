// Mirrors this repo's one existing custom-Error precedent
// (RecoveryNotAvailableError in
// src/features/encryption/recovery/recoverDekFromEscrow.ts: extends Error,
// sets this.name), plus an optional `cause` — AIGateway frequently wraps an
// underlying provider throw and shouldn't discard it.

export class AIGatewayError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AIGatewayError";
  }
}

// The active provider is missing, disabled, or reports itself unavailable.
export class ProviderUnavailableError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderUnavailableError";
  }
}

// The provider didn't respond within its configured timeout.
export class ProviderTimeoutError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderTimeoutError";
  }
}

// The provider responded, but the response doesn't satisfy AIResponse's
// contract (e.g. a non-string `content`).
export class InvalidResponseError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvalidResponseError";
  }
}

// A request, context, or ProviderConfiguration is malformed or unusable —
// e.g. an unimplemented provider name, or a request context that doesn't
// match the shape a provider's method expects.
export class ConfigurationError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ConfigurationError";
  }
}

// The provider rejected its credentials (a remote provider's API key,
// typically — never thrown by LocalRuleProvider, which has none).
export class AuthenticationError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuthenticationError";
  }
}

// A transport-level failure reaching the provider (a remote provider's
// network request, typically — never thrown by LocalRuleProvider, which
// makes no network calls).
export class NetworkError extends AIGatewayError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "NetworkError";
  }
}
