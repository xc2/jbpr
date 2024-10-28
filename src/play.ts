import { getZipTransformStream } from "./utils/zip";

import { rm } from "node:fs/promises";

await rm("plugin.zip", { force: true });
await rm("github-copilot-intellij", { recursive: true, force: true });
const file = Bun.file(Bun.argv[2]);

const target = file.stream().pipeThrough(
  getZipTransformStream((entry) => {
    if (entry.filename.endsWith(".jar")) {
      return getZipTransformStream((entry) => {
        if (entry.filename === "META-INF/plugin.xml") {
          // console.log("input", entry);
          // return unstreamText((text) => {
          //   text = text.replace(/ since-build="[^"]+"/, "");
          //   text = text.replace(/ until-build="[^"]+"/, "");
          //   return text;
          // });
        } else if (entry.filename === "META-INF/MANIFEST.MF") {
          //           return unstreamText((text) => {
          //             // text = text.replace(/ since-build="[^"]+"/, "");
          //             return `Manifest-Version: 1.0
          // Created-By: 21.0.4 (Microsoft)
          // `;
          //           });
        }
      });
    }
  })
);

await Bun.readableStreamToBlob(target).then((blob) => {
  return Bun.write("plugin.zip", blob);
});
