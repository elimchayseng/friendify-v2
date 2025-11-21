import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllUserTracks } from "../lib/supabase";
import "./TopTracks.css";

interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  spotify_id: string;
  rank: number;
  image_url?: string | null;
}

interface UserTracks {
  user: {
    id: string;
    username: string;
  };
  tracks: Track[];
}

function TopTracks({ userId }: { userId: string | null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const {
    data: allUserTracks,
    error,
    isLoading: queryLoading,
  } = useQuery<UserTracks[]>({
    queryKey: ["all-user-tracks"],
    queryFn: getAllUserTracks,
    staleTime: 300000, // 5 minutes
    gcTime: 1800000, // 30 minutes
    retry: 2,
  });

  useEffect(() => {
    if (!queryLoading) {
      setIsLoading(false);
    }
  }, [queryLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (error) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          Error loading tracks: {(error as Error).message}
        </div>
      </div>
    );
  }

  if (isLoading || queryLoading) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">Loading tracks...</div>
      </div>
    );
  }

  if (
    !allUserTracks ||
    !Array.isArray(allUserTracks) ||
    allUserTracks.length === 0
  ) {
    return (
      <div className="tracks-wrapper">
        <div className="tracks-container">
          <div className="no-tracks-message">
            No tracks found. Try listening to more music or invite your friends
            to join!
          </div>
        </div>
      </div>
    );
  }

  // Sort the current user's tracks to the top if we have a userId
  const sortedUserTracks = [...allUserTracks].sort((a, b) => {
    if (a.user.id === userId) return -1;
    if (b.user.id === userId) return 1;
    return 0;
  });

  const userOptions = sortedUserTracks.map(({ user }) => user);

  const filteredUserTracks = selectedUserIds.length
    ? sortedUserTracks.filter(({ user }) => selectedUserIds.includes(user.id))
    : sortedUserTracks;

  const toggleUserSelection = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id)
        ? prev.filter((userIdItem) => userIdItem !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedUserIds([]);
  };

  const selectedLabel =
    selectedUserIds.length === 0
      ? "All users"
      : `${selectedUserIds.length} selected`;

  return (
    <div className="tracks-wrapper">
      <div className="tracks-container">
        <div className="tracks-header">
          <h2>Everyone's Top Tracks</h2>
          <div className="user-filter-bar">
            <div
              className={`filter-dropdown ${isDropdownOpen ? "open" : ""}`}
              ref={dropdownRef}
            >
              <button
                type="button"
                className="filter-toggle"
                onClick={() => setIsDropdownOpen((open) => !open)}
              >
                {/* <span className="filter-toggle-label">Visible users</span> */}
                <span className="filter-toggle-value">{selectedLabel}</span>
                <span className="filter-toggle-icon">
                  {isDropdownOpen ? "▲" : "▼"}
                </span>
              </button>
              {isDropdownOpen && (
                <div className="filter-menu">
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === 0}
                      onChange={handleSelectAll}
                    />
                    <span className="filter-option-label">All users</span>
                  </label>
                  <div className="filter-divider" />
                  {userOptions.map((user) => {
                    const isSelected = selectedUserIds.includes(user.id);
                    return (
                      <label key={user.id} className="filter-option">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(user.id)}
                        />
                        <span className="filter-option-label">
                          {user.id === userId ? "You" : user.username}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="users-grid">
          {filteredUserTracks.map((userTracks: UserTracks) => (
            <div
              key={userTracks.user.id}
              className={`user-tracks-section ${
                userTracks.user.id === userId ? "current-user" : ""
              }`}
            >
              <h3 className="username">
                {userTracks.user.id === userId
                  ? "Your"
                  : `${userTracks.user.username}'s`}{" "}
                Top Tracks
                {userTracks.user.id === userId && (
                  <span className="current-user-badge">You</span>
                )}
              </h3>
              <div className="tracks-list">
                {userTracks.tracks.map((track: Track) => (
                  <div key={track.id} className="track-list-item">
                    <div className="track-rank">#{track.rank}</div>

                    <a
                      href={`https://open.spotify.com/track/${track.spotify_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="track-image-link"
                    >
                      {track.image_url ? (
                        <img
                          src={track.image_url}
                          alt={`${track.album} cover`}
                          className="album-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="album-cover-placeholder">
                          <span>🎵</span>
                        </div>
                      )}
                    </a>

                    <div className="track-details">
                      <div className="track-name">{track.name}</div>
                      <div className="track-artist">{track.artist}</div>
                      <div className="track-album">{track.album}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TopTracks;
