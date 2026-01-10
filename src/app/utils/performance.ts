export const measurePerformance = (name: string) => {
  const start = performance.now();
  return {
    end: () => {
      const end = performance.now();
      const duration = end - start;
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
      if (duration > 100) {
        console.warn(`⚠️ Slow operation detected: ${name}`);
      }
      return duration;
    }
  };
};

export const logCacheStats = () => {
  const cache = (window as any).__apiCache || new Map();
  console.log('📊 Cache Stats:', {
    size: cache.size,
    entries: Array.from(cache.entries()).map(([key, value]: any) => ({
      key: key.split(':')[1],
      age: Date.now() - value.timestamp,
      size: JSON.stringify(value.data).length
    }))
  });
};