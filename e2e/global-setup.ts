import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import type { FullConfig } from "@playwright/test";

const host = "127.0.0.1";
const port = 5174;
const baseURL = `http://${host}:${port}`;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }

    await delay(500);
  }

  throw new Error(`E2E server did not become ready at ${baseURL}`);
}

async function globalSetup(_config: FullConfig) {
  const child = spawn(process.execPath, ["scripts/e2e-server.mjs"], {
    cwd: process.cwd(),
    detached: false,
    env: {
      ...process.env,
      E2E_PORT: String(port),
      VITE_E2E_MOCK: "1",
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_ANON_KEY: "e2e-anon-key",
    },
    stdio: "ignore",
  });

  child.unref();
  await waitForServer();
}

export default globalSetup;
