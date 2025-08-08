"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  getSearchHistory,
  removeFromSearchHistory,
  type PlayerHistory,
} from "@/lib/history";
import { X, History } from "lucide-react";

interface SearchHistoryProps {
  onPlayerSelect: (uuid: string, username: string) => void;
}

export function SearchHistory({ onPlayerSelect }: SearchHistoryProps) {
  const [history, setHistory] = useState<PlayerHistory[]>([]);
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  useEffect(() => {
    const loadAvatars = async () => {
      const urls: Record<string, string> = {};

      for (const player of history) {
        try {
          const response = await fetch(`/api/avatar/${player.username}`);
          const data = await response.json();
          if (data.allUrls?.head) {
            urls[player.uuid] = data.allUrls.head;
          }
        } catch {
          // Failed to load avatar, skip
        }
      }

      setAvatarUrls(urls);
    };

    if (history.length > 0) {
      loadAvatars();
    }
  }, [history]);

  const handleRemove = (uuid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromSearchHistory(uuid);
    setHistory(getSearchHistory());
  };

  const handlePlayerClick = (player: PlayerHistory) => {
    onPlayerSelect(player.uuid, player.username);
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-background/95 rounded-lg w-full">
      <div className="flex items-center gap-2 mb-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Recent Searches</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {history.map((player) => (
          <div
            key={player.uuid}
            className="relative group cursor-pointer"
            onClick={() => handlePlayerClick(player)}
          >
            <div className="flex flex-col items-center p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="relative">
                {avatarUrls[player.uuid] ? (
                  <img
                    src={avatarUrls[player.uuid]}
                    alt={`${player.username}'s avatar`}
                    className="w-8 h-8 rounded"
                  />
                ) : (
                  <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {player.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}

                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-4 h-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleRemove(player.uuid, e)}
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>

              <span className="text-xs text-center mt-1 truncate w-full">
                {player.username}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
