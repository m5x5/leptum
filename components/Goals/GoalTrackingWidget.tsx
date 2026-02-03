import { Goal } from '../../utils/useGoals';
import { TrackingCounter } from './TrackingCounter';
import { TrackingChecklist } from './TrackingChecklist';
import { useImpacts } from '../../utils/useImpacts';

interface GoalTrackingWidgetProps {
  goal: Goal;
  onUpdate: () => void;
  embedded?: boolean; // When true, removes card border and title for integration into routine view
  showHistory?: boolean; // When false, hides the 7-day history chart
  showQuickAdd?: boolean; // When false, hides the quick add buttons
  routineName?: string; // Optional: filter checklist to show only items matching this routine name
}

/**
 * GoalTrackingWidget - Shows tracking UI for goals with templates
 * Falls back to showing impact count for goals without templates
 */
export function GoalTrackingWidget({ goal, onUpdate, embedded = false, showHistory = true, showQuickAdd = true, routineName }: GoalTrackingWidgetProps) {
  const { impacts } = useImpacts();
  
  // If goal has template and tracking config, use new tracking system
  if (goal.templateId && goal.trackingConfig) {
    const entries = goal.trackingData?.entries || [];
    
    // Use checklist component for checklist type, counter for counter type
    if (goal.trackingConfig.type === 'checklist') {
      return (
        <TrackingChecklist
          goal={goal}
          config={goal.trackingConfig}
          entries={entries}
          onUpdate={onUpdate}
          embedded={embedded}
          showHistory={showHistory}
          showQuickAdd={showQuickAdd}
          routineName={routineName}
        />
      );
    }
    
    return (
      <TrackingCounter
        goal={goal}
        config={goal.trackingConfig}
        entries={entries}
        onUpdate={onUpdate}
        embedded={embedded}
        showHistory={showHistory}
        showQuickAdd={showQuickAdd}
      />
    );
  }
  
  // Fallback: Show impact-based tracking for goals without templates
  const goalImpacts = impacts.filter(i => i.goalId === goal.id);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayImpacts = goalImpacts.filter(i => {
    const impactDate = new Date(i.date);
    impactDate.setHours(0, 0, 0, 0);
    return impactDate.getTime() === today.getTime();
  });
  
  // Only show if there are impacts
  if (goalImpacts.length === 0) {
    return null;
  }
  
  if (embedded) {
    return (
      <div className="text-sm text-muted-foreground">
        Today: {todayImpacts.length} activity{todayImpacts.length !== 1 ? 'ies' : ''}
        {goalImpacts.length > todayImpacts.length && (
          <span className="ml-2">• Total: {goalImpacts.length}</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{goal.color ? '📊' : '📈'}</span>
        <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
      </div>
      <div className="text-sm text-muted-foreground">
        Today: {todayImpacts.length} activity{todayImpacts.length !== 1 ? 'ies' : ''}
        {goalImpacts.length > todayImpacts.length && (
          <span className="ml-2">• Total: {goalImpacts.length}</span>
        )}
      </div>
    </div>
  );
}
