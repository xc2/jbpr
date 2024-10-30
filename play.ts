import { unstreamText } from "./sources/utils/stream.ts";
import { getZipTransformStream } from "./sources/utils/zip.ts";

const file = Bun.file(Bun.argv[2]!);

const target = file.stream().pipeThrough(
  getZipTransformStream((entry) => {
    if (entry.filename.endsWith(".jar")) {
      return getZipTransformStream((entry) => {
        if (entry.filename === "META-INF/plugin.xml") {
          return unstreamText((text) => {
            text = text.replace(/ until-build="[^"]+"/, "");
            return text;
          });
        }
      });
    }
  })
);

await Bun.readableStreamToBlob(target).then((blob) => {
  return Bun.write("plugin.zip", blob);
});
