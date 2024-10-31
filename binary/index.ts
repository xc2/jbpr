if (typeof Bun !== "undefined") {
  await import(/* webpackIgnore: true */ "./bun.mjs");
} else if (typeof Deno !== "undefined") {
  await import(/* webpackIgnore: true */ "./deno.mjs");
} else {
  await import(/* webpackIgnore: true */ "./node.mjs");
}

export {};
