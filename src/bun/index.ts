#!/usr/bin/env bun
import { parseArgs } from "@std/cli/parse-args";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../mod";
import { getUsageMessage, normalizeArgs } from "../utils/cli";

const args = normalizeArgs(parseArgs(Bun.argv), process.exit);

const app = new Hono<{ Bindings: {} }>();
registerHandlers(app);

const s = Bun.serve({
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
  port: args.port,
  hostname: args.hostname,
});

app.get("/", getUsageMessageHandler(s));

console.log(getUsageMessage(s));
