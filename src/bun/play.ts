import { unstreamText } from "../utils/stream";
import { getZipTransformStream } from "../utils/zip";

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
