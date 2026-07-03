import { createServer } from "vite";

const port = Number(process.env.E2E_PORT ?? 5174);

const server = await createServer({
  clearScreen: false,
  server: {
    host: "127.0.0.1",
    port,
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

setTimeout(() => {
  process.exit(0);
}, 300_000);

process.on("SIGINT", () => {
  process.exit(0);
});

process.on("SIGTERM", () => {
  process.exit(0);
});
