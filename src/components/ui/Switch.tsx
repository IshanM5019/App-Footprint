import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

interface ThemeSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function ThemeSwitch({ checked, onCheckedChange, className }: ThemeSwitchProps) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-[var(--border-primary)] transition-colors duration-300",
        checked ? "bg-brand-500" : "bg-[var(--bg-tertiary)]",
        className
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none flex items-center justify-center h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 will-change-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      >
        <span className="text-[10px]">{checked ? "🌙" : "☀️"}</span>
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
