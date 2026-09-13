// A minimal push/pull bridge from "events arrive over time" to a JS async
// iterable — no extension APIs involved, safe to use in the page's own MAIN
// world. Consumption looks like real SDK streaming: `for await` ends when
// the producer calls `close()`, and throws whatever error `fail()` is given.

export interface AsyncStreamQueue<T> extends AsyncIterable<T> {
  push(value: T): void;
  close(): void;
  fail(error: Error): void;
}

export function createAsyncStreamQueue<T>(): AsyncStreamQueue<T> {
  const buffered: T[] = [];
  let waiter: (() => void) | null = null;
  let closed = false;
  let failure: Error | null = null;

  function wake() {
    if (waiter) {
      const resolve = waiter;
      waiter = null;
      resolve();
    }
  }

  return {
    push(value: T) {
      buffered.push(value);
      wake();
    },
    close() {
      closed = true;
      wake();
    },
    fail(error: Error) {
      failure = error;
      closed = true;
      wake();
    },
    async *[Symbol.asyncIterator]() {
      while (true) {
        if (buffered.length > 0) {
          yield buffered.shift() as T;
          continue;
        }
        if (failure) throw failure;
        if (closed) return;
        await new Promise<void>((resolve) => {
          waiter = resolve;
        });
      }
    },
  };
}
