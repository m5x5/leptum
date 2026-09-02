import type { Schema } from "shexj";

/**
 * =============================================================================
 * userSettingsSchema: ShexJ Schema for userSettings
 * =============================================================================
 */
export const userSettingsSchema: Schema = {
  type: "Schema",
  shapes: [
    {
      id: "https://mpeters.dev/ns/leptum#UserSettingsShape",
      type: "ShapeDecl",
      shapeExpr: {
        type: "Shape",
        expression: {
          type: "EachOf",
          expressions: [
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
              valueExpr: {
                type: "NodeConstraint",
                values: ["https://mpeters.dev/ns/leptum#UserSettings"],
              },
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#showKeyboardShortcuts",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#boolean",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#enabledExperiment",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "http://www.w3.org/ns/ui#colorScheme",
              valueExpr: {
                type: "NodeConstraint",
                values: [
                  "http://www.w3.org/ns/ui#LightColorScheme",
                  "http://www.w3.org/ns/ui#DarkColorScheme",
                  "http://www.w3.org/ns/ui#SystemColorScheme",
                ],
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#timeFormat",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#string",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#wakingStartHour",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#time",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#wakingEndHour",
              valueExpr: {
                type: "NodeConstraint",
                datatype: "http://www.w3.org/2001/XMLSchema#time",
              },
              min: 0,
              max: 1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#suggestContactsFrom",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
            },
            {
              type: "TripleConstraint",
              predicate: "https://mpeters.dev/ns/leptum#suggestContactsFromGroup",
              valueExpr: {
                type: "NodeConstraint",
                nodeKind: "iri",
              },
              min: 0,
              max: -1,
            },
          ],
        },
        extra: ["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],
      },
    },
  ],
};
