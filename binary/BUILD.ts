import { type NamedLibConfig, transformPackageJson } from "../BUILD.helpers.ts";

export const targets = [
  {
    name: "binary",
    format: "esm",
    syntax: "es2021",
    dts: false,
    autoExternal: false,
    autoExtension: false,

    source: {
      entry: {
        bun: getInput({ import: "./runtimes/bun/index.ts" }),
        node: getInput({ import: "./runtimes/node/index.ts" }),
        deno: getInput({ import: "./runtimes/deno/index.ts" }),
        index: "./binary/index.ts",
      },
    },

    output: {
      copy: [
        {
          from: "binary/manifest.json",
          to: "package.json",
          transform: (v) => transformPackageJson(v),
        },
        { from: "binary/README.md" },
      ],
      externals: {
        url: "node:url",
        buffer: "node:buffer",
        events: "node:events",
      },
      minify: true,
      sourceMap: { js: "source-map" },
      distPath: {
        root: "dist/bin",
        jsAsync: "internal",
      },
      filename: {
        js: "[name].mjs",
      },
    },
    tools: {
      rspack: [
        {
          plugins: [
            {
              // @ts-ignore
              apply(compiler) {
                new compiler.webpack.BannerPlugin({
                  entryOnly: true,
                  raw: true,
                  // @ts-ignore
                  banner: ({ filename }) => {
                    switch (filename) {
                      case "deno.mjs":
                        return "#!/usr/bin/env deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write";
                      case "bun.mjs":
                        return "#!/usr/bin/env bun";
                      case "node.mjs":
                        return "#!/usr/bin/env node";
                      case "index.mjs":
                        // is required by npx
                        return "#!/usr/bin/env node";
                    }
                    return "";
                  },
                }).apply(compiler);
                // @ts-ignore
                compiler.hooks.assetEmitted.tap("a", async (filename, info) => {
                  if (/(deno|bun|node)\.[cm]?js/.test(filename)) {
                    const { chmod } = await import("node:fs/promises");
                    await chmod(info.targetPath, 0o755);
                  }
                });
              },
            },
          ],
          optimization: {
            splitChunks: {
              cacheGroups: {
                sources: {
                  test: /(sources|node_modules)/,
                  name: "sources",
                  chunks: /(node|bun|deno)/,
                  filename: "internal/[name].mjs",
                  minSize: 0,
                  reuseExistingChunk: true,
                },
              },
            },
          },
        },
      ],
    },
  },
] as NamedLibConfig[];

function getInput(options: { import: string; banner?: string; chunkName?: string }) {
  const chunkNameComment = options.chunkName
    ? `/* webpackChunkName: ${JSON.stringify(options.chunkName)} */`
    : "";
  const code = `${options.banner}
import(${chunkNameComment}${JSON.stringify(options.import)})
`;

  return `data:text/typescript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
}
