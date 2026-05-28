export type FileStoragePort = {
  put(input: { key: string; body: ArrayBuffer; contentType: string }): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; contentType: string } | null>;
  delete(key: string): Promise<void>;
};
