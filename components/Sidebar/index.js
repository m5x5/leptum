import { useEffect, useState } from "react";

export default function Sidebar({ children, className, ...props }) {
  const [_time, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`
        flex-none
        flex-shrink-0
        bg-gray-100
        dark:bg-gray-800
        overflow-y-auto
        overflow-x-hidden
        transition-all
        transition-duration-200
        transition-timing-ease-in-out
        py-3
        max-h-60
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
