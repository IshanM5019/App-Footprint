import { Map, FileText, MessageCircle, Compass, Search, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import type { ViewId } from "./Sidebar";

interface BottomNavProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  unreadInbox: number;
  pendingDrafts: number;
}

const navItems: { id: ViewId; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Map", icon: Map },
  { id: "feed", label: "Feed", icon: Compass },
  { id: "search", label: "Search", icon: Search },
  { id: "drafts", label: "Drafts", icon: FileText },
  { id: "inbox", label: "Inbox", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

export function BottomNav({ activeView, onViewChange, unreadInbox, pendingDrafts }: BottomNavProps) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-heavy">
      <div className="flex items-center justify-around h-[68px] px-4 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const badge = item.id === "inbox" ? unreadInbox : item.id === "drafts" ? pendingDrafts : 0;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 flex-1 sm:flex-initial sm:w-16 py-1.5 rounded-xl transition-all duration-200 cursor-pointer",
                isActive
                  ? "text-brand-500"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              )}
            >
              {isActive && (
                <div className="absolute -top-1 w-8 h-[3px] rounded-full bg-brand-500" />
              )}
              <div className="relative">
                <item.icon className={cn("h-5 w-5 transition-transform duration-200", isActive && "scale-110")} />
                {badge > 0 && (
                  <Badge count={badge} className="absolute -top-2 -right-3" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
