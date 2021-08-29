import { CheckIcon, PlusIcon } from "@heroicons/react/solid";
import { useState } from "react";
import { useJobContext } from "../Job/Context";

export default function TaskList({ children }) {
  return <div className="mt-8">{children}</div>;
}
