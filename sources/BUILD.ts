import { defaults, defaultsDeep, pick } from "lodash-es";
import { type NamedLibConfig, transformPackageJson } from "../BUILD.helpers.ts";

export const targets = (
  [
    {
      name: "esm",
      format: "esm",
      dts: { bundle: false },
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
    { name: "cjs", format: "cjs", dts: false },
  ] as NamedLibConfig[]
).map<NamedLibConfig>((v) => {
  return defaultsDeep(v, {
    target: "node",
    bundle: false,
    syntax: "es2021",
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
});
