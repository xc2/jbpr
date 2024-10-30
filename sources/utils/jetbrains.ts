export function getPluginListUrl({
  pluginId,
  channel,
  build,
  product,
  productVersion,
}: {
  pluginId: string;
  channel?: string;
  build?: string;
  product?: string;
  productVersion?: string;
}) {
  const u = new URL("https://plugins.jetbrains.com/plugins/list");
  u.searchParams.set("pluginId", pluginId);
  if (channel) {
    u.searchParams.set("channel", channel);
  }
  if (build) {
    u.searchParams.set("build", build);
  }
  if (product && productVersion) {
    u.searchParams.set("build", `${product}-${productVersion}`);
  }
  return u;
}

export function getPluginDownloadUrl({
  pluginId,
  version,
  channel,
}: {
  pluginId: string;
  version: string;
  channel?: string;
}) {
  const u = new URL("https://plugins.jetbrains.com/plugin/download");
  u.searchParams.set("pluginId", pluginId);
  u.searchParams.set("version", version);
  if (channel && channel !== "stable") {
    u.searchParams.set("channel", channel);
  }
  return u;
}

export function getProductInfo(build?: string) {
  const [product, ...rest] = (build ?? "").split("-");
  const productVersion = rest.join("-");
  if (product && productVersion) {
    return [product, productVersion] as const;
  } else {
    return [null, null] as const;
  }
}
