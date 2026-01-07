import { state } from "./state";

export const postToNative = (message: unknown) => {
  state.nativePort?.postMessage(message);
};
