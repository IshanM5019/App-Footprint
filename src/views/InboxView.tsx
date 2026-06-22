import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, MapPin, ExternalLink, Clock, ChevronUp, Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { categoryIcons } from "@/data/mock";
import { useConversations, useMessages } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import type { ConversationWithContext, Message, PlaceCategory } from "@/types/database";

// ── Helpers ──────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function formatMsgTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const avatarColors = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-blue-500",
  "bg-teal-500",
];

function pickColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ── Main Component ───────────────────────────────────────────

interface InboxViewProps {
  onOpenProfile?: () => void;
  initialConversationId?: string | null;
  onClearInitialConversationId?: () => void;
}

export function InboxView({ onOpenProfile, initialConversationId, onClearInitialConversationId }: InboxViewProps) {
  const { conversations, loading } = useConversations();
  const [activeConvo, setActiveConvo] = useState<ConversationWithContext | null>(null);
  const [showLocationPanel, setShowLocationPanel] = useState(true);
  const { user, profile } = useAuth();

  useEffect(() => {
    if (initialConversationId && conversations.length > 0) {
      const match = conversations.find((c) => c.id === initialConversationId);
      if (match) {
        setTimeout(() => {
          setActiveConvo(match);
          onClearInitialConversationId?.();
        }, 0);
      }
    }
  }, [initialConversationId, conversations, onClearInitialConversationId]);

  const fullName = profile?.full_name ?? user?.user_metadata?.full_name ?? "Explorer";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="h-full flex overflow-hidden">
      {/* Conversation List (left pane) */}
      <div
        className={cn(
          "h-full border-r border-[var(--border-primary)] bg-[var(--bg-secondary)] flex flex-col shrink-0 transition-all duration-300",
          activeConvo
            ? "hidden lg:flex lg:w-[320px]"
            : "w-full lg:w-[320px]"
        )}
      >
        {/* List Header */}
        <div className="px-5 h-[72px] flex items-center justify-between border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Inbox</h2>
            <span className="ml-2 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-full">
              {conversations.filter((c) => c.unreadCount > 0).length} new
            </span>
          </div>

          {/* Mobile profile avatar trigger */}
          <button
            onClick={onOpenProfile}
            className="lg:hidden h-10 w-10 rounded-full border border-[var(--border-primary)] shadow-[var(--shadow-sm)] flex items-center justify-center cursor-pointer transition-all active:scale-95 bg-[var(--bg-glass-heavy)] outline-none"
          >
            <Avatar initials={initials} colorClass="bg-gradient-to-br from-sky-400 to-blue-600" size="sm" />
          </button>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
          )}

          {!loading && conversations.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-[var(--text-tertiary)]">No conversations yet</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Inquire about a place to start chatting!</p>
            </div>
          )}

          {conversations.map((convo) => {
            const initials = getInitials(convo.otherUser.full_name ?? convo.otherUser.username);
            const color = pickColor(convo.otherUser.id);
            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvo(convo)}
                className={cn(
                  "w-full flex items-start gap-3 px-5 py-4 text-left transition-colors duration-150 cursor-pointer border-b border-[var(--border-secondary)]",
                  activeConvo?.id === convo.id
                    ? "bg-brand-500/8"
                    : "hover:bg-[var(--bg-tertiary)]"
                )}
              >
                <Avatar initials={initials} colorClass={color} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {convo.otherUser.full_name ?? convo.otherUser.username}
                    </p>
                    <span className="text-[11px] text-[var(--text-tertiary)] shrink-0 ml-2">
                      {convo.lastMessage ? formatTimeAgo(convo.lastMessage.created_at) : ""}
                    </span>
                  </div>
                  <p className="text-xs text-brand-400 truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {convo.footprint.venue_name}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">
                    {convo.lastMessage?.text_content ?? "No messages yet"}
                  </p>
                </div>
                {convo.unreadCount > 0 && (
                  <Badge count={convo.unreadCount} className="mt-1 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Chat (right pane) */}
      <AnimatePresence mode="wait">
        {activeConvo ? (
          <motion.div
            key={activeConvo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col h-full min-w-0"
          >
            <ChatWindow
              conversation={activeConvo}
              onBack={() => setActiveConvo(null)}
              showLocationPanel={showLocationPanel}
              onToggleLocationPanel={() => setShowLocationPanel(!showLocationPanel)}
            />
          </motion.div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-brand-500/10 flex items-center justify-center mx-auto mb-4">
                <Send className="h-7 w-7 text-brand-400" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">Select a conversation</p>
              <p className="text-sm text-[var(--text-tertiary)] mt-1">Choose from your inquiries to start chatting</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Chat Window ──────────────────────────────────────────────

function ChatWindow({
  conversation,
  onBack,
  showLocationPanel,
  onToggleLocationPanel,
}: {
  conversation: ConversationWithContext;
  onBack: () => void;
  showLocationPanel: boolean;
  onToggleLocationPanel: () => void;
}) {
  const { user } = useAuth();
  const { messages, sendMessage, loading } = useMessages(conversation.id);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue.trim();
    setInputValue("");
    await sendMessage(text);
  };

  const otherUser = conversation.otherUser;
  const fp = conversation.footprint;
  const otherInitials = getInitials(otherUser.full_name ?? otherUser.username);
  const otherColor = pickColor(otherUser.id);
  const cat = (fp.category ?? "landmark") as PlaceCategory;

  // Photo color map
  const photoColors: Record<PlaceCategory, string> = {
    cafe: "from-sky-400 to-indigo-600",
    park: "from-emerald-400 to-teal-600",
    restaurant: "from-orange-400 to-red-500",
    landmark: "from-red-500 to-rose-600",
    museum: "from-sky-400 to-blue-600",
    bar: "from-amber-400 to-orange-600",
    hotel: "from-purple-500 to-indigo-700",
  };
  const photoColor = photoColors[cat] ?? "from-sky-400 to-blue-600";

  return (
    <div className="flex h-full">
      {/* Chat Column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header with Context Tag */}
        <div className="shrink-0 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-3 px-4 h-[60px]">
            <button
              onClick={onBack}
              className="lg:hidden h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--text-secondary)]" />
            </button>
            <Avatar initials={otherInitials} colorClass={otherColor} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                {otherUser.full_name ?? otherUser.username}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={onToggleLocationPanel}
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>

          {/* Context Tag */}
          <div className="px-4 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-500/8 border border-brand-500/15">
              <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
              <p className="text-xs text-brand-400 font-medium truncate flex-1">
                Chatting about: <span className="text-brand-500 font-semibold">{fp.venue_name}</span>
              </p>
              <ExternalLink className="h-3 w-3 text-brand-400 shrink-0 cursor-pointer hover:text-brand-500" />
            </div>
          </div>
        </div>

        {/* Mobile Location Panel */}
        <AnimatePresence>
          {showLocationPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden overflow-hidden border-b border-[var(--border-primary)]"
            >
              <div className="px-4 py-3 bg-[var(--bg-tertiary)]">
                <div className="flex items-start gap-3">
                  <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${photoColor} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate">{fp.venue_name}</h4>
                    <p className="text-xs text-[var(--text-tertiary)] truncate mt-0.5">{fp.address}</p>
                  </div>
                  <button
                    onClick={onToggleLocationPanel}
                    className="h-6 w-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} isOwn={msg.sender_id === user?.id} />
          ))}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] pb-20 lg:pb-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a message..."
              className="flex-1 h-10 px-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/25 transition-all"
            />
            <Button
              variant="primary"
              size="icon"
              className="rounded-xl bg-gradient-to-r from-sky-400 to-blue-600 shrink-0"
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Location Sidebar */}
      <div className="hidden lg:flex w-[280px] shrink-0 flex-col border-l border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-y-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-400" />
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Context</p>
          </div>

          <div className={`aspect-video rounded-xl bg-gradient-to-br ${photoColor} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-xs">{categoryIcons[cat] ?? "📍"}</span>
              <span className="text-[10px] text-white/90 capitalize">{cat}</span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-tight">{fp.venue_name}</h3>
            <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-tertiary)]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{fp.address ?? "Unknown location"}</span>
            </div>
          </div>

          {/* Other user info */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-secondary)]">
            <Avatar initials={otherInitials} size="sm" colorClass={otherColor} />
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                {otherUser.full_name ?? otherUser.username}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                <Clock className="h-2.5 w-2.5" />
                <span>Footprint visitor</span>
              </div>
            </div>
          </div>

          {/* Photos grid placeholder */}
          <div>
            <p className="text-xs font-semibold text-[var(--text-tertiary)] mb-2">Photos</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg bg-gradient-to-br ${photoColor}`}
                  style={{ opacity: 0.9 - i * 0.15 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isOwn
            ? "bg-gradient-to-r from-sky-400 to-blue-600 text-white rounded-br-md"
            : "bg-[var(--bg-elevated)] border border-[var(--border-primary)] text-[var(--text-primary)] rounded-bl-md"
        )}
      >
        <p>{message.text_content}</p>
        <p className={cn("text-[10px] mt-1", isOwn ? "text-white/60" : "text-[var(--text-tertiary)]")}>
          {formatMsgTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}
