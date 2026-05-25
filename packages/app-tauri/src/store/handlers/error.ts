export interface ErrorDeps {
  setError: (message: string) => void;
}

export const errorHandler = (payload: unknown, deps: ErrorDeps): void => {
  const message =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).error
      : undefined;
  deps.setError(typeof message === "string" ? message : "Bridge reported an unknown error");
};
