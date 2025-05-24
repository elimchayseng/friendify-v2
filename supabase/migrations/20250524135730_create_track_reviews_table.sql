-- Create track_reviews table
CREATE TABLE IF NOT EXISTS track_reviews (
  id SERIAL PRIMARY KEY,
  text TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries by track_id
CREATE INDEX IF NOT EXISTS track_reviews_track_id_idx 
  ON track_reviews(track_id);

-- Add index for faster queries by user_id  
CREATE INDEX IF NOT EXISTS track_reviews_user_id_idx 
  ON track_reviews(user_id);

-- Add index for ordering by creation time
CREATE INDEX IF NOT EXISTS track_reviews_created_at_idx 
  ON track_reviews(created_at DESC);