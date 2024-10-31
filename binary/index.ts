if (typeof Bun !== "undefined") {
  await import(/* webpackIgnore: true */ "./bun.js");
} else {
  await import(/* webpackIgnore: true */ "./node.js");
}

export {};
