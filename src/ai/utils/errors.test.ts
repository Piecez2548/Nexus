import { describe, expect, it } from "vitest";
import {
  AIGatewayError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  InvalidResponseError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
} from "./errors";

const SUBCLASSES = [
  ProviderUnavailableError,
  ProviderTimeoutError,
  InvalidResponseError,
  ConfigurationError,
  AuthenticationError,
  NetworkError,
] as const;

describe("AIGatewayError and its subclasses", () => {
  it("AIGatewayError is a real Error with its own name", () => {
    const err = new AIGatewayError("base failure");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AIGatewayError);
    expect(err.name).toBe("AIGatewayError");
    expect(err.message).toBe("base failure");
  });

  it.each(SUBCLASSES)("%s is both an AIGatewayError and an Error, with a matching name", (ErrorClass) => {
    const err = new ErrorClass("something went wrong");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AIGatewayError);
    expect(err).toBeInstanceOf(ErrorClass);
    expect(err.name).toBe(ErrorClass.name);
    expect(err.message).toBe("something went wrong");
  });

  it.each(SUBCLASSES)("%s propagates an optional cause", (ErrorClass) => {
    const underlying = new Error("root cause");
    const err = new ErrorClass("wrapped", { cause: underlying });
    expect(err.cause).toBe(underlying);
  });

  it.each(SUBCLASSES)("%s has no cause when none is passed", (ErrorClass) => {
    const err = new ErrorClass("no cause here");
    expect(err.cause).toBeUndefined();
  });
});
