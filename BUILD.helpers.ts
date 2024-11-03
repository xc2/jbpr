import * as NodePath from "node:path";
import { dirname, relative } from "node:path";
import type { LibConfig } from "@rslib/core";
import { type GlobOptionsWithFileTypesUnset, glob, globSync } from "glob";
import { defaults, keyBy, mapValues, pick } from "lodash-es";
import type { PackageJson } from "type-fest";

export interface NamedLibConfig extends LibConfig {
  name: string;
}

export async function transformPackageJson(
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

export const SpecialTargets = {
  ALL: Symbol.for("ALL"),
  DEFAULT: Symbol.for("DEFAULT"),
} as const;

export interface ParseLabel {
  negative: boolean;
  absolute: boolean;
  directory: string;
  includeSubDirectories: boolean;
  target: symbol | string;
}
export function parseLabel(label: string): ParseLabel | null {
  const [match, optionalNegative, optionalSlash, directory, optionalTarget] =
    label.match(
      // 1   2222   33333      44
      /^(-)?(\/\/)?([^:]*)(?::(.+))?/
    ) || [];
  if (!match) {
    return null;
  }

  let relative = directory.replace(/\/+$/, "");
  let includeSubDirectories = false;
  if (directory.endsWith("...")) {
    relative = directory.slice(0, -4);
    includeSubDirectories = true;
  }
  let target: symbol | string;
  if (optionalTarget) {
    if (["*", "all", "all-targets"].includes(optionalTarget)) {
      target = SpecialTargets.ALL;
    } else {
      target = optionalTarget;
    }
  } else {
    if (includeSubDirectories) {
      target = SpecialTargets.ALL;
    } else {
      target = SpecialTargets.DEFAULT;
    }
  }

  return {
    negative: optionalNegative === "-",
    absolute: optionalSlash === "//",
    directory: relative,
    includeSubDirectories,
    target,
  };
}

export function resolveLabel(label: string | ParseLabel, workspaceRoot: string, directory: string) {
  const parsed = typeof label === "string" ? parseLabel(label) : label;
  if (!parsed) {
    throw new Error("Cannot parse label: " + label);
  }
  const path = parsed.absolute
    ? NodePath.resolve(workspaceRoot, parsed.directory)
    : NodePath.resolve(workspaceRoot, directory);

  const target: string | true =
    parsed.target === SpecialTargets.DEFAULT
      ? NodePath.basename(path)
      : parsed.target === SpecialTargets.ALL
        ? true
        : (parsed.target as string);

  return {
    context: path,
    includeSubDirectories: parsed.includeSubDirectories,
    target,
    negative: parsed.negative,
  };
}

export function findBuildFiles(
  context: string,
  includeSubDirectories: boolean,
  globOptions: GlobOptionsWithFileTypesUnset,
  sync: true
): string[];
export function findBuildFiles(
  context: string,
  includeSubDirectories: boolean,
  globOptions?: GlobOptionsWithFileTypesUnset,
  sync?: false
): PromiseLike<string[]>;
export function findBuildFiles(
  context: string,
  includeSubDirectories: boolean,
  globOptions?: GlobOptionsWithFileTypesUnset,
  sync?: boolean
): string[] | PromiseLike<string[]> {
  const basePattern = "BUILD.{ts,mts,cts,js,mjs,cjs}";
  const pattern = includeSubDirectories ? `**/${basePattern}` : basePattern;
  const options = {
    ...globOptions,
    absolute: true,
    cwd: context,
  } satisfies GlobOptionsWithFileTypesUnset;
  return sync ? globSync(pattern, options) : glob(pattern, options);
}

export async function extractLabels<Config extends { name: string }>(
  _labels: string[],
  globOptions?: GlobOptionsWithFileTypesUnset
) {
  const includes: Record<string, string[] | true> = {};
  const excludes: Record<string, string[] | true> = {};
  const workspace = __dirname;
  const labels = _labels.map((label) => resolveLabel(label, workspace, ""));
  const hasPositive = labels.some((label) => !label.negative);
  if (!hasPositive) {
    labels.push(resolveLabel("//...", workspace, ""));
  }
  for (const label of labels) {
    const buildFiles = await findBuildFiles(label.context, label.includeSubDirectories, {
      ...globOptions,
      ignore: ["**/node_modules/**", ...(globOptions?.ignore as string[])],
    });
    const map = label.negative ? excludes : includes;
    for (const file of buildFiles) {
      if (label.target === true) {
        map[file] = true;
        continue;
      }
      if (map[file] === true) {
        continue;
      }

      map[file] = map[file] || [];
      map[file].push(label.target);
    }
  }
  const fin: { file: string; target: string; label: string; config: Config }[] = [];
  for (const [filepath, includesTargets] of Object.entries(includes)) {
    const excludesTargets = excludes[filepath] ?? [];
    const mod = await import(filepath);
    // exclude all targets
    if (excludesTargets === true) {
      continue;
    }
    const fullLabelPrefix = `//${relative(workspace, dirname(filepath))}`;
    const mutAllTargets = keyBy(
      ((mod.default?.targets || mod.targets || []) as Config[]).map((target) => {
        return {
          file: filepath,
          target: target.name,
          label: `${fullLabelPrefix}:${target.name}`,
          config: target,
        };
      }),
      "target"
    );
    // all target names before mutation
    const targetLabelMap = mapValues(mutAllTargets, (v) => v.label);

    // remove excluded targets
    for (const exclude of excludesTargets) {
      delete mutAllTargets[exclude];
    }

    if (includesTargets === true) {
      fin.push(...Object.values(mutAllTargets));
      continue;
    }

    for (const target of includesTargets) {
      if (!targetLabelMap[target]) {
        console.error(`Cannot find target ${fullLabelPrefix}:${target}, do you mean one of these?

${[`${fullLabelPrefix}:all`]
  .concat(Object.values(targetLabelMap))
  .map((v) => `- ${v}`)
  .join("\n")}
`);
        process.exit(1);
        throw new Error("unreachable");
      }
      fin.push(mutAllTargets[target]);
    }
  }
  return fin;
}
