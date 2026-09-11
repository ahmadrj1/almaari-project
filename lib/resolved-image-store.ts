export interface ResolvedImage {
  fileName: string;
  file: File;
  colorName: string;
}

declare global {
  interface Window {
    __resolvedImageStore?: Map<string, ResolvedImage[]>;
  }
}

function getStore(): Map<string, ResolvedImage[]> {
  if (typeof window === "undefined") {
    return new Map();
  }
  if (!window.__resolvedImageStore) {
    window.__resolvedImageStore = new Map();
  }
  return window.__resolvedImageStore;
}

export const resolvedImageStore = {
  get: (id: string): ResolvedImage[] | undefined => getStore().get(id),
  set: (id: string, val: ResolvedImage[]) => getStore().set(id, val),
  clear: () => getStore().clear(),
  delete: (id: string) => getStore().delete(id),
};
