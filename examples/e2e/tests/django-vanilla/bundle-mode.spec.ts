import { test } from "@playwright/test";
import { bundleModeTests } from "../shared/bundle-mode.spec.js";

test.describe("Bundle Mode Verification", () => {
  bundleModeTests({ pagePath: "/" });
});
