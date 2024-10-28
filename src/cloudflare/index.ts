import { configure } from "@zip.js/zip.js";
import { Hono } from "hono";
import { registerHandlers } from "../mod";

configure({
  useCompressionStream: false,
  useWebWorkers: false,
});

let app: Hono<{ Bindings: CloudflareBindings }>;

function getApp(env: CloudflareBindings) {
  if (app) return app;
  app = new Hono<{ Bindings: CloudflareBindings }>();
  registerHandlers(app);
  return app;
}

export default {
  fetch: (request, env, ctx) => {
    return getApp(env).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;
