#!/usr/bin/env deno run --allow-net --unstable-sloppy-imports
import { parseArgs } from "@std/cli/parse-args";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../mod";
import { getUsageMessage, normalizeArgs } from "../utils/cli";

const args = normalizeArgs(parseArgs(Deno.args), Deno.exit);

const app = new Hono<{ Bindings: {} }>();
registerHandlers(app);

Deno.serve(
  {
    hostname: args.hostname,
    port: args.port,
    onListen(addr) {
      app.get("/", getUsageMessageHandler(addr));
      console.log(getUsageMessage(addr));
    },
  },
  app.fetch
);
