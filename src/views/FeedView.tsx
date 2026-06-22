import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageSquare, Send, MapPin, Loader2, ArrowRight } from "lucide-react";
import { useFootprints } from "@/hooks/useFootprints";
import { useInquiry } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { Place } from "@/types/database";

interface FeedViewProps {
  onViewOnMap: (place: Place) => void;
  onNavigateToInbox: (conversationId?: string) => void;
  onOpenProfile: () => void;
}

interface MockComment {
  id: string;
  author: string;
  initials: string;
  text: string;
  time: string;
}

const INITIAL_COMMENTS: Record<string, MockComment[]> = {
  p1: [
    { id: "c1", author: "Aarav Sharma", initials: "AS", text: "Truly one of the most serene places early in the morning.", time: "2h ago" },
    { id: "c2", author: "Neha Gupta", initials: "NG", text: "The architectural symmetry of the tombs is breathtaking.", time: "1h ago" }
  ],
  p2: [
    { id: "c3", author: "Dev Patel", initials: "DP", text: "Their coffee is top notch! The sourdough toast is highly recommended too.", time: "3h ago" }
  ],
  p3: [
    { id: "c4", author: "Ananya Iyer", initials: "AI", text: "Karim's is legendary! Make sure to try their mutton stew.", time: "4h ago" },
    { id: "c5", author: "Rohan Das", initials: "RD", text: "Historic vibes are unmatched.", time: "5h ago" }
  ],
  p4: [
    { id: "c6", author: "Priya Malik", initials: "PM", text: "The Raja Ravi Varma collection is pure gold. Love Jaipur House.", time: "1d ago" }
  ],
  p6: [
    { id: "c7", author: "Karan Johar", initials: "KJ", text: "Stroll around India Gate at night is a vibe.", time: "2h ago" }
  ]
};

