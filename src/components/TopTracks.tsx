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

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

function TopTracks({ userId }: { userId: string | null }) {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const [copiedSelection, setCopiedSelection] = useState(false);
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

  useEffect(() => {
    if (!copiedUserId) return;
    const timeout = setTimeout(() => setCopiedUserId(null), 2000);
    return () => clearTimeout(timeout);
  }, [copiedUserId]);

  useEffect(() => {
    if (!copiedSelection) return;
    const timeout = setTimeout(() => setCopiedSelection(false), 2000);
    return () => clearTimeout(timeout);
  }, [copiedSelection]);

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

  const copyTracksToClipboard = async (userTracks: UserTracks) => {
    const label =
      userTracks.user.id === userId
        ? "My"
        : `${userTracks.user.username}'s`;

    const trackLines = userTracks.tracks.map((track, idx) => {
      const prefix = NUMBER_EMOJIS[idx] || `${idx + 1}.`;
      return `${prefix} ${track.name} — ${track.artist}`;
    });

    const text = [`🎧 ${label} Top Tracks`, ...trackLines].join("\n");

    if (!navigator?.clipboard?.writeText) {
      console.error("Clipboard API not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedUserId(userTracks.user.id);
    } catch (err) {
      console.error("Failed to copy tracks:", err);
    }
  };

  const copySelectedUsersTracks = async () => {
    if (!navigator?.clipboard?.writeText) {
      console.error("Clipboard API not available.");
      return;
    }

    const usersToCopy = filteredUserTracks;
    if (!usersToCopy.length) return;

    const sections = usersToCopy.map((userTracks) => {
      const label =
        userTracks.user.id === userId
          ? "My"
          : `${userTracks.user.username}'s`;

      const trackLines = userTracks.tracks.map((track, idx) => {
        const emojiIndex = track.rank ? track.rank - 1 : idx;
        const prefix = NUMBER_EMOJIS[emojiIndex] || `#${track.rank || idx + 1}`;
        return `${prefix} ${track.name} — ${track.artist}`;
      });

      return [`🎧 ${label} Top Tracks`, ...trackLines].join("\n");
    });

    try {
      await navigator.clipboard.writeText(sections.join("\n\n"));
      setCopiedSelection(true);
    } catch (err) {
      console.error("Failed to copy selected tracks:", err);
    }
  };

  return (
    <div className="tracks-wrapper">
      <div className="tracks-container">
        <div className="tracks-header">
          <div className="header-title">
            <h2>Top Tracks</h2>
          </div>
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
            <button
              type="button"
              className="copy-selected-btn"
              onClick={copySelectedUsersTracks}
              aria-label={
                copiedSelection ? "Copied selected tracks" : "Copy selected tracks"
              }
            >
              <span className="copy-icon" aria-hidden="true" />
              <span className="sr-only">
                {copiedSelection ? "Copied!" : "Copy selected"}
              </span>
            </button>
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
              <div className="user-card-header">
                <h3 className="username">
                  {userTracks.user.id === userId
                    ? "Your"
                    : `${userTracks.user.username}'s`}{" "}
                  Top Tracks
                  {userTracks.user.id === userId && (
                    <span className="current-user-badge">You</span>
                  )}
                </h3>
                <button
                  type="button"
                  className="copy-tracks-btn"
                  onClick={() => copyTracksToClipboard(userTracks)}
                  aria-label={
                    copiedUserId === userTracks.user.id
                      ? "Copied to clipboard"
                      : "Copy to clipboard"
                  }
                >
                  <span className="copy-icon" aria-hidden="true" />
                  <span className="sr-only">
                    {copiedUserId === userTracks.user.id
                      ? "Copied!"
                      : "Copy to clipboard"}
                  </span>
                </button>
              </div>
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
