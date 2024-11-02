import { type LibConfig, defineConfig } from "@rslib/core";
import { defaults, defaultsDeep, pick } from "lodash-es";
import type { PackageJson } from "type-fest";
type Target = "lib" | "bin";

const TypeMagic = [] as LibConfig[];

// TODO: we can build a target filter then
const NamedConfig: Record<Target, LibConfig | LibConfig[]> = {
  // MARK: lib
  lib: TypeMagic.concat([
    {
      format: "esm",
      dts: {},
      output: {
        copy: [
          {
            from: "sources/manifest.json",
            to: "package.json",
            transform: (v) =>
              transformPackageJson(v, (f, t) => {
                return defaults(t, pick(f, ["dependencies"]));
              }),
          },
          { from: "sources/README.md" },
        ],
      },
    },
    { format: "cjs", dts: false },
  ]).map((v) => {
    return defaultsDeep(v, {
      bundle: false,
      syntax: "es2021",
      source: {
        entry: {
          main: ["sources/**/*.ts"],
        },
      },
      output: {
        sourceMap: { js: "source-map" },
      },
    });
  }),
  // MARK: binary
  bin: {
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
        { from: "README.md" },
      ],
      externals: {
        url: "node:url",
        buffer: "node:buffer",
        events: "node:events",
      },
      minify: true,
      sourceMap: { js: "source-map" },
      distPath: {
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
                      case "index.mjs":
                        // is required by npx
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
};

export default defineConfig({
  output: { cleanDistPath: true, target: "node" },
  lib: namedConfigToArray(NamedConfig),
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

async function transformPackageJson(
  input: Buffer,
  transform?: (project: PackageJson, thisPkg: PackageJson) => PackageJson | Promise<PackageJson>
) {
  const projectPkg = (await import("./package.json")) as PackageJson;

  const thisPkg = JSON.parse(input.toString("utf8")) as PackageJson;
  const copyFields = [
    "version",
    "author",
    "repository",
    "license",
    "homepage",
    "bugs",
    "contributors",
    "funding",
  ];
  defaults(thisPkg, pick(projectPkg, copyFields));

  await transform?.(projectPkg, thisPkg);
  return JSON.stringify(thisPkg, null, 2);
}

function namedConfigToArray(dict: Record<string, LibConfig | LibConfig[]>) {
  const lib: LibConfig[] = [];
  for (let [target, configs] of Object.entries(dict)) {
    configs = Array.isArray(configs) ? configs : [configs];
    for (let config of configs) {
      const c = defaultsDeep(config, {
        output: {
          distPath: {
            root: `dist/${target}`,
          },
        },
      });
      lib.push(c);
    }
  }
  return lib;
}
