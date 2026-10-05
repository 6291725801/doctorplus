/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface MediaItem {
  id: string;
  url: string;
  fileName: string;
  altText?: string | null;
  title?: string | null;
  sizeBytes: number;
  mimeType: string;
}

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mediaUrl: string, altText?: string) => void;
  title?: string;
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select Media Asset",
}: MediaPickerModalProps) {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMedia = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query ? `/api/cms/media?search=${encodeURIComponent(query)}` : "/api/cms/media";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setMediaList(data.data || []);
      }
    } catch {
      setError("Failed to fetch media library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;
    const timer = setTimeout(() => {
      setLoading(true);
      const url = search ? `/api/cms/media?search=${encodeURIComponent(search)}` : "/api/cms/media";
      fetch(url)
        .then((res) => res.json())
        .then((data) => {
          if (!ignore && data.success) {
            setMediaList(data.data || []);
          }
        })
        .catch(() => {
          if (!ignore) setError("Failed to fetch media library.");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 50);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [isOpen, search]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);
    formData.append("altText", file.name.split(".")[0]);

    try {
      const res = await fetch("/api/cms/media/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error?.message || "Upload failed.");
        setUploading(false);
        return;
      }

      await fetchMedia();
      onSelect(data.data.url, data.data.altText);
      onClose();
    } catch {
      setError("Upload failed due to a network error.");
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <Input
              placeholder="Search images by name or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md text-xs"
            />
            <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-xs transition">
              {uploading ? "Uploading..." : "Upload New Image"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                disabled={uploading}
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 border-t border-slate-100 dark:border-slate-800">
          {loading ? (
            <div className="text-center py-12 text-xs text-slate-400">Loading media library...</div>
          ) : mediaList.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No media found. Upload an image to start using it in your content.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {mediaList.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item.url, item.altText || item.fileName);
                    onClose();
                  }}
                  className="group relative cursor-pointer border rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800 hover:border-teal-500 hover:shadow-md transition duration-150"
                >
                  <div className="aspect-video w-full overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src={item.url}
                      alt={item.altText || item.fileName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  </div>
                  <div className="p-2 text-left">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                      {item.title || item.fileName}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {(item.sizeBytes / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
