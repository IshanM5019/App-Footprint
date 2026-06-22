import { AnimatePresence, motion } from "framer-motion";
import { Sidebar, type ViewId } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import type { ReactNode } from "react";

interface AppShellProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  unreadInbox: number;
  pendingDrafts: number;
  children: ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export function AppShell({
  activeView,
  onViewChange,
  isDark,
  onToggleTheme,
  unreadInbox,
  pendingDrafts,
  children,
}: AppShellProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar
        activeView={activeView}
        onViewChange={onViewChange}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        unreadInbox={unreadInbox}
        pendingDrafts={pendingDrafts}
      />

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav
        activeView={activeView}
        onViewChange={onViewChange}
        unreadInbox={unreadInbox}
        pendingDrafts={pendingDrafts}
      />
    </div>
  );
}
