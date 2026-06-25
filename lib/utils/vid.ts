import generateUUID from './uuidGenerator';

export const VID_STORAGE_KEY = 'vid';

export const getOrCreateVid = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const storedVid = localStorage.getItem(VID_STORAGE_KEY);
  if (storedVid) {
    return storedVid;
  }

  const vid =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : generateUUID();

  localStorage.setItem(VID_STORAGE_KEY, vid);
  return vid;
};
