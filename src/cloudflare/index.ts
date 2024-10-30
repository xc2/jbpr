import { configure } from "@zip.js/zip.js";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../mod";

configure({
  useCompressionStream: false,
  useWebWorkers: false,
});

let app: Hono<{ Bindings: CloudflareBindings }>;

function getApp(env: CloudflareBindings) {
  if (app) return app;
  app = new Hono<{ Bindings: CloudflareBindings }>();
  registerHandlers(app);
  app.get("/", getUsageMessageHandler());
  return app;
}

export default {
  fetch: (request, env, ctx) => {
    return getApp(env).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;
