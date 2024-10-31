import { configure } from "@zip.js/zip.js";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../../sources/mod.ts";

configure({
  useCompressionStream: false,
  useWebWorkers: false,
});
interface CloudflareBindings {}

let app: Hono<{ Bindings: CloudflareBindings }>;

function getApp(env: CloudflareBindings) {
  if (app) return app;
  app = new Hono<{ Bindings: CloudflareBindings }>();
  registerHandlers(app);
  app.get("/", getUsageMessageHandler());
  return app;
}

export default {
  fetch: (request, env, ctx: any) => {
    return getApp(env).fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareBindings>;
