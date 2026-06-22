import { cn } from "@/lib/cn";

interface BadgeProps {
  count?: number;
  className?: string;
  dot?: boolean;
}

export function Badge({ count, className, dot }: BadgeProps) {
  if (dot) {
    return (
      <span
        className={cn(
          "inline-block h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-[var(--bg-primary)]",
          className
        )}
      />
    );
  }

  if (!count || count <= 0) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-danger-500 text-white text-[11px] font-bold leading-none",
        className
      )}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
