import * as React from "react"
import { CheckIcon } from "@heroicons/react/solid"
import { cn } from "../../lib/utils"

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked)
      }
    }

    return (
      <label className="relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer">
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
            "h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background transition-colors",
            "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
            "flex items-center justify-center",
            disabled && "cursor-not-allowed opacity-50",
            checked
              ? "bg-primary text-primary-foreground"
              : "bg-background",
            className
          )}
        >
          {checked && (
            <CheckIcon className="h-3 w-3 text-primary-foreground" />
          )}
        </div>
      </label>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }
