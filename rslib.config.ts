import type { RslibConfig } from "@rslib/core";
import { parseArgs } from "@std/cli/parse-args";
import { type NamedLibConfig, extractLabels } from "./BUILD.helpers";

const args = _parseArgs();

export default async () => {
  const labels = await extractLabels<NamedLibConfig>(args.labels, { ignore: ["**/dist/**"] });
  return {
    output: { cleanDistPath: true, target: "node" },
    lib: labels.map((v) => v.config),
  } satisfies RslibConfig;
};

function _parseArgs() {
  const argv = parseArgs(process.argv, {
    "--": true,
  })["--"];

  const args = parseArgs(argv, {});
  return {
    labels: args._,
  } as {
    labels: string[];
  };
}
