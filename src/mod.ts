import type { Context, Hono } from "hono";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { RepositoryPath } from "./paths";
import { getUsageMessage } from "./utils/cli";
import { copyHeader } from "./utils/http";
import { getPluginDownloadUrl, getProductInfo } from "./utils/jetbrains";
import {
  fetchAndGetFirstPlugin,
  getPluginMeta,
  removeVersionConstraintsIfNecessary,
  setDownloadUrl,
} from "./utils/plugin-xml";
import { unstreamText } from "./utils/stream";
import { getZipTransformStream } from "./utils/zip";

export interface RequiredBindings {}

export function registerHandlers(app: Hono<{ Bindings: RequiredBindings }>) {
  app.get(RepositoryPath, async (c) => {
    const { id: pluginId } = c.req.param();
    const { build, channel } = c.req.query();
    if (!pluginId) {
      return new Response("pluginId is required", { status: 400 });
    }
    const [product, productVersion] = getProductInfo(build);
    if (!product || !productVersion) {
      return new Response("build is required", { status: 400 });
    }
    let first: XMLBuilder | null = null;
    try {
      first = await fetchAndGetFirstPlugin({ pluginId, channel, product, productVersion });
    } catch (e) {
      if (e instanceof Response) {
        return e;
      }
      throw e;
    }
    const [constraintsRemoved] = removeVersionConstraintsIfNecessary(first, productVersion);
    const meta = getPluginMeta(first);
    let downloadUrl = getPluginDownloadUrl({
      pluginId: meta.pluginXmlId!,
      version: meta.version!,
      channel,
    });
    if (constraintsRemoved) {
      downloadUrl = new URL(
        // must be same as the download api
        "../plugin/download" + downloadUrl.search,
        c.req.url
      );
    }

    setDownloadUrl(first, downloadUrl);
    const parent = first.up();
    parent.each((n, i) => {
      n.remove();
    }, false);
    parent.import(first);

    return new Response(first.root().end({ prettyPrint: true }), {
      headers: {
        "content-type": "text/xml;charset=UTF-8",
      },
    });
  });
  app.get("/plugin/download", async (c) => {
    const { pluginId, version, channel } = c.req.query();
    const u = getPluginDownloadUrl({ pluginId, version, channel });
    const res = await fetch(u, { redirect: "follow" });
    const headers = res.headers;
    if (!(headers.get("content-type") || "").includes("/zip")) {
      return res;
    }
    if (!res.body) {
      return res;
    }
    const h = new Headers({
      "content-type": "application/zip",
    });
    copyHeader(headers, h, "etag");
    copyHeader(headers, h, "age");
    copyHeader(headers, h, "vary");
    copyHeader(headers, h, "last-modified");
    copyHeader(
      headers,
      h,
      "content-disposition",
      `attachment; filename="${pluginId}-${version}.zip"`
    );
    if (headers.get("etag") && headers.get("etag") === c.req.header("if-none-match")) {
      return new Response(null, { status: 304, headers: h });
    }

    const zipTrans = getZipTransformStream((entry) => {
      if (entry.filename.endsWith(".jar")) {
        return getZipTransformStream((entry) => {
          if (entry.filename === "META-INF/plugin.xml") {
            return unstreamText((text) => {
              text = text.replace(/ until-build="[^"]+"/, "");
              return text;
            });
          }
        });
      }
    });
    const es = new TransformStream();
    const r = res.body.pipeThrough(zipTrans).pipeTo(es.writable);
    const fin = new Response(es.readable, { headers: h });
    try {
      c.executionCtx.waitUntil(r);
    } catch {}
    return fin;
  });
}

export function getUsageMessageHandler({
  hostname,
  port,
  ...rest
}: Parameters<typeof getUsageMessage>[0]) {
  return (c: Context) => {
    const u = new URL(c.req.url);
    const message = getUsageMessage({ ...rest, origin: u.origin });
    return new Response(message, {
      headers: { "content-type": "text/plain;charset=utf-8" },
    });
  };
}
