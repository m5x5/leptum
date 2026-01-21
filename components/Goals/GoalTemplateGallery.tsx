import React, { useState } from 'react';
import { GOAL_TEMPLATES, GoalTemplate } from '../../utils/goalTemplates';

interface GoalTemplateGalleryProps {
  onSelectTemplate: (template: GoalTemplate) => void;
  categoryName?: string;
}

export default function GoalTemplateGallery({ onSelectTemplate, categoryName }: GoalTemplateGalleryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTemplates = GOAL_TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          Get Started with Goal Templates
        </h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
          Choose from popular goal templates with pre-filled milestones and best practices.
          Each template can be customized before adding to your board.
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="group relative p-4 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {/* Icon and Color Indicator */}
            <div className="flex items-start gap-3 mb-3">
              <div className="text-3xl flex-shrink-0">{template.icon}</div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  {template.name}
                </h4>
                <span className="text-xs text-muted-foreground">{template.category}</span>
              </div>
              <div className={`w-3 h-3 rounded-full ${template.color} flex-shrink-0 mt-1`} />
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
              {template.description}
            </p>

            {/* Milestone Count */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
              <span>{template.milestones.length} milestones</span>
            </div>

            {/* Hover Indicator */}
            <div className="absolute inset-0 rounded-lg border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </button>
        ))}
      </div>

      {/* No Results */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No templates found matching &quot;{searchTerm}&quot;
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="mt-2 text-sm text-primary hover:underline"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="relative py-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      {/* Start from Scratch Button */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Prefer to start from scratch?
        </p>
        <button
          onClick={() => onSelectTemplate(null as any)}
          className="px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:border-primary transition-colors"
        >
          Create Custom Goal
        </button>
      </div>
    </div>
  );
}
