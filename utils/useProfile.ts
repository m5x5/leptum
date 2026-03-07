import { useEffect, useState } from "react";
import { remoteStorageClient } from "../lib/remoteStorage";

export interface ProfileData {
  displayName?: string;
  avatarDataUrl?: string;
}

export function useProfile(): ProfileData | null {
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    remoteStorageClient.getProfile().then(setProfile);
  }, []);

  return profile;
}
