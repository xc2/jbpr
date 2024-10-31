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
          bun: "./runtimes/bun/index.ts",
          node: "./runtimes/node/index.ts",
          deno: "./runtimes/deno/index.ts",
        },
      },
      tools: {
        rspack: [
          {
            optimization: {
              splitChunks: {
                cacheGroups: {
                  sources: {
                    test: /(sources|node_modules)/,
                    name: "sources",
                    chunks: "all",
                    filename: "internal/[name].js",
                    minChunks: 3,
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
        },
        filename: {
          js: "[name].mjs",
        },
      },
    },
    {
      format: "cjs",
      syntax: "es2021",
      autoExternal: false,
      autoExtension: false,
      source: {
        entry: {
          index: "./binary/index.ts",
        },
      },
      output: {
        copy: ["binary/package.json"],
        distPath: {
          root: "releases/binary",
        },
      },
    },
  ],
});
