const buckets = new Map();

const nowMs = () => Date.now();

const pruneExpiredBuckets = (now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (!bucket || now - bucket.startedAt > bucket.windowMs) {
      buckets.delete(key);
    }
  }
};

export const checkRateLimit = (key, { windowMs = 60_000, max = 30 } = {}) => {
  const safeKey = String(key || "").trim() || "global";
  const now = nowMs();
  const existing = buckets.get(safeKey);

  if (!existing || now - existing.startedAt > existing.windowMs) {
    buckets.set(safeKey, { count: 1, startedAt: now, windowMs });
    if (buckets.size > 5000) pruneExpiredBuckets(now);
    return { allowed: true, retryAfterMs: 0, remaining: Math.max(max - 1, 0) };
  }

  existing.count += 1;
  const retryAfterMs = Math.max(existing.windowMs - (now - existing.startedAt), 0);
  if (existing.count > max) {
    return { allowed: false, retryAfterMs, remaining: 0 };
  }
  return { allowed: true, retryAfterMs: 0, remaining: Math.max(max - existing.count, 0) };
};

