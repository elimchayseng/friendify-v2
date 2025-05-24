import { useState, useEffect, forwardRef, useRef } from 'react';
import './TrackReactions.css';
import { supabase } from '../lib/supabase';

interface Review {
  id: number;
  text: string;
  created_at: string;
  user_id: string;
  users: {
    username: string;
  };
}


interface EmojiCount {
  emoji: string;
  count: number;
}

const EMOJI_OPTIONS = [
  { emoji: '👍', name: 'thumbs_up' },
  { emoji: '👎', name: 'thumbs_down' },
  { emoji: '😂', name: 'laugh' },
  { emoji: '🔥', name: 'fire' },
  { emoji: '🤔', name: 'question' },
  { emoji: '❤️', name: 'heart' }
];

interface TrackReactionsProps {
  trackId?: string | null;
}

const TrackReactions = forwardRef<HTMLDivElement, TrackReactionsProps>(({ trackId }, ref) => {
  const [reviewText, setReviewText] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [username, setUsername] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [emojiCounts, setEmojiCounts] = useState<EmojiCount[]>([]);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string>('');
  const reviewsListRef = useRef<HTMLDivElement>(null);
  const maxChars = 100;

  // Get username and user ID from Supabase on component mount
  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
          // Get user data from Supabase
          const { data: user, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('spotify_id', session.user.user_metadata.provider_id)
            .single();
          
          if (user && user.username) {
            setUsername(user.username);
            setUserId(user.id);
          } else {
            setUsername('Anonymous User');
          }
        } else {
          setUsername('Anonymous User');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setUsername('Anonymous User');
      }
    };
    
    getUser();
  }, []);

  // Set current track ID from props
  useEffect(() => {
    if (trackId) {
      setCurrentTrackId(trackId);
    }
  }, [trackId]);

  // Load emoji reactions, counts, and reviews
  useEffect(() => {
    if (!currentTrackId) return;

    const loadData = async () => {
      try {
        // Get all reactions for this track
        const { data: reactions, error: reactionsError } = await supabase
          .from('emoji_reactions')
          .select('*')
          .eq('track_id', currentTrackId);

        if (reactionsError) throw reactionsError;

        // Calculate counts for each emoji
        const counts: EmojiCount[] = EMOJI_OPTIONS.map(option => ({
          emoji: option.emoji,
          count: reactions?.filter(r => r.emoji === option.emoji).length || 0
        }));

        setEmojiCounts(counts);

        // Find user's current reaction
        const userCurrentReaction = reactions?.find(r => r.user_id === userId);
        setUserReaction(userCurrentReaction?.emoji || null);

        // Get all reviews for this track
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('track_reviews')
          .select(`
            id,
            text,
            created_at,
            user_id,
            users!inner (
              username
            )
          `)
          .eq('track_id', currentTrackId)
          .order('created_at', { ascending: true });

        if (reviewsError) throw reviewsError;

        if (reviewsData) {
          setReviews(reviewsData);
          // Scroll to bottom after loading reviews
          setTimeout(() => {
            if (reviewsListRef.current) {
              reviewsListRef.current.scrollTop = reviewsListRef.current.scrollHeight;
            }
          }, 100);
        }

      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    if (userId) {
      loadData();
    }
  }, [currentTrackId, userId]);

  const handleEmojiClick = async (emoji: string) => {
    if (!userId || !currentTrackId) return;

    try {
      // If user already has this reaction, remove it
      if (userReaction === emoji) {
        const { error } = await supabase
          .from('emoji_reactions')
          .delete()
          .eq('user_id', userId)
          .eq('track_id', currentTrackId);

        if (error) throw error;
        setUserReaction(null);
      } else {
        // Remove existing reaction if any
        if (userReaction) {
          await supabase
            .from('emoji_reactions')
            .delete()
            .eq('user_id', userId)
            .eq('track_id', currentTrackId);
        }

        // Add new reaction
        const { error } = await supabase
          .from('emoji_reactions')
          .insert({
            emoji,
            user_id: userId,
            track_id: currentTrackId
          });

        if (error) throw error;
        setUserReaction(emoji);
      }

      // Reload emoji counts
      const { data: reactions } = await supabase
        .from('emoji_reactions')
        .select('*')
        .eq('track_id', currentTrackId);

      const counts: EmojiCount[] = EMOJI_OPTIONS.map(option => ({
        emoji: option.emoji,
        count: reactions?.filter(r => r.emoji === option.emoji).length || 0
      }));

      setEmojiCounts(counts);

    } catch (error) {
      console.error('Error updating emoji reaction:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewText.trim().length === 0 || !userId || !currentTrackId) return;

    try {
      // Insert review into database
      const { data, error } = await supabase
        .from('track_reviews')
        .insert({
          text: reviewText.trim(),
          user_id: userId,
          track_id: currentTrackId
        })
        .select(`
          id,
          text,
          created_at,
          user_id,
          users!inner (
            username
          )
        `)
        .single();

      if (error) throw error;

      if (data) {
        // Add new review to the end of the list (newest at bottom)
        setReviews([...reviews, data]);
        setReviewText('');
        
        // Scroll to bottom to show new review
        setTimeout(() => {
          if (reviewsListRef.current) {
            reviewsListRef.current.scrollTop = reviewsListRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    }
  };

  return (
    <div className="emoji-review-container" ref={ref}>
      <h2>Track Reactions</h2>
      


      {/* Emoji Reactions Section */}
      <div className="emoji-section">
        <div className="emoji-grid">
          {EMOJI_OPTIONS.map((option) => {
            const count = emojiCounts.find(c => c.emoji === option.emoji)?.count || 0;
            const isSelected = userReaction === option.emoji;
            
            return (
              <button
                key={option.name}
                className={`emoji-button ${isSelected ? 'selected' : ''}`}
                onClick={() => handleEmojiClick(option.emoji)}
                disabled={!userId}
              >
                <span className="emoji">{option.emoji}</span>
                <span className="emoji-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Text Reviews Section */}
      <div className="reviews-section">
        <div className="reviews-list" ref={reviewsListRef}>
          {reviews.length > 0 ? (
            reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-username">@{review.users.username}</span>
                  <span className="review-time">
                    {new Date(review.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="review-text">{review.text}</p>
              </div>
            ))
          ) : (
            <p className="no-reviews">Be the first to review this track!</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="review-form">
          <div className="input-container">
            <input
              type="text"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value.slice(0, maxChars))}
              placeholder="Write a review (100 char max)"
              className="review-input"
              maxLength={maxChars}
            />
            <span className="char-count">
              {reviewText.length}/{maxChars}
            </span>
          </div>
          <button 
            type="submit" 
            className="submit-btn"
            disabled={reviewText.trim().length === 0}
          >
            Post
          </button>
        </form>
      </div>
    </div>
  );
});

export default TrackReactions;