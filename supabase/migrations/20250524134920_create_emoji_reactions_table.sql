-- Create emoji_reactions table
CREATE TABLE IF NOT EXISTS emoji_reactions (
  id SERIAL PRIMARY KEY,
  emoji TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to ensure one emoji per user per track
CREATE UNIQUE INDEX IF NOT EXISTS emoji_reactions_user_track_unique 
  ON emoji_reactions(user_id, track_id);

-- Add index for faster queries by track_id
CREATE INDEX IF NOT EXISTS emoji_reactions_track_id_idx 
  ON emoji_reactions(track_id);

-- Add index for faster queries by user_id
CREATE INDEX IF NOT EXISTS emoji_reactions_user_id_idx 
  ON emoji_reactions(user_id);