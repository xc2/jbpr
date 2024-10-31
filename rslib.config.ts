import { defineConfig } from "@rslib/core";

export default defineConfig({
  output: { cleanDistPath: true, target: "node" },
  lib: [
    {
      bundle: false,
      format: "esm",
      syntax: "es2021",
      dts: {},
      source: {
        entry: {
          main: ["sources/**"],
        },
      },
    },
    {
      bundle: false,
      format: "cjs",
      syntax: "es2021",
      dts: false,
      source: {
        entry: {
          main: ["sources/**"],
        },
      },
    },
    {
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
        },
      },
      tools: {
        rspack: [
          {
            plugins: [
              {
                apply(compiler) {
                  new compiler.webpack.BannerPlugin({
                    entryOnly: true,
                    raw: true,
                    banner: ({ filename }) => {
                      switch (filename) {
                        case "deno.mjs":
                          return "#!/usr/bin/env deno run --allow-net --unstable-sloppy-imports --allow-read --allow-write";
                        case "bun.mjs":
                          return "#!/usr/bin/env bun";
                        case "node.mjs":
                          return "#!/usr/bin/env node";
                      }
                      return "";
                    },
                  }).apply(compiler);
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
                    chunks: "all",
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
      output: {
        externals: {
          url: "node:url",
          buffer: "node:buffer",
          events: "node:events",
        },
        minify: false,
        distPath: {
          root: "releases/binary",
          jsAsync: "internal",
        },
        filename: {
          js: "[name].mjs",
        },
      },
    },
    {
      format: "esm",
      syntax: "es2021",
      autoExternal: false,
      autoExtension: false,
      source: {
        entry: {
          index: "./binary/index.ts",
        },
      },
      output: {
        copy: [{ from: "binary/manifest.json", to: "package.json" }],
        distPath: {
          root: "releases/binary",
        },
        filename: {
          js: "[name].mjs",
        },
      },
    },
  ],
});

function getInput(options: { import: string; banner?: string; chunkName?: string }) {
  const chunkNameComment = options.chunkName
    ? `/* webpackChunkName: ${JSON.stringify(options.chunkName)} */`
    : "";
  const code = `${options.banner}
import(${chunkNameComment}${JSON.stringify(options.import)})
`;

  return `data:text/typescript;base64,${Buffer.from(code, "utf8").toString("base64")}`;
}
