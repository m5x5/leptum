import * as React from "react"
import { CheckIcon } from "@heroicons/react/solid"
import { cn } from "../../lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "size"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** default: pill 16px; lg: squarer 20px for routine cards */
  boxSize?: "default" | "lg"
  /**
   * Routine header: label stays only as wide as the box; box is top-aligned in a min-h tap row
   * so it lines up with the title line instead of floating in the vertical center.
   */
  inlineAlign?: boolean
  /** Drop the 44px square tap padding so the box hugs its bounding label. */
  compact?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, boxSize = "default", inlineAlign = false, compact = false, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
    }

    const box =
      boxSize === "lg"
        ? "h-5 w-5 rounded-md border-2 border-primary"
        : "h-4 w-4 rounded-full border border-primary"
    const icon = boxSize === "lg" ? "h-3.5 w-3.5" : "h-3 w-3"

    return (
      <label
        className={cn(
          "relative cursor-pointer",
          inlineAlign
            ? "inline-flex min-h-[44px] min-w-0 flex-col items-start justify-start px-0 pt-0.5"
            : compact
              ? "inline-flex items-center justify-center"
              : "inline-flex min-h-[44px] min-w-[44px] items-center justify-center"
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        />
        <div
          className={cn(
            "shrink-0 ring-offset-background transition-colors",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "flex items-center justify-center",
            box,
            disabled && "cursor-not-allowed opacity-50",
            checked
              ? "bg-primary text-primary-foreground"
              : "bg-background",
            className
          )}
        >
          {checked && (
            <CheckIcon className={cn(icon, "text-primary-foreground")} />
          )}
        </div>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
