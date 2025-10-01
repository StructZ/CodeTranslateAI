export function hashCode(str) {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    let chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return hash;
}

export async function saveToCache(key, data, daysToExpire) {
  const expirationMs = daysToExpire * 24 * 60 * 60 * 1000;
  const cacheItem = { data: data, expiresAt: Date.now() + expirationMs };
  await chrome.storage.local.set({ [key]: cacheItem });
}

export async function getFromCache(key) {
  const result = await chrome.storage.local.get(key);
  const cacheItem = result[key];
  if (!cacheItem || Date.now() > cacheItem.expiresAt) {
    if (cacheItem) await chrome.storage.local.remove(key);
    return null;
  }
  return cacheItem.data;
}
