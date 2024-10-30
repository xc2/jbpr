import {
  type Entry,
  type EntryGetDataOptions,
  ZipReader,
  type ZipReaderConstructorOptions,
  ZipWriter,
  type ZipWriterAddDataOptions,
  type ZipWriterConstructorOptions,
} from "@zip.js/zip.js";
import { pick } from "lodash-es";
import { passThrough } from "./stream";

export function getZipTransformStream(
  getTransformer?: (entry: Entry) =>
    | (Partial<ReadableWritablePair> & {
        read?: EntryGetDataOptions;
        write?: ZipWriterAddDataOptions | ((entry: Entry) => ZipWriterAddDataOptions);
      })
    | undefined
    | null
    // biome-ignore lint: a
    | void,
  {
    signal,
    ...options
  }: {
    signal?: AbortSignal;
    reader?: ZipReaderConstructorOptions;
    writer?: ZipWriterConstructorOptions;
  } = {}
): ReadableWritablePair {
  const sourceStream = new TransformStream();
  const zipFileStream = passThrough({
    async startRead(controller) {
      try {
        for await (const entry of reader.getEntriesGenerator()) {
          const { read, write, readable, writable } = getTransformer?.(entry) || {};

          if (readable && writable) {
            const r = readEntry(entry, { passThrough: false, ...read }).pipeThrough({
              readable,
              writable,
            });
            await writer.add(
              entry.filename,
              r,
              getAddFileOptions(entry, { passThrough: false }, write)
            );
          } else {
            const r = readEntry(entry, { passThrough: true, ...read });
            await writer.add(
              entry.filename,
              r,
              getAddFileOptions(entry, { passThrough: true }, write)
            );
          }
        }
        await writer.close();
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });
  const reader = new ZipReader(sourceStream.readable, { signal, ...options?.reader });
  const writer = new ZipWriter(zipFileStream.writable, { signal, ...options?.writer });

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
        try {
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      }
    },
  });
  return r.readable;
}

export function getAddFileOptions(
  entry: Entry,
  defaults?: ZipWriterAddDataOptions,
  userOptions?: ZipWriterAddDataOptions | ((entry: Entry) => ZipWriterAddDataOptions)
) {
  const user = typeof userOptions === "function" ? userOptions(entry) : userOptions;
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
  const options: Partial<ZipWriterAddDataOptions> = { ...pick(entry, keys), ...defaults, ...user };
  if (entry.extraField && !options.extraField) {
    // entry.extraField is actually a Map<string, {type, data}>
    options.extraField = new Map(
      Array.from(entry.extraField.entries()).map(([k, v]) => [k, (v as any)?.data || v])
    );
  }
  if (options.passThrough) {
    if (!options.uncompressedSize) {
      options.uncompressedSize = entry.uncompressedSize;
    }
    if (!options.signature) {
      options.signature = entry.signature;
    }
  } else {
    // passThrough makes zip64 default to true, which might cause broken zip
    // so we force it to false when it is not explicitly set to true
    if (options.zip64 !== true) {
      options.zip64 = false;
    }
  }

  return options;
}
