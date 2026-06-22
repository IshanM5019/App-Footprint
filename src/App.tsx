import { useState, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { MapView } from "@/views/MapView";
import { DailyDraftsView } from "@/views/DailyDraftsView";
import { InboxView } from "@/views/InboxView";
import { AuthView } from "@/views/AuthView";
import { FeedView } from "@/views/FeedView";
import { SearchView } from "@/views/SearchView";
import { ProfileView } from "@/views/ProfileView";
import { useDrafts } from "@/hooks/useDrafts";
import { useConversations } from "@/hooks/useChat";
import type { ViewId } from "@/components/layout/Sidebar";
import { ProfileModal } from "@/components/profile/ProfileModal";
import type { Place } from "@/types/database";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [activeView, setActiveView] = useState<ViewId>("map");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [focusedPlace, setFocusedPlace] = useState<Place | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // These hooks run only when authenticated
  const { pending } = useDrafts();
  const { conversations } = useConversations();

  const unreadInbox = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  const pendingDrafts = pending.length;

  const handleNavigateToInbox = useCallback((convoId?: string) => {
    setFocusedPlace(null);
    if (convoId) {
      setActiveConversationId(convoId);
    }
    setActiveView("inbox");
  }, []);

  const handleViewOnMap = useCallback((place: Place) => {
    setFocusedPlace(place);
    setActiveView("map");
  }, []);

  const handleViewChange = useCallback((view: ViewId) => {
    if (view !== "map") {
      setFocusedPlace(null);
    }
    setActiveView(view);
  }, []);

  // Loading state
  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg mx-auto mb-3 animate-pulse">
            <span className="text-white text-xl">👣</span>
          </div>
          <p className="text-sm text-[var(--text-tertiary)]">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated → show auth page
  if (!user) {
    return <AuthView />;
  }

  // Authenticated → dashboard
  return (
    <>
      <AppShell
        activeView={activeView}
        onViewChange={handleViewChange}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        unreadInbox={unreadInbox}
        pendingDrafts={pendingDrafts}
      >
        {activeView === "map" && (
          <MapView
            isDark={isDark}
            onNavigateToInbox={handleNavigateToInbox}
            onOpenProfile={() => handleViewChange("profile")}
            initialSelectedPlace={focusedPlace}
          />
        )}
        {activeView === "feed" && (
          <FeedView
            onViewOnMap={handleViewOnMap}
            onNavigateToInbox={handleNavigateToInbox}
            onOpenProfile={() => handleViewChange("profile")}
          />
        )}
        {activeView === "search" && (
          <SearchView
            onViewOnMap={handleViewOnMap}
            onNavigateToInbox={handleNavigateToInbox}
            onOpenProfile={() => handleViewChange("profile")}
            isDark={isDark}
          />
        )}
        {activeView === "drafts" && (
          <DailyDraftsView onOpenProfile={() => handleViewChange("profile")} />
        )}
        {activeView === "inbox" && (
          <InboxView
            onOpenProfile={() => handleViewChange("profile")}
            initialConversationId={activeConversationId}
            onClearInitialConversationId={() => setActiveConversationId(null)}
          />
        )}
        {activeView === "profile" && (
          <ProfileView onViewOnMap={handleViewOnMap} isDark={isDark} />
        )}
      </AppShell>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
