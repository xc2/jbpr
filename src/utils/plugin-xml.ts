import S from "semver";
import { create } from "xmlbuilder2";
import type { XMLBuilder } from "xmlbuilder2/lib/interfaces";
import { copyResponse } from "./http";
import { getPluginListUrl } from "./jetbrains";

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

export function removeVersionConstraintsIfNecessary(
  pluginNode: XMLBuilder,
  version: string
): [boolean, string] {
  if (!version) {
    return [false, version];
  }
  const verNode = child(pluginNode, "idea-version");
  if (!verNode) {
    return [false, version];
  }
  const node = verNode.node as unknown as Element;
  const sv = S.coerce(version, { loose: true })?.version ?? version;

  const since = node.getAttribute("since-build");
  const until = node.getAttribute("until-build");
  if (since && S.outside(sv, new S.Range(since, { loose: true }), "<")) {
    verNode.removeAtt("since-build");
    return [true, since];
  }
  if (until && S.outside(sv, new S.Range(until, { loose: true }), ">")) {
    verNode.removeAtt("until-build");
    return [true, until];
  }
  return [false, version];
}

export function getPluginMeta(pluginNode: XMLBuilder) {
  return {
    pluginXmlId: text(pluginNode, "id"),
    version: text(pluginNode, "version"),
  };
}

export function setDownloadUrl(pluginNode: XMLBuilder, url: URL) {
  const ele = child(pluginNode, "download-url") || pluginNode.ele("download-url");
  ele.txt(url.href);
  return ele;
}

async function _fetchAndGetFirstPlugin(url: URL) {
  const res = await fetch(url);
  const raw = await res.text();

  const doc = create(raw);
  const first = exactLatest(doc);
  if (!first) {
    throw copyResponse(raw, res);
  }
  const meta = getPluginMeta(first);
  if (!meta.pluginXmlId || !meta.version) {
    throw copyResponse(raw, res);
  }
  return first;
}

export async function fetchAndGetFirstPlugin({
  pluginId,
  channel,
  product,
  productVersion,
}: { pluginId: string; channel?: string; product: string; productVersion: string }) {
  const first = await _fetchAndGetFirstPlugin(getPluginListUrl({ pluginId, channel }));
  const [constraintsRemoved, targetVersion] = removeVersionConstraintsIfNecessary(
    first,
    productVersion
  );
  return await _fetchAndGetFirstPlugin(
    getPluginListUrl({ pluginId, channel, product, productVersion: targetVersion })
  );
}
