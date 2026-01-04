import React from 'react';
import { Mention, MentionsInput, SuggestionDataItem } from 'react-mentions';
import { cn } from '../../lib/utils';
import { Entity } from '../../utils/useEntities';

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  entities: Entity[];
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
}

/**
 * Shared mention input component using react-mentions
 * Replaces Input or Textarea with @mention functionality
 */
export function MentionInput({
  value,
  onChange,
  entities,
  placeholder = '',
  className = '',
  multiline = false,
  rows = 1,
  disabled = false,
  onBlur,
  onFocus,
  autoFocus = false,
}: MentionInputProps) {
  // Convert entities to suggestions format
  const suggestions: SuggestionDataItem[] = entities.map(entity => ({
    id: entity.id,
    display: entity.name,
  }));

  // Base styles matching the existing Input/Textarea components
  const baseInputStyle = {
    control: {
      fontSize: 'inherit',
    },
    '&multiLine': {
      control: {
        fontFamily: 'inherit',
        minHeight: multiline ? '80px' : '40px',
      },
      highlighter: {
        padding: '0.5rem 0.75rem',
        border: '1px solid transparent',
      },
      input: {
        padding: '0.5rem 0.75rem',
        border: '1px solid hsl(var(--input))',
        borderRadius: '0.375rem',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        outline: 'none',
        fontSize: '0.875rem',
        lineHeight: '1.25rem',
      },
    },
    '&singleLine': {
      display: 'inline-block',
      width: '100%',
      highlighter: {
        padding: '0.5rem 0.75rem',
        border: '1px solid transparent',
      },
      input: {
        padding: '0.5rem 0.75rem',
        border: '1px solid hsl(var(--input))',
        borderRadius: '0.375rem',
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
        outline: 'none',
        height: '2.5rem',
        fontSize: '0.875rem',
      },
    },
    suggestions: {
      list: {
        backgroundColor: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        maxHeight: '200px',
        overflow: 'auto',
        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      item: {
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid hsl(var(--border))',
        cursor: 'pointer',
        '&focused': {
          backgroundColor: 'hsl(var(--accent))',
        },
      },
    },
  };

  return (
    <div className={cn('w-full', className)}>
      <MentionsInput
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={baseInputStyle}
        singleLine={!multiline}
        disabled={disabled}
        onBlur={onBlur}
        onFocus={onFocus}
        autoFocus={autoFocus}
        allowSuggestionsAboveCursor
      >
        <Mention
          trigger="@"
          data={suggestions}
          style={{
            backgroundColor: 'hsl(var(--primary) / 0.1)',
            color: 'hsl(var(--primary))',
            fontWeight: 500,
            borderRadius: '0.25rem',
            padding: '0 0.25rem',
          }}
          displayTransform={(id, display) => `@${display}`}
        />
      </MentionsInput>
    </div>
  );
}

/**
 * Utility to extract entity IDs from text with @mentions
 * Parses markup format from react-mentions: @[Name](entityId)
 */
export function extractMentionedEntityIds(text: string): string[] {
  if (!text) return [];

  // Match pattern: @[DisplayName](entityId)
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const entityIds: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    entityIds.push(match[2]); // match[2] is the entityId
  }

  return entityIds;
}

/**
 * Utility to convert mentions markup to plain text for display
 */
export function mentionsToPlainText(text: string): string {
  if (!text) return '';

  // Replace @[DisplayName](entityId) with @DisplayName
  return text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1');
}

/**
 * Component to render text with highlighted mentions
 * Converts @[Name](id) markup to highlighted @Name spans
 */
export function HighlightedMentions({
  text,
  className = '',
  mentionClassName = 'bg-primary/10 text-primary px-1 py-0.5 rounded font-medium'
}: {
  text: string;
  className?: string;
  mentionClassName?: string;
}) {
  if (!text) return <>{text || ''}</>;

  // Check if text contains any mentions
  const mentionRegex = /@\[([^\]]+)\]\([^)]+\)/g;

  // If no mentions, return plain text
  if (!mentionRegex.test(text)) {
    return <>{text}</>;
  }

  // Reset regex for actual parsing
  mentionRegex.lastIndex = 0;

  // Split text by mention pattern and create parts
  const parts: (string | { type: 'mention'; name: string })[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    // Add the mention
    parts.push({ type: 'mention', name: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last mention
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // If no parts were created, return plain text
  if (parts.length === 0) {
    return <>{text}</>;
  }

  return (
    <span className={className}>
      {parts.map((part, idx) => {
        if (typeof part === 'string') {
          return <span key={idx}>{part}</span>;
        }
        return (
          <span
            key={idx}
            className={mentionClassName}
          >
            @{part.name}
          </span>
        );
      })}
    </span>
  );
}
