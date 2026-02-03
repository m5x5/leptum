import { useState } from 'react';
import { TrashIcon, ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@heroicons/react/outline';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { PluggableList } from 'unified';
import { Goal, GoalMilestone } from '../../utils/useGoals';
import { DeadlineIndicator } from './DeadlineIndicator';
import { MilestoneList } from './MilestoneList';
import { getMilestoneProgress } from '../../utils/deadlineUtils';
import { GoalTrackingWidget } from './GoalTrackingWidget';

interface GoalItemProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (id: string, goal: Goal) => void;
  onComplete: (id: string) => void;
  onAddMilestone: (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => void;
  onUpdateMilestone: (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
  onSelectTemplate?: (goal: Goal) => void;
}

export function GoalItem({
  goal,
  onDelete,
  onEdit,
  onComplete,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
  onSelectTemplate
}: GoalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMilestones = goal.milestones && goal.milestones.length > 0;
  const progress = getMilestoneProgress(goal.milestones);
  const isCompleted = goal.status === 'completed';

  return (
    <div className={`bg-card border border-border rounded-xl overflow-hidden ${isCompleted ? 'opacity-60' : ''}`}>
      {/* Main content row */}
      <div className="p-3 flex items-center gap-3">
        {/* Completion checkbox */}
        <button
          onClick={() => !isCompleted && onComplete(goal.id)}
          disabled={isCompleted}
          className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isCompleted
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-muted-foreground hover:border-primary cursor-pointer'
          }`}
          title={isCompleted ? 'Completed' : 'Mark as complete'}
        >
          {isCompleted && <CheckIcon className="w-3 h-3" />}
        </button>

        {/* Color indicator */}
        {goal.color && (
          <div className={`w-3 h-3 rounded-full ${goal.color} flex-shrink-0`}></div>
        )}

        {/* Goal name and info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(goal.id, goal)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-lg font-bold text-foreground hover:text-primary transition ${isCompleted ? 'line-through' : ''}`}>
              {goal.name}
            </h3>
            {!isCompleted && goal.targetDate && (
              <DeadlineIndicator targetDate={goal.targetDate} compact />
            )}
          </div>
          {goal.description && (
            <div 
              className="text-sm text-muted-foreground mt-0.5 line-clamp-1 [&_a]:text-primary [&_a]:hover:underline [&_a]:inline"
              onClick={(e) => e.stopPropagation()}
            >
              <ReactMarkdown
                rehypePlugins={[rehypeRaw] as PluggableList}
                components={{
                  p: ({ children }) => <span className="inline">{children}</span>,
                  a: ({ node, href, children, ...props }) => {
                    // Get href from node properties if href prop is missing or modified
                    // Try multiple sources to get the original URL, including accessing raw data
                    const nodeProps = node?.properties as any;
                    // Check the raw markdown AST for the original URL
                    const rawHref = (node as any)?.data?.hProperties?.href || 
                                   (node as any)?.data?.hProperties?.url ||
                                   nodeProps?.href || 
                                   nodeProps?.url || 
                                   href || '';
                    
                    const actualHref = rawHref;
                    
                    if (!actualHref) return <span>{children}</span>;
                    
                    // For custom protocols (like obsidian://), don't use target="_blank"
                    const isCustomProtocol = /^[a-z][a-z0-9+.-]*:/.test(actualHref) && !['http:', 'https:', 'mailto:', 'tel:'].some(proto => actualHref.startsWith(proto));
                    
                    return (
                      <a 
                        href={actualHref} 
                        {...(isCustomProtocol ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Allow the link to navigate normally
                        }}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {goal.description}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Milestone progress indicator */}
        {hasMilestones && (
          <div className="flex-shrink-0 text-xs text-muted-foreground">
            {progress.completed}/{progress.total}
          </div>
        )}

        {/* Expand/collapse button */}
        {(hasMilestones || goal.description || goal.templateId) && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-muted-foreground hover:text-foreground"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {onSelectTemplate && !goal.templateId && (
            <button
              onClick={() => onSelectTemplate(goal)}
              className="p-1.5 text-muted-foreground hover:text-primary transition rounded-lg hover:bg-muted"
              title="Use template"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
              </svg>
            </button>
          )}
          <div className="bg-muted p-1 rounded-xl flex-shrink-0">
            <TrashIcon
              className="w-5 h-5 text-muted-foreground hover:text-red-500 transition cursor-pointer"
              onClick={() => onDelete(goal.id)}
            />
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border space-y-4">

          {/* Full description */}
          {goal.description && (
            <div 
              className="text-sm text-muted-foreground mt-3 [&_a]:text-primary [&_a]:hover:underline [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mb-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ReactMarkdown
                rehypePlugins={[rehypeRaw] as PluggableList}
                components={{
                  a: ({ node, href, children, ...props }) => {
                    // Get href from node properties if href prop is missing or modified
                    // Try multiple sources to get the original URL, including accessing raw data
                    const nodeProps = node?.properties as any;
                    // Check the raw markdown AST for the original URL
                    const rawHref = (node as any)?.data?.hProperties?.href || 
                                   (node as any)?.data?.hProperties?.url ||
                                   nodeProps?.href || 
                                   nodeProps?.url || 
                                   href || '';
                    
                    const actualHref = rawHref;
                    
                    if (!actualHref) return <span>{children}</span>;
                    
                    // For custom protocols (like obsidian://), don't use target="_blank"
                    const isCustomProtocol = /^[a-z][a-z0-9+.-]*:/.test(actualHref) && !['http:', 'https:', 'mailto:', 'tel:'].some(proto => actualHref.startsWith(proto));
                    
                    return (
                      <a 
                        href={actualHref} 
                        {...(isCustomProtocol ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Allow the link to navigate normally
                        }}
                      >
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {goal.description}
              </ReactMarkdown>
            </div>
          )}

          {/* Milestones */}
          <div className="mt-3">
            <MilestoneList
              milestones={goal.milestones || []}
              onComplete={(milestoneId) => onCompleteMilestone(goal.id, milestoneId)}
              onDelete={(milestoneId) => onDeleteMilestone(goal.id, milestoneId)}
              onUpdate={(milestoneId, updates) => onUpdateMilestone(goal.id, milestoneId, updates)}
              onAdd={(milestone) => onAddMilestone(goal.id, milestone)}
              readOnly={isCompleted}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalItem;
