/// <reference types="npm:@cloudflare/workers-types@^4.20241022.0" />
import type { Response } from "@cloudflare/workers-types";
import { configure } from "@zip.js/zip.js";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../sources/mod.ts";

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
  fetch: (request: Request, env: CloudflareBindings, ctx: any): Response | Promise<Response> => {
    return getApp(env).fetch(request, env, ctx);
  },
};
