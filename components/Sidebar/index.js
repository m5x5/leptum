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
        overflow-y-auto
        overflow-x-hidden
        transition-all
        transition-duration-200
        transition-timing-ease-in-out
        ${className}
      `}
      {...props}
    >
      <div className="p-3 w-full shadow-md gap-3 flex items-center mb-3">
        <div className="bg-gray-400 inline-block p-2 rounded-xl">
          <CalendarIcon className="w-6 h-6 text-gray-900" />
        </div>
        <h3 className="text-xl font-semibold inline-block">Leptum</h3>
      </div>
      {children}
    </div>
  );
}
