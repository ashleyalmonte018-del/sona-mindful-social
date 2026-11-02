import type { MoodId, SonaLook } from "./types";
import { DEFAULT_LOOK } from "./types";

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

const L = (p: Partial<SonaLook>): SonaLook => ({ ...DEFAULT_LOOK, ...p });

// Sample circle used until real friend connections exist.
export const CIRCLE: Friend[] = [
  {
    id: "f1", name: "Theo", handle: "theo.k", song: "Good Days", artist: "SZA", mood: "happy", sharedAgo: "12m",
    look: L({ name: "Theo", hairStyle: "crop", hairColor: "#3a2a20", clothing: "hoodie", topColor: "#9db7f5", bottom: "pants", bottomColor: "#3b4252", pose: "cheer" }),
    allowsPlay: true,
  },
  {
    id: "f2", name: "Noor", handle: "noor.draws", song: "Sofia", artist: "Clairo", mood: "inspired", sharedAgo: "40m",
    look: L({ name: "Noor", skin: "#c68a5e", hairStyle: "buns", hairColor: "#1d1714", clothing: "overalls", topColor: "#ffffff", bottomColor: "#f08a24", pose: "read" }),
    allowsPlay: true,
  },
  {
    id: "f3", name: "Ari", handle: "ari.wav", song: "Ivy", artist: "Frank Ocean", mood: "tired", sharedAgo: "1h",
    look: L({ name: "Ari", skin: "#8d5a3b", hairStyle: "afro", hairColor: "#1b1411", clothing: "sweater", topColor: "#c9a0dc", bottom: "pants", bottomColor: "#2e3440", pose: "rest" }),
    allowsPlay: true,
  },
  {
    id: "f4", name: "Bea", handle: "bea.bakes", song: "Espresso", artist: "Sabrina Carpenter", mood: "calm", sharedAgo: "2h",
    look: L({ name: "Bea", skin: "#f1c9a5", hairStyle: "long", hairColor: "#c98a3c", clothing: "dress", topColor: "#f6b3c6", accessory: "headphones", accessoryColor: "#3b4252", pose: "dance" }),
    allowsPlay: false,
  },
  {
    id: "f5", name: "Gus", handle: "gus.plays", song: "See You Again", artist: "Tyler, The Creator", mood: "bored", sharedAgo: "3h",
    look: L({ name: "Gus", skin: "#e0ac7e", hairStyle: "spiky", hairColor: "#6b3e1f", clothing: "jersey", topColor: "#4f7cf0", bottom: "shorts", bottomColor: "#1f2430", accessory: "cap", accessoryColor: "#d6303a", pose: "jump" }),
    allowsPlay: true,
  },
];
