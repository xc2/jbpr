import S from "semver";
import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";

export function exactLatest(doc: XMLBuilder): XMLBuilder | undefined {
  const [plugin] =
    doc.find((n) => n.node.nodeName === "idea-plugin", true, true)?.toArray(true) ?? [];
  return plugin;
}
function child(node: XMLBuilder, name: string) {
  return node.find((n) => n.node.nodeName === name);
}
function text(node: XMLBuilder, name: string) {
  return child(node, name)?.node?.textContent;
}

export function mutateAndIsVersionMatch(
  pluginNode: XMLBuilder,
  version: string
): [boolean, string] {
  if (!version) {
    return [true, ""];
  }
  const verNode = child(pluginNode, "idea-version");
  if (!verNode) {
    return [true, version];
  }
  const node = verNode.node as unknown as Element;
  const sv = S.coerce(version, { loose: true })?.version ?? version;

  const since = node.getAttribute("since-build");
  const until = node.getAttribute("until-build");
  if (since && S.outside(sv, new S.Range(since, { loose: true }), "<")) {
    verNode.removeAtt("since-build");
    return [false, since];
  }
  if (until && S.outside(sv, new S.Range(until, { loose: true }), ">")) {
    verNode.removeAtt("until-build");
    return [false, until];
  }
  return [true, version];
}

export function setDownloadUrl(
  pluginNode: XMLBuilder,
  base: string | URL = "https://plugins.jetbrains.com",
  channel = "stable"
) {
  const id = text(pluginNode, "id");
  const version = text(pluginNode, "version");
  const uu = new URL("/plugin/download", base);
  if (id) {
    uu.searchParams.set("pluginId", id);
  }
  if (version) {
    uu.searchParams.set("version", version);
  }
  if (channel) {
    uu.searchParams.set("channel", channel);
  }
  const url = uu.href;
  const ele = child(pluginNode, "download-url") || pluginNode.ele("download-url");
  ele.txt(url);
  return [url, ele] as const;
}

export async function fetchAndGetFirstPlugin(url: string | URL) {
  const res = await fetch(url);
  const raw = await res.text();
  const doc = create(raw);
  return [exactLatest(doc), doc] as const;
}
