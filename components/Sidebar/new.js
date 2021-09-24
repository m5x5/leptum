import {
  CalendarIcon,
  ClockIcon,
  ServerIcon,
  FlagIcon,
} from "@heroicons/react/solid";
import Link from "next/link";

export default function NewSidebar() {
  return (
    <div className="md:h-screen md:w-14 bg-black p-1 flex md:flex-col flex-row">
      <div className="px-4 py-1 w-12 h-12 select-none cursor-pointer">
        <Link href="/">
          <span
            className="text-white text-3xl"
            style={{ fontFamily: "Rye", fontWeight: "regular" }}
          >
            L
          </span>
        </Link>
      </div>
      <div className="flex-grow flex md:flex-col flex-row items-center justify-center">
        <Link href="/">
          <div className="text-gray-500 p-3 hover:text-blue-600 transition cursor-pointer">
            <ClockIcon className="h-6" />
          </div>
        </Link>
        <Link href="/impact">
          <div className="text-gray-500 p-3 hover:text-blue-600 transition cursor-pointer">
            <CalendarIcon className="h-6" />
          </div>
        </Link>
        <Link href="/stacks">
          <div className="text-gray-500 p-3 hover:text-blue-600 transition cursor-pointer">
            <ServerIcon className="h-6" />
          </div>
        </Link>
        <Link href="/goals">
          <div className="text-gray-500 p-3 hover:text-blue-600 transition cursor-pointer">
            <FlagIcon className="h-6" />
          </div>
        </Link>
      </div>
    </div>
  );
}
