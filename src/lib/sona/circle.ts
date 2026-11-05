import type { MoodId, SonaLook } from "./types";

export interface Friend {
  id: string;
  name: string;
  handle: string;
  song: string;
  artist: string;
  mood: MoodId;
  sharedAgo: string;
  look: SonaLook;
  allowsPlay: boolean;
}


// Sample circle used until real friend connections exist.
export const CIRCLE: Friend[] = [
];
