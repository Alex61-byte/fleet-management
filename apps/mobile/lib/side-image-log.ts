import { apiBase } from "./api";

const TAG = "[fleet/side-image]";

function enabled(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

/** Dev-only structured logs for vehicle side image pick → prepare → upload. */
export const sideImageLog = {
  info(step: string, detail?: Record<string, unknown>) {
    if (!enabled()) return;
    if (detail) console.log(TAG, step, detail);
    else console.log(TAG, step);
  },
  warn(step: string, detail?: Record<string, unknown>) {
    if (!enabled()) return;
    if (detail) console.warn(TAG, step, detail);
    else console.warn(TAG, step);
  },
  error(step: string, detail?: Record<string, unknown>) {
    if (!enabled()) return;
    if (detail) console.error(TAG, step, detail);
    else console.error(TAG, step);
  },
  apiBase() {
    return apiBase;
  },
};
