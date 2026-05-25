// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { errorHandler } from "../error";

describe("errorHandler", () => {
  it("extracts error string from payload object", () => {
    const setError = vi.fn();
    errorHandler({ error: "Something went wrong" }, { setError });
    expect(setError).toHaveBeenCalledWith("Something went wrong");
  });

  it("uses fallback message when payload has no error field", () => {
    const setError = vi.fn();
    errorHandler({}, { setError });
    expect(setError).toHaveBeenCalledWith("Bridge reported an unknown error");
  });

  it("uses fallback message when payload is null", () => {
    const setError = vi.fn();
    errorHandler(null, { setError });
    expect(setError).toHaveBeenCalledWith("Bridge reported an unknown error");
  });

  it("uses fallback message when error field is not a string", () => {
    const setError = vi.fn();
    errorHandler({ error: 42 }, { setError });
    expect(setError).toHaveBeenCalledWith("Bridge reported an unknown error");
  });

  it("uses fallback message when payload is a plain string", () => {
    const setError = vi.fn();
    errorHandler("raw string", { setError });
    expect(setError).toHaveBeenCalledWith("Bridge reported an unknown error");
  });
});
