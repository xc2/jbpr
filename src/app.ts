import { Hono } from "hono";
import { copyHeader } from "./utils/http";
import {
  fetchAndGetFirstPlugin,
  mutateAndIsVersionMatch,
  setDownloadUrl,
} from "./utils/plugin-xml";
import { unstreamText } from "./utils/stream";
import { getZipTransformStream } from "./utils/zip";

const app = new Hono<{ Bindings: CloudflareBindings }>();
export { app };

app.get("/plugin/list", async (c) => {
  const { pluginId, build, channel } = c.req.query();
  const u = new URL("https://plugins.jetbrains.com/plugins/list");
  u.searchParams.set("pluginId", pluginId);
  if (channel) {
    u.searchParams.set("channel", channel);
  }
  const [product, buildVersion = ""] = (build ?? "").split("-");
  let [first, root] = await fetchAndGetFirstPlugin(u);
  if (first) {
    const [valid, targetVersion] = mutateAndIsVersionMatch(first, buildVersion);
    const uu = new URL(u);
    uu.searchParams.set("build", `${product}-${targetVersion}`);
    [first, root] = await fetchAndGetFirstPlugin(uu);
    if (first) {
      mutateAndIsVersionMatch(first, buildVersion);
      setDownloadUrl(first, valid ? undefined : c.req.url, channel);
      const parent = first.up();
      parent.each((n, i) => {
        n.remove();
      }, false);
      parent.import(first);
    }
  }

  return new Response(root.end({ prettyPrint: true }), {
    headers: {
      "content-type": "text/xml;charset=UTF-8",
    },
  });
});
app.get("/plugin/download", async (c) => {
  const { pluginId, version, channel } = c.req.query();
  const u = new URL("https://plugins.jetbrains.com/plugin/download");
  u.searchParams.set("pluginId", pluginId);
  u.searchParams.set("version", version);
  if (channel && channel !== "stable") {
    u.searchParams.set("channel", channel);
  }
  const res = await fetch(u, { redirect: "follow" });
  const headers = res.headers;
  if (headers.get("content-type") !== "application/zip") {
    return res;
  }
  if (!res.body) {
    return new Response("unknown", { status: 500 });
  }
  const h = new Headers({
    "content-type": "application/zip",
  });
  copyHeader(
    headers,
    h,
    "content-disposition",
    `attachment; filename="${pluginId}-${version}.zip"`
  );
  copyHeader(headers, h, "etag");
  copyHeader(headers, h, "age");
  copyHeader(headers, h, "vary");
  copyHeader(headers, h, "last-modified");
  const zipTrans = getZipTransformStream((entry) => {
    if (entry.filename.endsWith(".jar")) {
      return getZipTransformStream((entry) => {
        if (entry.filename === "META-INF/plugin.xml") {
          return unstreamText((text) => {
            // text = text.replace(/ since-build="[^"]+"/, "");
            text = text.replace(/ until-build="[^"]+"/, ' until-build="243.*"');
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
  } catch {
    await r;
  }
  return fin;
});
