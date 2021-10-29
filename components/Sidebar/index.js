import { useEffect, useState } from "react";
import { PlusIcon } from "@heroicons/react/solid";
import CreateJobModal from "../Modal/CreateJobModal";

export default function Sidebar({ children, className, ...props }) {
  const [_time, setTime] = useState(Date.now());
  const [showModal, setShowModal] = useState(false);

  const onClick = () => {
    setShowModal(true);
  };

  const hideModal = () => {
    setShowModal(false);
  };

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <>
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
        <div className="flex flex-row w-full justify-between items-center px-5 mb-3">
          <p className="text-xl">CRON Jobs</p>
          <PlusIcon
            className="w-6 text-gray-500 cursor-pointer"
            onClick={onClick}
          />
        </div>
        {children}
      </div>
      <CreateJobModal isOpen={showModal} onHide={hideModal} />
    </>
  );
}
