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
      users: {
        Row: {
          id: string
          username: string
          spotify_id: string
          created_at: string
          current_track_id: string | null
        }
        Insert: {
          id?: string
          username: string
          spotify_id: string
          created_at?: string
          current_track_id?: string | null
        }
      }
      tracks: {
        Row: {
          id: string
          name: string
          artist: string
          album: string
          image_url: string
          spotify_id: string
          created_at: string
          is_track_of_day: boolean
        }
        Insert: {
          id?: string
          name: string
          artist: string
          album: string
          image_url: string
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