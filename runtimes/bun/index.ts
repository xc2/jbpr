#!/usr/bin/env bun
import { resolve as resolvePath } from "node:path";
import process from "node:process";
import { parseArgs } from "@std/cli/parse-args";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../../sources/mod.ts";
import { getUsageMessage, normalizeArgs } from "../../sources/utils/cli.ts";

const { binding } = normalizeArgs(parseArgs(Bun.argv), process.exit);

const app = new Hono<{ Bindings: {} }>();
registerHandlers(app);
app.get("/", getUsageMessageHandler());

const s = Bun.serve({
  fetch(request: Request): Response | Promise<Response> {
    return app.fetch(request);
  },
  ...getBinding(binding),
});

console.log(getUsageMessage(s));

function getBinding(b: typeof binding) {
  if (b.unix) {
    return { unix: resolvePath(process.cwd(), b.unix) };
  } else {
    return { ...b, idleTimeout: 0 };
  }
}
