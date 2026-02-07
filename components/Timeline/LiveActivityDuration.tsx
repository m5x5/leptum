import { useState, useEffect } from "react";

interface LiveActivityDurationProps {
  startTime: number;
  formatDuration: (startTime: number, endTime: number) => string;
}

export function LiveActivityDuration({ startTime, formatDuration }: LiveActivityDurationProps) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-sm px-3 py-1 rounded-full font-medium bg-primary/10 text-primary">
      {formatDuration(startTime, currentTime)}
    </span>
  );
}
