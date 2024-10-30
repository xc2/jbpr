#!/usr/bin/env deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write
import { resolve as resolvePath } from "node:path";
import { parseArgs } from "@std/cli/parse-args";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../sources/mod.ts";
import { getUsageMessage, normalizeArgs } from "../sources/utils/cli.ts";

const { binding } = normalizeArgs(parseArgs(Deno.args), Deno.exit);

const app = new Hono<{ Bindings: {} }>();
registerHandlers(app);
app.get("/", getUsageMessageHandler());

Deno.serve(
  {
    onListen(addr: Deno.NetAddr | Deno.UnixAddr) {
      console.log(getUsageMessage({ url: addrToUrl(addr) }));
    },
    ...getBinding(binding),
  },
  app.fetch
);

function getBinding(b: typeof binding) {
  if (b.unix) {
    return { path: resolvePath(Deno.cwd(), b.unix) };
  }
  return b;
}

function addrToUrl(addr: Deno.NetAddr | Deno.UnixAddr) {
  if (addr.transport === "unix" || addr.transport === "unixpacket") {
    return new URL(`unix://${addr.path}`);
  }
  if (addr.transport === "tcp" || addr.transport === "udp") {
    if (addr.hostname.includes(":")) {
      return new URL(`http://[${addr.hostname}]:${addr.port}`);
    }
    return new URL(`http://${addr.hostname}:${addr.port}`);
  }
  throw new Error("unreachable");
}
