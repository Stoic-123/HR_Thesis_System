import * as React from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
  onCheckedChange?: (checked: boolean) => void
  checked?: boolean
}

function Checkbox({ className, checked, onCheckedChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      className={cn(
        "peer size-4 shrink-0 rounded border border-primary outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 accent-primary cursor-pointer",
        className
      )}
      {...props}
    />
  )
}

export { Checkbox }
