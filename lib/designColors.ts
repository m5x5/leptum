/**
 * Design color constants — single source of truth for non-tokenized colors.
 *
 * Use cases:
 * - Brand colors (third-party identity, must stay literal)
 * - Categorical palettes (activity buckets, goal templates, emotions)
 *
 * For semantic colors (success/warning/info/streak) and the heatmap ramp,
 * use the CSS tokens defined in styles/global.css instead.
 */

// ---------- Brand colors (third-party, never themed) ----------

export const brandColors = {
  google: {
    blue: "#4285F4",
    green: "#34A853",
    yellow: "#FBBC05",
    red: "#EA4335",
  },
  github: "#181717",
  remoteStorage: "#FF4B03",
} as const;

// ---------- Activity bucket palette (used by ActivityWatch) ----------

export const activityBucketColors = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-yellow-500",
  "bg-indigo-500",
  "bg-red-500",
  "bg-teal-500",
  "bg-cyan-500",
] as const;

export const activityBucketSpecialColors = {
  afk: "bg-gray-400",
  idle: "bg-gray-300",
} as const;

// ---------- Goal template accents ----------

export const goalTemplateColors = {
  fitness: "bg-emerald-500",
  learning: "bg-sky-500",
  habit: "bg-violet-500",
  health: "bg-rose-500",
  career: "bg-amber-500",
  finance: "bg-green-600",
  creative: "bg-fuchsia-500",
  social: "bg-pink-500",
  mindfulness: "bg-indigo-500",
  productivity: "bg-blue-500",
} as const;

// ---------- Emotion swatches ----------

export const emotionColors = {
  happy: "bg-yellow-400",
  excited: "bg-orange-400",
  calm: "bg-teal-400",
  focused: "bg-blue-500",
  neutral: "bg-gray-400",
  tired: "bg-slate-500",
  stressed: "bg-amber-600",
  anxious: "bg-purple-500",
  sad: "bg-blue-700",
  angry: "bg-red-600",
} as const;
