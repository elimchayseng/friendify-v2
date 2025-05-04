import { useState, useEffect, useRef, forwardRef } from 'react';
import './ChatReview.css';

interface Review {
  id: number;
  text: string;
  timestamp: Date;
  username: string;
}

const ChatReview = forwardRef<HTMLDivElement>((props, ref) => {
  const [reviewText, setReviewText] = useState<string>('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [username, setUsername] = useState<string>('');
  const maxChars = 100;

  // Get username from localStorage on component mount
  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    setUsername(storedUsername || 'Anonymous User');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewText.trim().length === 0) return;

    const newReview: Review = {
      id: Date.now(),
      text: reviewText.trim(),
      timestamp: new Date(),
      username: username
    };

    setReviews([newReview, ...reviews]);
    setReviewText('');
  };

  return (
    <div className="chat-review-container" ref={ref}>
      <h2>Track Reviews</h2>
      
      <div className="username-display">
        <span className="current-username">@{username}</span>
      </div>
      
      <div className="reviews-list">
        {reviews.length > 0 ? (
          reviews.map(review => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-username">@{review.username}</span>
                <span className="review-time">
                  {review.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
  );
});

export default ChatReview; 