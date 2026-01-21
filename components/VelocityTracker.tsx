import { useVelocity } from '../utils/useVelocity';

interface VelocityData {
  week: string;
  totalNumeric: number;
  tshirtCounts: Record<string, number>;
  taskCount: number;
}

export default function VelocityTracker() {
  const { velocityData, loading } = useVelocity();

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Velocity Tracking</h3>
        <div className="text-sm text-muted-foreground">Loading velocity data...</div>
      </div>
    );
  }

  if (velocityData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Velocity Tracking</h3>
        <div className="text-sm text-muted-foreground">
          Complete tasks with effort estimates to see velocity tracking.
        </div>
      </div>
    );
  }

  // Calculate averages
  const avgNumeric = velocityData.reduce((sum: number, week: VelocityData) => sum + week.totalNumeric, 0) / velocityData.length;
  const avgTasks = velocityData.reduce((sum: number, week: VelocityData) => sum + week.taskCount, 0) / velocityData.length;

  // Calculate T-shirt size distribution
  const tshirtTotals = velocityData.reduce((totals: Record<string, number>, week: VelocityData) => {
    Object.entries(week.tshirtCounts).forEach(([size, count]) => {
      totals[size] = (totals[size] || 0) + count;
    });
    return totals;
  }, {});

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">Velocity Tracking</h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{avgNumeric.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Avg Points/Week</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-primary">{avgTasks.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Avg Tasks/Week</div>
        </div>
      </div>

      {/* Weekly Breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last 4 Weeks</h4>
        {velocityData.slice(-4).map((week) => (
          <div key={week.week} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
            <div className="text-sm font-medium">{week.week.replace('-W', ' Week ')}</div>
            <div className="flex items-center gap-2">
              {week.totalNumeric > 0 && (
                <span className="text-xs bg-secondary/10 text-secondary-foreground px-2 py-1 rounded">
                  {week.totalNumeric.toFixed(1)} pts
                </span>
              )}
              <span className="text-xs bg-muted px-2 py-1 rounded">
                {week.taskCount} tasks
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* T-shirt Size Distribution */}
      {Object.keys(tshirtTotals).length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Size Distribution</h4>
          <div className="flex flex-wrap gap-1">
            {Object.entries(tshirtTotals)
              .sort(([a], [b]) => {
                const order = ['XS', 'S', 'M', 'L', 'XL'];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([size, count]) => (
                <span key={size} className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                  {size}: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}