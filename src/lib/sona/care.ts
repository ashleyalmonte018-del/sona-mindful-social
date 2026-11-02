import type { CareCondition, DialId, Filter, TopicId } from "./types";

export interface CareRule {
  id: CareCondition;
  label: string;
  short: string;
  /** Post triggers that are always held back. */
  heldTriggers: string[];
  /** Minimum filter for a topic — the user cannot loosen below this. */
  topicFloors: Partial<Record<TopicId, Filter>>;
  /** Dials that are capped (cannot be turned above this value). */
  dialCaps: Partial<Record<DialId, number>>;
  /** Subgenres / pillars sunk in ranking. */
  sunkPillars: string[];
  why: string;
  research: { neuro: string; origins: string; stats?: string; sources: { label: string; url: string }[] };
}

export const CARE_RULES: CareRule[] = [
  {
    id: "anxiety",
    label: "Anxiety",
    short: "Fewer panic loops and doom headlines",
    heldTriggers: ["panic", "doom", "flashing", "breaking-alert"],
    topicFloors: { news: "hold", drama: "soften" },
    dialCaps: { world: 20 },
    sunkPillars: ["true-crime", "doom-news", "callout"],
    why: "Breaking alerts and pile-ons keep the brain's alarm system switched on.",
    research: {
      neuro:
        "Anxiety is linked to the limbic system — the brain's emotional center — and to reduced calming GABA signaling or increased excitatory glutamate (Martin et al., 2009).",
      origins:
        "Early stress or trauma, demanding school or work hours, and big life changes are common stressors.",
      stats:
        "Anxiety-related conditions are the most common mental illness in the U.S., affecting 40M+ adults; only 43.2% of people with GAD get treatment (ADAA).",
      sources: [
        { label: "NIMH — Anxiety disorders", url: "https://www.nimh.nih.gov/health/topics/anxiety-disorders" },
        { label: "ADAA — Facts & statistics", url: "https://adaa.org/understanding-anxiety/facts-statistics" },
        { label: "Martin et al. 2009 (doi)", url: "https://doi.org/10.1016/j.psc.2009.05.004" },
      ],
    },
  },
  {
    id: "depression",
    label: "Depression",
    short: "No hopeless spirals or comparison bait",
    heldTriggers: ["self-harm", "hopeless", "comparison"],
    topicFloors: { body: "soften", hustle: "soften", drama: "soften" },
    dialCaps: {},
    sunkPillars: ["flex", "sad-loop", "glow-up"],
    why: "Comparison and hopeless loops can deepen low mood; we keep them out of your path.",
    research: {
      neuro:
        "Depression involves changes in brain chemistry — serotonin, dopamine and norepinephrine all play roles in mood regulation.",
      origins:
        "Genetics, environmental stress, trauma, chronic illness and substance use can contribute; chronic stress can change brain structure.",
      sources: [{ label: "NIMH — Depression", url: "https://www.nimh.nih.gov/health/topics/depression" }],
    },
  },
  {
    id: "eating",
    label: "Eating disorder",
    short: "No calorie talk, body checks or before/afters",
    heldTriggers: ["calorie-talk", "before-after", "body-check", "diet"],
    topicFloors: { body: "hold", food: "soften", fitness: "soften" },
    dialCaps: { movement: 40 },
    sunkPillars: ["glow-up", "what-i-eat", "transformation"],
    why: "Body checks and numbers-based food talk are well-known relapse triggers.",
    research: {
      neuro:
        "Studies point to differences in brain regions for appetite, reward processing and cognitive control.",
      origins:
        "A mix of genetics, low self-esteem, perfectionism, body-image dissatisfaction, pressure to be thin and stressful life events.",
      sources: [{ label: "NIMH — Eating disorders", url: "https://www.nimh.nih.gov/health/topics/eating-disorders" }],
    },
  },
  {
    id: "asd",
    label: "Autism (ASD)",
    short: "Calmer, predictable, no sensory overload",
    heldTriggers: ["flashing", "loud", "sensory-overload"],
    topicFloors: { drama: "soften" },
    dialCaps: {},
    sunkPillars: ["chaos-edit", "prank"],
    why: "Flashing visuals and sudden loud audio can be overwhelming; predictable posts rank higher.",
    research: {
      neuro:
        "ASD affects how people communicate, interact and behave, often with focused interests and preferred routines.",
      origins:
        "No single known cause — both genetics (e.g. Rett or fragile X syndrome) and environment play a role.",
      stats: "About 4 in 100 boys and 1 in 100 girls in the U.S. have autism.",
      sources: [
        { label: "Autism Speaks — Statistics", url: "https://www.autismspeaks.org/autism-statistics-asd" },
        {
          label: "Mayo Clinic — ASD",
          url: "https://www.mayoclinic.org/diseases-conditions/autism-spectrum-disorder/symptoms-causes/syc-20352928",
        },
      ],
    },
  },
  {
    id: "adhd",
    label: "ADHD",
    short: "Fewer rapid-cut edits and endless hooks",
    heldTriggers: ["rapid-cuts", "flashing"],
    topicFloors: { hustle: "soften" },
    dialCaps: {},
    sunkPillars: ["chaos-edit", "clickbait", "speedrun"],
    why: "Rapid-cut edits and cliffhanger hooks are designed to hijack attention.",
    research: {
      neuro:
        "ADHD affects attention, impulse control and activity level, with inattentive, hyperactive-impulsive and combined presentations.",
      origins:
        "Brain injury, prenatal exposure to lead, alcohol or tobacco, premature delivery and low birth weight are known risk factors.",
      stats: "About 6 million U.S. children aged 3–17 have been diagnosed, most aged 12–17.",
      sources: [
        { label: "CDC — ADHD data", url: "https://www.cdc.gov/ncbddd/adhd/data.html" },
        { label: "CDC — ADHD facts", url: "https://www.cdc.gov/ncbddd/adhd/facts.html" },
      ],
    },
  },
];

export const careRule = (id: CareCondition) => CARE_RULES.find((r) => r.id === id)!;

export const CRISIS_LINKS = [
  { label: "Call or text 988", url: "tel:988", note: "Suicide & Crisis Lifeline, 24/7" },
  { label: "Chat at 988lifeline.org", url: "https://988lifeline.org/", note: "If you're unsure how serious it is" },
  { label: "Find a therapist (MHA)", url: "https://www.mhanational.org/finding-therapy", note: "National guide" },
];
