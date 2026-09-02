import * as React from "react";
import { cn } from "../../lib/utils";

type Variant = "default" | "secondary" | "destructive" | "outline" | "warning" | "info";

const variantClasses: Record<Variant, string> = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-red-500/15 text-red-500 hover:bg-red-500/25",
  warning: "border-transparent bg-orange-500/15 text-orange-500 hover:bg-orange-500/25",
  info: "border-transparent bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
  outline: "text-foreground",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
