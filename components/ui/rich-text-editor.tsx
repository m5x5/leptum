"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import "easymde/dist/easymde.min.css";

// Dynamic import to avoid SSR issues with SimpleMDE
const SimpleMDE = React.lazy(() => import("react-simplemde-editor"));

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const RichTextEditor = React.forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, minHeight = "150px" }, ref) => {
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
      setIsMounted(true);
    }, []);

    const editorOptions = React.useMemo(() => {
      return {
        spellChecker: false,
        placeholder: placeholder || "Enter description...",
        status: false,
        minHeight,
        toolbar: [
          "bold",
          "italic",
          "heading",
          "|",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "|",
          "preview",
        ] as any,
        previewClass: ["editor-preview", "prose", "prose-sm"] as any,
      };
    }, [placeholder, minHeight]);

    if (!isMounted) {
      // Show a simple textarea while loading
      return (
        <textarea
          ref={ref as any}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none",
            className
          )}
          rows={3}
        />
      );
    }

    return (
      <div ref={ref} className={cn("rich-text-editor", className)}>
        <React.Suspense
          fallback={
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={3}
            />
          }
        >
          <SimpleMDE
            value={value}
            onChange={onChange}
            options={editorOptions}
          />
        </React.Suspense>
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export { RichTextEditor };
