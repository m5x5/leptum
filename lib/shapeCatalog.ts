export type LeptumShape = {
  slug: string;
  label: string;
  resourceType: string;
};

// Every shape is published in three equivalent representations, translated
// from the ShEx source of truth in shapes/*.shex:
//   shex   — shapes/<slug>.shex        (text/shex)
//   shacl  — shapes/<slug>.shacl.ttl   (text/turtle)
//   linkml — shapes/<slug>.linkml.yaml (application/yaml)
export type ShapeFormat = "shex" | "shacl" | "linkml";

export const SHAPE_FORMATS: Record<
  ShapeFormat,
  { extension: string; contentType: string; encodingFormat: string; accepts: string[] }
> = {
  shex: {
    extension: "shex",
    contentType: "text/shex; charset=utf-8",
    encodingFormat: "text/shex",
    accepts: ["text/shex", "text/plain"],
  },
  shacl: {
    extension: "shacl.ttl",
    contentType: "text/turtle; charset=utf-8",
    encodingFormat: "text/turtle",
    accepts: ["text/turtle", "application/turtle", "application/x-turtle"],
  },
  linkml: {
    extension: "linkml.yaml",
    contentType: "application/yaml; charset=utf-8",
    encodingFormat: "application/yaml",
    accepts: ["application/yaml", "text/yaml", "application/x-yaml"],
  },
};

export const LEPTUM_SHAPES: LeptumShape[] = [
  { slug: "activityWatchData", label: "ActivityWatch imported data", resourceType: "https://mpeters.dev/ns/leptum#ActivityWatchData" },
  { slug: "entity", label: "People, projects, and contexts", resourceType: "https://mpeters.dev/ns/leptum#Context" },
  { slug: "event", label: "Timeline impacts and life events", resourceType: "https://schema.org/Event" },
  { slug: "goal", label: "Goals, milestones, and tracking entries", resourceType: "https://mpeters.dev/ns/leptum#Goal" },
  { slug: "goalType", label: "Goal types", resourceType: "https://mpeters.dev/ns/leptum#GoalType" },
  { slug: "groceryNotification", label: "Grocery proximity notifications", resourceType: "https://mpeters.dev/ns/leptum#GroceryNotification" },
  { slug: "groceryStore", label: "Grocery stores", resourceType: "https://schema.org/GroceryStore" },
  { slug: "health", label: "Daily health metrics", resourceType: "https://mpeters.dev/ns/leptum#DailyHealthMetrics" },
  { slug: "image", label: "Photo attachments", resourceType: "https://schema.org/ImageObject" },
  { slug: "insight", label: "Behavioral insights", resourceType: "https://mpeters.dev/ns/leptum#Insight" },
  { slug: "location", label: "Location updates", resourceType: "https://schema.org/GeoCoordinates" },
  { slug: "mention", label: "Cross-resource mentions", resourceType: "http://www.w3.org/ns/oa#Annotation" },
  { slug: "note", label: "Quick notes and week reflections", resourceType: "https://www.w3.org/ns/activitystreams#Note" },
  { slug: "patternNote", label: "Pattern notes", resourceType: "https://mpeters.dev/ns/leptum#PatternNote" },
  { slug: "routine", label: "Routines and routine tasks", resourceType: "https://mpeters.dev/ns/leptum#Routine" },
  { slug: "routineCompletion", label: "Routine completions", resourceType: "https://schema.org/CompleteAction" },
  { slug: "task", label: "Standalone tasks", resourceType: "https://schema.org/Action" },
  { slug: "userSettings", label: "User settings", resourceType: "https://mpeters.dev/ns/leptum#UserSettings" },
  { slug: "velocityEntry", label: "Task effort velocity entries", resourceType: "https://mpeters.dev/ns/leptum#VelocityEntry" },
];

export function shapeUrl(origin: string, slug: string, format: ShapeFormat = "shex"): string {
  return new URL(`/shapes/${slug}.${SHAPE_FORMATS[format].extension}`, origin).toString();
}
