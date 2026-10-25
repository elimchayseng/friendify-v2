export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ipod_preferences: {
        Row: {
          user_id: string
          owner_id: string
          model: string
          finish: string
          updated_at: string
        }
        Insert: {
          user_id: string
          owner_id?: string
          model: string
          finish: string
          updated_at?: string
        }
        Update: { model?: string; finish?: string; updated_at?: string }
      }
      users: {
        Row: {
          id: string
          username: string
          spotify_id: string
          created_at: string
          current_track_id: string | null
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
        }
        Insert: {
          id?: string
          username: string
          spotify_id: string
          created_at?: string
          current_track_id?: string | null
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
        }
      }
      tracks: {
        Row: {
          id: string
          name: string
          artist: string
          album: string
          image_url: string | null
          spotify_id: string
          created_at: string
          is_track_of_day: boolean
        }
        Insert: {
          id?: string
          name: string
          artist: string
          album: string
          image_url?: string | null
          spotify_id: string
          created_at?: string
          is_track_of_day?: boolean
        }
      }
      user_tracks: {
        Row: {
          id: string
          user_id: string
          track_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          track_id: string
          created_at?: string
        }
      }
    }
  }
}
