import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/outline';
import { DotsVerticalIcon, PencilIcon, TrashIcon, TemplateIcon, ArchiveIcon } from '@heroicons/react/solid';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import type { PluggableList } from 'unified';
import { Goal, GoalMilestone } from '../../utils/useGoals';
import { DeadlineIndicator } from './DeadlineIndicator';
import { MilestoneList } from './MilestoneList';
import { getMilestoneProgress } from '../../utils/deadlineUtils';
import { Button } from '../ui/button';


interface GoalItemProps {
  goal: Goal;
  onDelete: (id: string) => void;
  onEdit: (id: string, goal: Goal) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onAddMilestone: (goalId: string, milestone: Omit<GoalMilestone, 'id' | 'order'>) => void;
  onUpdateMilestone: (goalId: string, milestoneId: string, updates: Partial<GoalMilestone>) => void;
  onDeleteMilestone: (goalId: string, milestoneId: string) => void;
  onCompleteMilestone: (goalId: string, milestoneId: string) => void;
  onSelectTemplate?: (goal: Goal) => void;
}

function GoalItem({
  goal,
  onDelete,
  onEdit,
  onArchive,
  onUnarchive,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onCompleteMilestone,
  onSelectTemplate
}: GoalItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMilestones = goal.milestones && goal.milestones.length > 0;
  const progress = getMilestoneProgress(goal.milestones);

  return (
    <div className="bg-card border border-border rounded-card overflow-hidden">
      {/* Main content row */}
      <div className="pl-3 pr-3 py-2 flex items-center gap-3">
        {/* Color indicator */}
        {goal.color && (
           <div className={`w-1 ${goal.color} shrink-0 self-stretch rounded-full`}></div>
        )}

        {/* Goal name and info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onEdit(goal.id, goal)}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-foreground hover:text-primary transition">
              {goal.name}
            </h3>
            {goal.targetDate && (
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
                  a: ({ node, href, children }) => {
                    // Get href from node properties if href prop is missing or modified
                    // Try multiple sources to get the original URL, including accessing raw data
                    const nodeProps = node?.properties as Record<string, unknown>;
                    // Check the raw markdown AST for the original URL
                    const nodeData = (node as unknown as { data?: { hProperties?: { href?: string; url?: string } } })?.data;
                    const rawHref = nodeData?.hProperties?.href ||
                                   nodeData?.hProperties?.url ||
                                   (nodeProps?.href as string | undefined) ||
                                   (nodeProps?.url as string | undefined) ||
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon />
            ) : (
              <ChevronDownIcon />
            )}
          </Button>
        )}

        {/* Action menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <DotsVerticalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(goal.id, goal)}>
              <PencilIcon className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {onSelectTemplate && !goal.templateId && (
              <DropdownMenuItem onClick={() => onSelectTemplate(goal)}>
                <TemplateIcon className="h-4 w-4 mr-2" />
                Use template
              </DropdownMenuItem>
            )}
            {goal.status === 'archived' ? (
              <DropdownMenuItem onClick={() => onUnarchive(goal.id)}>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Unarchive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onArchive(goal.id)}>
                <ArchiveIcon className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(goal.id)} className="text-destructive focus:text-destructive">
              <TrashIcon className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border space-y-4">

          {/* Full description */}
          {goal.description && (
            <div 
              className="text-sm text-muted-foreground mt-3 [&_a]:text-primary [&_a]:hover:underline [&_p]:mb-2 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mb-1"
              onClick={(e) => e.stopPropagation()}
            >
              <ReactMarkdown
                rehypePlugins={[rehypeRaw] as PluggableList}
                components={{
                  a: ({ node, href, children }) => {
                    // Get href from node properties if href prop is missing or modified
                    // Try multiple sources to get the original URL, including accessing raw data
                    const nodeProps = node?.properties as Record<string, unknown>;
                    // Check the raw markdown AST for the original URL
                    const nodeData = (node as unknown as { data?: { hProperties?: { href?: string; url?: string } } })?.data;
                    const rawHref = nodeData?.hProperties?.href ||
                                   nodeData?.hProperties?.url ||
                                   (nodeProps?.href as string | undefined) ||
                                   (nodeProps?.url as string | undefined) ||
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
              readOnly={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalItem;
