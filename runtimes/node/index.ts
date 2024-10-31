#!/usr/bin/env node
import type { AddressInfo } from "node:net";
import process from "node:process";
import { serve } from "@hono/node-server";
import { parseArgs } from "@std/cli/parse-args";
import { Hono } from "hono";
import { getUsageMessageHandler, registerHandlers } from "../../sources/mod.ts";
import { getUsageMessage, normalizeArgs } from "../../sources/utils/cli.ts";

const { binding } = normalizeArgs(parseArgs(process.argv), process.exit);

const app = new Hono<{ Bindings: {} }>();
registerHandlers(app);
app.get("/", getUsageMessageHandler());

serve(
  {
    fetch: app.fetch.bind(app),
    ...getBinding(binding),
  },
  (addr) => {
    console.log(getUsageMessage({ url: getUrl(addr) }));
  }
);

// console.log(getUsageMessage({}));

function getBinding(b: typeof binding) {
  if (b.unix) {
    throw new Error("The nodejs binary does not support binding to unix sockets");
  } else {
    return b;
  }
}

function getUrl(addr: AddressInfo): URL {
  if (addr.family === "IPv6") {
    // @ts-expect-error
    return new URL(`http://[${addr.address}]:${addr.port}`);
  } else {
    // @ts-expect-error
    return new URL(`http://${addr.address}:${addr.port}`);
  }
}

// biome-ignore lint: a
export {};
