import { CalendarIcon } from "@heroicons/react/outline";
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
        h-screen
        bg-gray-100
        dark:bg-gray-800
        overflow-y-auto
        overflow-x-hidden
        transition-all
        transition-duration-200
        transition-timing-ease-in-out
        pt-3
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
