import type { Post } from "./types";

// Sample pool the edition is built from. Metrics like likes/views are never shown.
export const POSTS: Post[] = [
  {
    id: "p1", author: "Maya Lin", handle: "mayamakes", category: "inspiration", topics: [], subgenre: "art-process",
    intensity: 0, triggers: [], vibes: { creative: 1, calm: 0.6 }, worthIt: 0.92, volatility: 0.1,
    text: "Painted the sky from my window every evening this week. Tuesday was the softest one 🌤️",
    scene: { pose: "read", tone: "sky" }, offline: "Sketch what's outside your window for 5 minutes", hoursAgo: 2,
  },
  {
    id: "p2", author: "Jonah Ruiz", handle: "jonahwalks", category: "inspiration", topics: ["fitness"], subgenre: "walks",
    intensity: 0, triggers: [], vibes: { movement: 1, calm: 0.7 }, worthIt: 0.88, volatility: 0.05,
    text: "No-phone walk challenge day 4. Found a tiny library box on Elm St 📚", scene: { pose: "run", tone: "lime" },
    offline: "Take a 10-minute walk without your phone", hoursAgo: 3,
  },
  {
    id: "p3", author: "Daily Bit", handle: "dailybit", category: "learning", topics: ["news"], subgenre: "doom-news",
    intensity: 3, triggers: ["doom", "breaking-alert"], vibes: { world: 1 }, worthIt: 0.31, volatility: 0.92,
    text: "BREAKING: everything is falling apart and here are 14 reasons it's worse than you think 🔴", hoursAgo: 1,
  },
  {
    id: "p4", author: "Priya S.", handle: "priyacooks", category: "learning", topics: ["food"], subgenre: "recipe",
    intensity: 0, triggers: [], vibes: { learning: 0.6, creative: 0.5, calm: 0.4 }, worthIt: 0.9, volatility: 0.1,
    text: "3-ingredient mango lassi that tastes like summer break. Recipe in the card 🥭",
    scene: { pose: "box", tone: "orange" }, offline: "Try the lassi with someone at home", hoursAgo: 5,
  },
  {
    id: "p5", author: "glowwithkai", handle: "glowwithkai", category: "inspiration", topics: ["body", "fitness"], subgenre: "transformation",
    intensity: 2, triggers: ["before-after", "body-check", "comparison"], vibes: { movement: 0.5 }, worthIt: 0.34, volatility: 0.7,
    text: "30-day before/after 😳 you won't believe what I stopped eating", hoursAgo: 4,
  },
  {
    id: "p6", author: "Theo", handle: "theo.k", category: "friends", topics: [], subgenre: "life-update",
    intensity: 0, triggers: [], vibes: { friends: 1, laughs: 0.5 }, worthIt: 0.95, volatility: 0.05,
    text: "Passed my driving test!!! Nobody is safe on the roads now 🚗💨", scene: { pose: "cheer", tone: "lime" }, hoursAgo: 2,
  },
  {
    id: "p7", author: "Ari", handle: "ari.wav", category: "friends", topics: ["mental"], subgenre: "check-in",
    intensity: 1, triggers: [], vibes: { friends: 1, deep: 0.8 }, worthIt: 0.9, volatility: 0.05,
    text: "Rough week but therapy helped today. Small wins: I made my bed and called my grandma 💛",
    offline: "Text a friend one small win from today", hoursAgo: 6,
  },
  {
    id: "p8", author: "Sci Snack", handle: "scisnack", category: "learning", topics: [], subgenre: "science",
    intensity: 0, triggers: [], vibes: { learning: 1 }, worthIt: 0.89, volatility: 0.15,
    text: "Octopuses taste with their arms. Each sucker has ~10,000 taste receptors 🐙", hoursAgo: 7,
  },
  {
    id: "p9", author: "tea.spill", handle: "tea.spill", category: "inspiration", topics: ["drama"], subgenre: "callout",
    intensity: 2, triggers: ["comparison"], vibes: { laughs: 0.3 }, worthIt: 0.22, volatility: 0.95,
    text: "THE receipts are out and the comments are a war zone 💀 thread below", hoursAgo: 1,
  },
  {
    id: "p10", author: "Lofi Lena", handle: "lofilena", category: "reels", topics: [], subgenre: "study-music",
    intensity: 0, triggers: [], vibes: { calm: 1, creative: 0.5 }, worthIt: 0.86, volatility: 0.1,
    text: "Rainy window study session — 3 min loop, no ads, no hooks.", scene: { pose: "read", tone: "purple" }, hoursAgo: 3,
  },
  {
    id: "p11", author: "Jay Fit", handle: "jayfit", category: "reels", topics: ["fitness", "body"], subgenre: "what-i-eat",
    intensity: 2, triggers: ["calorie-talk", "diet", "rapid-cuts"], vibes: { movement: 0.7 }, worthIt: 0.4, volatility: 0.6,
    text: "What I eat in a day at 1,200 calories (fast cuts edition) ⏱️", hoursAgo: 2,
  },
  {
    id: "p12", author: "Noor", handle: "noor.draws", category: "friends", topics: [], subgenre: "art-process",
    intensity: 0, triggers: [], vibes: { friends: 0.9, creative: 1 }, worthIt: 0.93, volatility: 0.05,
    text: "Drew all of us as Sonas for the group chat ✏️ who's who??", scene: { pose: "jump", tone: "sand" }, hoursAgo: 8,
  },
  {
    id: "p13", author: "Civics in 60", handle: "civics60", category: "learning", topics: ["news"], subgenre: "explainer",
    intensity: 1, triggers: [], vibes: { learning: 0.9, world: 0.8 }, worthIt: 0.85, volatility: 0.3,
    text: "How a local budget vote actually works, in plain words. No yelling, promise.", hoursAgo: 5,
  },
  {
    id: "p14", author: "Hustle Hari", handle: "hustlehari", category: "inspiration", topics: ["hustle"], subgenre: "flex",
    intensity: 1, triggers: ["comparison"], vibes: { world: 0.2 }, worthIt: 0.29, volatility: 0.55,
    text: "17 and made $40k this month. If you're sleeping 8 hours you're losing 😤", hoursAgo: 3,
  },
  {
    id: "p15", author: "Bea", handle: "bea.bakes", category: "friends", topics: ["food"], subgenre: "recipe",
    intensity: 0, triggers: [], vibes: { friends: 0.9, creative: 0.6 }, worthIt: 0.9, volatility: 0.05,
    text: "Banana bread round 2 — less burnt this time 🍌", scene: { pose: "box", tone: "sand" },
    offline: "Bake something simple with a friend", hoursAgo: 9,
  },
  {
    id: "p16", author: "Mind Matters", handle: "mindmatters", category: "learning", topics: ["mental"], subgenre: "coping",
    intensity: 1, triggers: [], vibes: { deep: 0.8, learning: 0.7, calm: 0.6 }, worthIt: 0.91, volatility: 0.1,
    text: "Box breathing: in 4, hold 4, out 4, hold 4. Try two rounds right now — we'll wait.",
    offline: "Do 4 rounds of box breathing", hoursAgo: 4,
  },
  {
    id: "p17", author: "Crime Hour", handle: "crimehour", category: "reels", topics: ["news"], subgenre: "true-crime",
    intensity: 3, triggers: ["panic", "loud"], vibes: { world: 0.5 }, worthIt: 0.38, volatility: 0.8,
    text: "The case that kept a whole town awake… part 1 of 9 🔪", hoursAgo: 2,
  },
  {
    id: "p18", author: "Dance Dot", handle: "dancedot", category: "reels", topics: [], subgenre: "dance",
    intensity: 0, triggers: [], vibes: { movement: 1, laughs: 0.6 }, worthIt: 0.84, volatility: 0.3,
    text: "Easy 8-count you can learn in your kitchen 💃", scene: { pose: "cheer", tone: "orange" },
    offline: "Learn the 8-count and send it to a friend", hoursAgo: 6,
  },
  {
    id: "p19", author: "heartbreak.hotel", handle: "heartbreakhotel", category: "inspiration", topics: ["romance", "mental"], subgenre: "sad-loop",
    intensity: 2, triggers: ["hopeless"], vibes: { deep: 0.6 }, worthIt: 0.35, volatility: 0.5,
    text: "nobody is coming to save you. 3am thoughts compilation 🥀", hoursAgo: 5,
  },
  {
    id: "p20", author: "Gus", handle: "gus.plays", category: "friends", topics: [], subgenre: "gaming",
    intensity: 0, triggers: [], vibes: { friends: 1, laughs: 0.8 }, worthIt: 0.88, volatility: 0.1,
    text: "We lost 9 rounds in a row and still called it a W 🎮", hoursAgo: 4,
  },
  {
    id: "p21", author: "Plant Pal", handle: "plantpal", category: "inspiration", topics: [], subgenre: "plants",
    intensity: 0, triggers: [], vibes: { calm: 0.9, creative: 0.3 }, worthIt: 0.87, volatility: 0.05,
    text: "My pothos grew a new leaf and I'm acting like it graduated 🌱", scene: { pose: "sit", tone: "lime" },
    offline: "Water a plant (or go find one)", hoursAgo: 10,
  },
  {
    id: "p22", author: "Strobe Studio", handle: "strobe", category: "reels", topics: [], subgenre: "chaos-edit",
    intensity: 2, triggers: ["flashing", "rapid-cuts", "sensory-overload", "loud"], vibes: { laughs: 0.5 }, worthIt: 0.3, volatility: 0.75,
    text: "⚡ 200 cuts in 15 seconds ⚡ (bass boosted)", hoursAgo: 1,
  },
  {
    id: "p23", author: "Code Cub", handle: "codecub", category: "learning", topics: [], subgenre: "how-to",
    intensity: 0, triggers: [], vibes: { learning: 1, creative: 0.5 }, worthIt: 0.9, volatility: 0.1,
    text: "Make your first website in 10 lines. Copy, paste, change the colors, done 💻", hoursAgo: 8,
  },
  {
    id: "p24", author: "Rae", handle: "rae.r", category: "friends", topics: ["romance"], subgenre: "life-update",
    intensity: 0, triggers: [], vibes: { friends: 1, laughs: 0.4 }, worthIt: 0.9, volatility: 0.05,
    text: "Asked them to the formal using a pizza. They said yes 🍕💌", scene: { pose: "envelope", tone: "orange" }, hoursAgo: 3,
  },
  {
    id: "p25", author: "World Desk", handle: "worlddesk", category: "learning", topics: ["news"], subgenre: "explainer",
    intensity: 2, triggers: [], vibes: { world: 1, learning: 0.6 }, worthIt: 0.7, volatility: 0.45,
    text: "A calm explainer on the storm recovery — what happened, what helps, how to donate.", hoursAgo: 6,
  },
  {
    id: "p26", author: "Glow Lab", handle: "glowlab", category: "inspiration", topics: ["body"], subgenre: "glow-up",
    intensity: 1, triggers: ["comparison", "body-check"], vibes: { creative: 0.3 }, worthIt: 0.42, volatility: 0.5,
    text: "Rating every face shape from 1–10 (be honest in the comments)", hoursAgo: 2,
  },
  {
    id: "p27", author: "Sky Watch", handle: "skywatch", category: "learning", topics: [], subgenre: "science",
    intensity: 0, triggers: [], vibes: { learning: 0.8, calm: 0.6 }, worthIt: 0.9, volatility: 0.1,
    text: "Tonight: the Moon and Jupiter will be side by side after 9pm. Look south-east 🔭",
    offline: "Step outside after 9pm and look up", hoursAgo: 9,
  },
  {
    id: "p28", author: "Mo", handle: "mo.journal", category: "friends", topics: ["mental"], subgenre: "check-in",
    intensity: 1, triggers: [], vibes: { friends: 0.9, deep: 0.9 }, worthIt: 0.88, volatility: 0.05,
    text: "Wrote down 3 things I'm proud of instead of doomscrolling. Recommend 10/10 📓", hoursAgo: 11,
  },
  {
    id: "p29", author: "Panic Feed", handle: "panicfeed", category: "inspiration", topics: ["news", "mental"], subgenre: "doom-news",
    intensity: 3, triggers: ["panic", "doom", "hopeless"], vibes: { world: 0.6 }, worthIt: 0.2, volatility: 0.9,
    text: "If you're not scared yet, you're not paying attention.", hoursAgo: 1,
  },
  {
    id: "p30", author: "Sketch Sam", handle: "sketchsam", category: "reels", topics: [], subgenre: "art-process",
    intensity: 0, triggers: [], vibes: { creative: 1, calm: 0.6 }, worthIt: 0.9, volatility: 0.1,
    text: "Timelapse: one line drawing, no lifting the pen ✍️", scene: { pose: "megaphone", tone: "purple" }, hoursAgo: 4,
  },
  {
    id: "p31", author: "Kindness Club", handle: "kindclub", category: "inspiration", topics: [], subgenre: "kindness",
    intensity: 0, triggers: [], vibes: { deep: 0.5, friends: 0.5, calm: 0.5 }, worthIt: 0.94, volatility: 0.15,
    text: "Our school left sticky notes on every locker. Mine said 'you're doing better than you think' 💚",
    scene: { pose: "envelope", tone: "lime" }, offline: "Leave a kind note for someone", hoursAgo: 7,
  },
  {
    id: "p32", author: "Lift Lou", handle: "liftlou", category: "learning", topics: ["fitness"], subgenre: "how-to",
    intensity: 0, triggers: [], vibes: { movement: 1, learning: 0.6 }, worthIt: 0.83, volatility: 0.1,
    text: "5 stretches for when you've been sitting all day. Takes 4 minutes 🧘",
    offline: "Do the 4-minute stretch", hoursAgo: 5,
  },
  {
    id: "p33", author: "Meme Dept", handle: "memedept", category: "inspiration", topics: [], subgenre: "memes",
    intensity: 0, triggers: [], vibes: { laughs: 1 }, worthIt: 0.8, volatility: 0.35,
    text: "me explaining to my cat why I need 9 tabs open 🐱", hoursAgo: 2,
  },
  {
    id: "p34", author: "Meme Dept", handle: "memedept", category: "inspiration", topics: [], subgenre: "memes",
    intensity: 0, triggers: [], vibes: { laughs: 1 }, worthIt: 0.78, volatility: 0.3,
    text: "group project roles: the one who does everything, the one who 'formats' 😭", hoursAgo: 3,
  },
  {
    id: "p35", author: "Meme Dept", handle: "memedept", category: "inspiration", topics: [], subgenre: "memes",
    intensity: 0, triggers: [], vibes: { laughs: 1 }, worthIt: 0.76, volatility: 0.3,
    text: "POV: you said 'see you later' and then saw them 4 more times that day", hoursAgo: 4,
  },
  {
    id: "p36", author: "Prank Palace", handle: "prankpalace", category: "reels", topics: ["drama"], subgenre: "prank",
    intensity: 2, triggers: ["loud", "sensory-overload"], vibes: { laughs: 0.6 }, worthIt: 0.33, volatility: 0.7,
    text: "SCARING my brother at 3AM (he screamed SO loud) 😱", hoursAgo: 2,
  },
];
