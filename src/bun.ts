import { app } from "./app";

Bun.serve({
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
});
