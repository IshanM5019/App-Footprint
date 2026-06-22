import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/cn";

interface AvatarProps {
  initials: string;
  colorClass?: string;
  size?: "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-full w-full text-xl md:text-2xl",
};

export function Avatar({ initials, colorClass = "bg-brand-500", size = "md", online, className }: AvatarProps) {
  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <AvatarPrimitive.Root
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold text-white select-none overflow-hidden",
          sizeMap[size],
          colorClass
        )}
      >
        <AvatarPrimitive.Fallback className="flex items-center justify-center w-full h-full" delayMs={0}>
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {online !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full border-2 border-[var(--bg-primary)]",
            size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
            online ? "bg-accent-500 pulse-dot" : "bg-surface-400"
          )}
        />
      )}
    </div>
  );
}
