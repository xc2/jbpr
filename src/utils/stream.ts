export function passThrough({
  startRead,
}: {
  startRead?: (
    readableController: ReadableStreamDefaultController,
    writableController: WritableStreamDefaultController
  ) => void;
}): ReadableWritablePair {
  let readableController: ReadableStreamDefaultController,
    writableController: WritableStreamDefaultController;
  let started = false;
  const readable = new ReadableStream({
    start(controller) {
      readableController = controller;
    },
    pull() {
      if (started) {
        return;
      }
      started = true;
      startRead?.(readableController, writableController);
    },
  });
  const writable = new WritableStream({
    start(controller) {
      writableController = controller;
    },
    write(chunk, c) {
      try {
        readableController.enqueue(chunk);
      } catch (e) {
        readableController.error(e);
      }
    },
  });

  return { readable, writable };
}

export function unstream<T extends Uint8Array | ArrayBuffer | string = Uint8Array>(
  transform: (data: Blob) => T | PromiseLike<T>
) {
  let all: T[] = [];
  return new TransformStream<T>({
    transform(chunk) {
      all.push(chunk);
    },
    async flush(controller) {
      const blob = new Blob(all);
      all = [];
      const fin = await transform(blob);
      controller.enqueue(fin);
    },
  });
}

export function unstreamText(transform: (data: string) => string | PromiseLike<string>) {
  return unstream(async (blob) => {
    const text = new TextDecoder().decode(await blob.arrayBuffer());

    return new TextEncoder().encode(await transform(text));
  });
}
