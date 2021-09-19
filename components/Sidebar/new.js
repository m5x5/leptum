import { ClockIcon, TerminalIcon } from "@heroicons/react/outline";
import Link from "next/link";

export default function NewSidebar() {
  return (
    <div className="h-screen w-14 bg-black p-1 flex flex-col">
      <div className="px-4 py-1 w-12 h-12 rounded-md select-none">
        <span
          className="text-white text-3xl"
          style={{ fontFamily: "Rye", fontWeight: "regular" }}
        >
          L
        </span>
      </div>
      <div className="flex-grow flex flex-col items-center justify-center">
        <Link href="/">
          <div className="text-gray-400 p-3 hover:text-blue-600 transition cursor-pointer">
            <ClockIcon className="h-7" />
          </div>
        </Link>
        <div className="text-gray-400 p-3 hover:text-blue-600 transition cursor-pointer">
          <TerminalIcon className="h-7" />
        </div>
      </div>
    </div>
  );
}
