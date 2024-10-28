import {
  type Entry,
  type EntryGetDataOptions,
  ZipReader,
  ZipWriter,
  type ZipWriterAddDataOptions,
  configure,
} from "@zip.js/zip.js";
import { pick } from "lodash-es";
import { passThrough } from "./stream";
configure({
  useWebWorkers: false,
});

export function getZipTransformStream(
  getTransformer?: (
    entry: Entry
    // biome-ignore lint: a
  ) => ReadableWritablePair | undefined | null | void
): ReadableWritablePair {
  const sourceStream = new TransformStream();
  const zipFileStream = passThrough({
    async startRead(controller) {
      try {
        for await (const entry of reader.getEntriesGenerator()) {
          const transformer = getTransformer?.(entry);

          if (transformer) {
            const r = readEntry(entry).pipeThrough(transformer);
            const out = await writer.add(entry.filename, r, mapEntryToAddFileOptions(entry, false));
          } else {
            const r = readEntry(entry, { passThrough: true });
            await writer.add(entry.filename, r, mapEntryToAddFileOptions(entry, true));
          }
        }
        await writer.close();
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  const reader = new ZipReader(sourceStream.readable, {});
  const writer = new ZipWriter(zipFileStream.writable, {
    keepOrder: true,
    level: 9,
  });

  return {
    readable: zipFileStream.readable,
    writable: sourceStream.writable,
  };
}

export function readEntry(entry: Entry, options?: EntryGetDataOptions): ReadableStream {
  const r = passThrough({
    async startRead(controller, writableController) {
      try {
        await entry.getData?.(r.writable, { signal: writableController.signal, ...options });
      } finally {
        controller.close();
      }
    },
  });
  return r.readable;
}

export function mapEntryToAddFileOptions(entry: Entry, passTrough: boolean = false) {
  const keys: (keyof Entry & keyof ZipWriterAddDataOptions)[] = [
    "directory",
    "comment",
    "zip64",
    "lastModDate",
    "lastAccessDate",
    "creationDate",
    "zipCrypto",
    "version",
    "versionMadeBy",
    "externalFileAttribute",
    "internalFileAttribute",
    "encrypted",
    "offset",
    "compressionMethod",
    "msDosCompatible",
  ];
  if (passTrough) {
    keys.push("uncompressedSize", "signature");
  }
  const options: Partial<ZipWriterAddDataOptions> = pick(entry, keys);
  if (entry.extraField) {
    // entry.extraField is actually a Map<string, {type, data}>
    options.extraField = new Map(
      Array.from(entry.extraField.entries()).map(([k, v]) => [k, (v as any)?.data || v])
    );
  }
  if (passTrough) {
    options.passThrough = true;
  } else {
  }
  options.level = 9;

  return options;
}