export function FeedView({ onViewOnMap, onNavigateToInbox, onOpenProfile }: FeedViewProps) {
  const { places, loading } = useFootprints();
  const { startInquiry } = useInquiry();
  const { user, profile } = useAuth();

  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>(() => {
    // Seed some initial counts
    const seed: Record<string, { count: number; liked: boolean }> = {};
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    ids.forEach((id, index) => {
      seed[id] = { count: 12 + (index * 7) % 31, liked: false };
    });
    return seed;
  });

  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [postComments, setPostComments] = useState<Record<string, MockComment[]>>(INITIAL_COMMENTS);
  const [newCommentText, setNewCommentText] = useState("");
  const [messageLoadingId, setMessageLoadingId] = useState<string | null>(null);

  const handleLike = useCallback((postId: string) => {
    setLikes((prev) => {
      const current = prev[postId] ?? { count: 0, liked: false };
      return {
        ...prev,
        [postId]: {
          count: current.liked ? current.count - 1 : current.count + 1,
          liked: !current.liked,
        },
      };
    });
  }, []);

  const handleSendMessage = useCallback(
    async (place: Place) => {
      setMessageLoadingId(place.id);
      const { conversationId } = await startInquiry(place.id);
      setMessageLoadingId(null);
      if (conversationId) {
        onNavigateToInbox(conversationId);
      }
    },
    [startInquiry, onNavigateToInbox]
  );

  const handleAddComment = useCallback((postId: string) => {
    if (!newCommentText.trim()) return;

    const authorName = profile?.full_name ?? user?.user_metadata?.full_name ?? "You";
    const initials = authorName
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newComment: MockComment = {
      id: `c-new-${Date.now()}`,
      author: authorName,
      initials,
      text: newCommentText,
      time: "Just now",
    };

    setPostComments((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), newComment],
    }));
    setNewCommentText("");
  }, [newCommentText, profile, user]);

  return (
    <div className="h-full overflow-y-auto pb-24 lg:pb-6 relative bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-heavy border-b border-[var(--border-primary)]">
        <div className="px-5 lg:px-8 py-4 flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md">
              <span className="text-white text-base">👣</span>
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Explore Feed</h2>
              <p className="text-[10px] text-[var(--text-tertiary)]">Stories shared by the travel community</p>
            </div>
          </div>

          {/* Mobile Profile Trigger */}
          <button
            onClick={onOpenProfile}
            className="lg:hidden h-9 w-9 rounded-full border border-[var(--border-primary)] shadow-sm bg-[var(--bg-elevated)] flex items-center justify-center cursor-pointer transition-all active:scale-95 outline-none"
          >
            <span className="text-xs font-semibold text-brand-500">
              {(profile?.full_name ?? user?.user_metadata?.full_name ?? "EX")
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      <div className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
            <p className="text-xs text-[var(--text-tertiary)]">Fetching posts...</p>
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-20 glass rounded-3xl p-6">
            <p className="text-sm font-bold text-[var(--text-primary)]">No posts shared yet</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Be the first to share your footprint on the map!</p>
          </div>
        ) : (
          places.map((place) => {
            const likeState = likes[place.id] ?? { count: 0, liked: false };
            const commentsList = postComments[place.id] ?? [];

            return (
              <motion.article
                key={place.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-3xl overflow-hidden border border-[var(--border-primary)] hover:border-brand-500/20 transition-all duration-300 shadow-[var(--shadow-sm)]"
              >
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between border-b border-[var(--border-secondary)]">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                      {place.visitorAvatar}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{place.visitor}</h4>
                      <p className="text-[9px] text-[var(--text-tertiary)]">{place.visitDate}</p>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full bg-brand-500/10 text-brand-500 tracking-wider">
                    {place.category}
                  </span>
                </div>

                {/* Photo/Gradient Area */}
                <div className={cn(
                  "relative w-full aspect-[4/3] bg-gradient-to-br flex items-center justify-center overflow-hidden border-b border-[var(--border-secondary)]",
                  place.photoColor
                )}>
                  {/* Premium Abstract overlay */}
                  <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
                  <div className="z-10 text-center px-6">
                    <span className="text-3xl block filter drop-shadow-md mb-2">
                      {place.category === "cafe" && "☕"}
                      {place.category === "park" && "🌳"}
                      {place.category === "restaurant" && "🍜"}
                      {place.category === "landmark" && "⛩️"}
                      {place.category === "museum" && "🎨"}
                      {place.category === "bar" && "🍸"}
                      {place.category === "hotel" && "🏨"}
                    </span>
                    <h3 className="text-base font-extrabold text-white tracking-tight drop-shadow-lg leading-tight">
                      {place.name}
                    </h3>
                    <p className="text-[10px] text-sky-100/90 font-medium tracking-wide mt-1.5 drop-shadow-sm line-clamp-1">
                      {place.address}
                    </p>
                  </div>
                  <button
                    onClick={() => onViewOnMap(place)}
                    className="absolute bottom-3 right-3 glass hover:bg-white hover:text-brand-500 text-white rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all text-[10px] font-bold shadow-md cursor-pointer active:scale-95"
                  >
                    <MapPin className="h-3 w-3" />
                    <span>View on Map</span>
                  </button>
                </div>

                {/* Story / Description */}
                <div className="p-4 pb-2">
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    <span className="font-bold text-[var(--text-primary)] mr-1.5">@{place.visitor.toLowerCase().replace(/\s+/g, '')}</span>
                    {place.description || "Explored this amazing place! Highly recommend visiting."}
                  </p>
                </div>

                {/* Engagement Stats */}
                <div className="px-4 py-2 flex items-center justify-between border-t border-[var(--border-secondary)]/50 text-[10px] text-[var(--text-tertiary)] font-bold">
                  <span>{likeState.count} likes</span>
                  <span>{commentsList.length} comments</span>
                </div>

                {/* Post Footer Action Panel */}
                <div className="px-3 py-2 border-t border-[var(--border-secondary)] bg-[var(--bg-secondary)]/30 flex items-center gap-1">
                  {/* Like Button */}
                  <button
                    onClick={() => handleLike(place.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-90",
                      likeState.liked
                        ? "text-rose-500 bg-rose-500/10"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", likeState.liked && "fill-rose-500")} />
                    <span>{likeState.liked ? "Liked" : "Like"}</span>
                  </button>

                  {/* Comment Button */}
                  <button
                    onClick={() => setActiveCommentsPostId(place.id)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] cursor-pointer transition-all active:scale-90"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Comment</span>
                  </button>

                  {/* Direct Message Button */}
                  <button
                    onClick={() => handleSendMessage(place)}
                    disabled={messageLoadingId === place.id}
                    className="ml-auto flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-br from-sky-400 to-blue-600 hover:from-sky-500 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-90"
                  >
                    {messageLoadingId === place.id ? (
                      <Loader2 className="h-3 w-3 animate-spin text-white" />
                    ) : (
                      <Send className="h-3.5 w-3.5 text-white" />
                    )}
                    <span>Message</span>
                  </button>
                </div>
              </motion.article>
            );
          })
        )}
      </div>

      {/* Slide-Up Comments Drawer */}
      <AnimatePresence>
        {activeCommentsPostId && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveCommentsPostId(null)}
              className="absolute inset-0 bg-black z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute bottom-0 left-0 right-0 max-h-[80%] rounded-t-[32px] border-t border-[var(--border-primary)] glass-heavy shadow-[var(--shadow-xl)] z-50 flex flex-col pointer-events-auto"
            >
              {/* Drag Handle indicator */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 rounded-full bg-[var(--border-primary)]" />
              </div>

              {/* Title Header */}
              <div className="px-6 pb-3 border-b border-[var(--border-primary)] flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Comments</h3>
                <span className="text-[10px] bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full font-bold">
                  {(postComments[activeCommentsPostId] ?? []).length} Comments
                </span>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[200px]">
                {(postComments[activeCommentsPostId] ?? []).length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-xs text-[var(--text-tertiary)]">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  (postComments[activeCommentsPostId] ?? []).map((comment) => (
                    <div key={comment.id} className="flex gap-3 items-start">
                      <div className="h-7 w-7 rounded-full bg-brand-500/15 text-brand-500 font-bold text-[9px] flex items-center justify-center shrink-0">
                        {comment.initials}
                      </div>
                      <div className="bg-[var(--bg-tertiary)]/50 rounded-2xl p-3 flex-1 min-w-0 border border-[var(--border-secondary)]">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-bold text-[var(--text-primary)]">{comment.author}</span>
                          <span className="text-[9px] text-[var(--text-tertiary)]">{comment.time}</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <div className="p-4 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)] flex gap-2 items-center pb-[calc(1rem+env(safe-area-inset-bottom))]">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddComment(activeCommentsPostId);
                  }}
                  className="flex-1 bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] px-4 py-3 rounded-xl border border-[var(--border-primary)] focus:border-brand-500 outline-none placeholder-[var(--text-tertiary)]"
                />
                <Button
                  variant="primary"
                  size="icon"
                  className="rounded-xl shrink-0"
                  onClick={() => handleAddComment(activeCommentsPostId)}
                  disabled={!newCommentText.trim()}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
