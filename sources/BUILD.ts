import { defaults, defaultsDeep, pick } from "lodash-es";
import { type NamedLibConfig, transformPackageJson } from "../BUILD.helpers.ts";

export const targets = (
  [
    {
      name: "esm",
      format: "esm",
      autoExtension: false,
      output: { filename: { js: "[name].mjs" } },
    },
    {
      name: "cjs",
      format: "cjs",
      autoExtension: false,
      output: { filename: { js: "[name].cjs" } },
    },
  ] as NamedLibConfig[]
)
  .map<NamedLibConfig>((v) => {
    return defaultsDeep(v, {
      bundle: false,
      syntax: "es2021",
      dts: false,
      source: {
        entry: {
          main: ["sources/**/*.ts", "!**/BUILD.ts"],
        },
      },
      output: {
        distPath: { root: "dist/lib" },
        sourceMap: { js: "source-map" },
      },
    });
  })
  .concat([
    {
      name: "pkg",
      format: "esm",
      syntax: "es2021",
      dts: { bundle: false },
      source: {
        entry: {
          main: [],
        },
      },
      output: {
        distPath: { root: "dist/lib" },
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
  ]);
