import { defineConfig } from "@playwright/test";

// Own the development server for the entire test run; never depend on a
// developer's interactive Vite terminal or silently reuse another app.
const origin = "http://127.0.0.1:4174";
export default defineConfig({
  testDir: "./tests",
  testMatch: "contact-motion.browser.spec.mjs",
  workers: 1,
  retries: 0,
  use: {
    baseURL: origin,
    browserName: "chromium",
    timezoneId: "Asia/Kolkata",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 4174 --strictPort",
    url: origin + "/dev/contact-preview",
    reuseExistingServer: false,
    timeout: 60000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
