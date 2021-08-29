import { CalendarIcon } from "@heroicons/react/outline";

// Create tailwindcss sidebar
export default function Sidebar({ children, className, ...props }) {
  return (
    <div
      className={`
        flex-none
        flex-shrink-0
        w-64
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
      <div className="p-3 w-full shadow-md gap-3 flex items-center">
        <div className="bg-gray-400 inline-block p-2 rounded-xl">
          <CalendarIcon className="w-6 h-6 text-gray-900" />
        </div>
        <h3 className="text-xl font-semibold inline-block">Leptum</h3>
      </div>
      {children}
    </div>
  );
}
