import { useState, useEffect } from 'react';

const format = (ts) => {
  if (!ts) return null;
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 10)  return 'just now';
  if (diffSec < 60)  return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60)  return `${diffMin}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const useRelativeTime = (timestamp) => {
  const [label, setLabel] = useState(() => format(timestamp));

  useEffect(() => {
    setLabel(format(timestamp));
    if (!timestamp) return;
    const id = setInterval(() => setLabel(format(timestamp)), 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
};

export default useRelativeTime;
