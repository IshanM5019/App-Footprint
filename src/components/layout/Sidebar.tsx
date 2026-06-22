import { Map, FileText, MessageCircle, Moon, Sun, Compass, Search } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeSwitch } from "@/components/ui/Switch";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useAuth } from "@/contexts/AuthContext";

export type ViewId = "map" | "feed" | "search" | "drafts" | "inbox" | "profile";

interface SidebarProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  unreadInbox: number;
  pendingDrafts: number;
}

const navItems: { id: ViewId; label: string; icon: typeof Map }[] = [
  { id: "map", label: "Explore Map", icon: Map },
  { id: "feed", label: "Explore Feed", icon: Compass },
  { id: "search", label: "Search Profiles", icon: Search },
  { id: "drafts", label: "Daily Drafts", icon: FileText },
  { id: "inbox", label: "Inbox", icon: MessageCircle },
];

export function Sidebar({
  activeView,
  onViewChange,
  isDark,
  onToggleTheme,
  unreadInbox,
  pendingDrafts,
}: SidebarProps) {
  const { profile, user } = useAuth();

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const username = profile?.username ?? "explorer";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="hidden lg:flex flex-col w-[260px] h-full border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] shrink-0">
      {/* Logo */}
      <div className="px-6 h-[72px] flex items-center gap-3 border-b border-[var(--border-primary)]">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
          <span className="text-white text-lg">👣</span>
        </div>
        <div>
          <h1 className="text-base font-bold text-[var(--text-primary)] tracking-tight leading-none">Footprints</h1>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">Social Atlas</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[11px] uppercase tracking-widest font-semibold text-[var(--text-tertiary)]">
          Navigation
        </p>
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          const badge = item.id === "inbox" ? unreadInbox : item.id === "drafts" ? pendingDrafts : 0;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer relative",
                isActive
                  ? "bg-brand-500/10 text-brand-500"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand-500" />
              )}
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
              {badge > 0 && <Badge count={badge} className="ml-auto" />}
            </button>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className="px-4 py-3 border-t border-[var(--border-primary)]">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
            <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
          </div>
          <ThemeSwitch checked={isDark} onCheckedChange={onToggleTheme} />
        </div>
      </div>

      {/* User */}
      <button
        onClick={() => onViewChange("profile")}
        className={cn(
          "w-full text-left px-4 py-4 border-t border-[var(--border-primary)] flex items-center gap-3 hover:bg-[var(--bg-tertiary)] transition-colors duration-250 cursor-pointer outline-none focus-visible:bg-[var(--bg-tertiary)]",
          activeView === "profile" && "bg-brand-500/5 border-l-3 border-brand-500"
        )}
      >
        <Avatar initials={initials} colorClass="bg-gradient-to-br from-sky-400 to-blue-600" size="md" online />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold text-[var(--text-primary)] truncate", activeView === "profile" && "text-brand-500 font-bold")}>{fullName}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">@{username}</p>
        </div>
      </button>
    </aside>
  );
}
