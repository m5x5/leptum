"use client";

import { useState, useEffect } from "react";

import { useInsights, Insight, AffectedMetric } from "../../utils/useInsights";
import { PlusIcon, TrashIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/solid";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { MentionInput, HighlightedMentions, extractMentionedEntityIds } from "../../components/ui/mention-input";
import { useEntities } from "../../utils/useEntities";
import { useMentions } from "../../utils/useMentions";
import { useRoutineCompletions } from "../../utils/useRoutineCompletions";
import { useVelocity } from "../../utils/useVelocity";
import { useActivityWatch } from "../../utils/useActivityWatch";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { Routine } from "../../components/Job/api";
import { StreakBadge } from "../../components/StreakBadge";
import Modal from "../../components/Modal";
import YearViewHeatmap from "../../components/YearViewHeatmap";

// Metric configuration matching impact.js
const AVAILABLE_METRICS = [
  'happiness',
  'confidence',
  'stress',
  'cleanliness',
  'fulfillment',
  'motivation',
  'energy',
  'focus',
  'shame',
  'guilt'
];

export default function InsightsPageContent() {
  const { insights, loading, addInsight, updateInsight, deleteInsight } = useInsights();
  const { entities } = useEntities();
  const { updateMentionsForSource, deleteMentionsForSource } = useMentions();
  const { getStreaksForRoutine, completions: routineCompletions } = useRoutineCompletions();
  const { velocityData, loading: velocityLoading } = useVelocity();
  const { awData, filterSettings } = useActivityWatch();

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    yearView: true,
    streaks: true,
    velocity: true,
    activityWatch: true,
    insights: true
  });
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    category: '',
    affectedMetrics: [] as AffectedMetric[]
  });

  // Load routines for streak display
  useEffect(() => {
    const loadRoutines = async () => {
      try {
        const loadedRoutines = await remoteStorageClient.getRoutines();
        setRoutines(loadedRoutines as Routine[]);
      } catch (error) {
        console.error("Failed to load routines:", error);
      }
    };
    loadRoutines();
  }, []);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const openAddModal = () => {
    setEditingInsight(null);
    setFormData({
      name: '',
      notes: '',
      category: '',
      affectedMetrics: []
    });
    setShowModal(true);
  };

  const openEditModal = (insight: Insight) => {
    setEditingInsight(insight);
    setFormData({
      name: insight.name,
      notes: insight.notes || '',
      category: insight.category || '',
      affectedMetrics: insight.affectedMetrics
    });
    setShowModal(true);
  };

  const toggleMetric = (metric: string) => {
    const existingIndex = formData.affectedMetrics.findIndex(m => m.metric === metric);

    if (existingIndex >= 0) {
      // Toggle effect or remove
      const existing = formData.affectedMetrics[existingIndex];
      if (existing.effect === 'positive') {
        // Switch to negative
        const updated = [...formData.affectedMetrics];
        updated[existingIndex] = { ...existing, effect: 'negative' };
        setFormData({ ...formData, affectedMetrics: updated });
      } else {
        // Remove
        const updated = formData.affectedMetrics.filter(m => m.metric !== metric);
        setFormData({ ...formData, affectedMetrics: updated });
      }
    } else {
      // Add as positive
      setFormData({
        ...formData,
        affectedMetrics: [...formData.affectedMetrics, { metric, effect: 'positive' }]
      });
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Please enter a name');
      return;
    }

    if (formData.affectedMetrics.length === 0) {
      alert('Please select at least one affected metric');
      return;
    }

    let insightId: string;
    if (editingInsight) {
      await updateInsight(editingInsight.id, formData);
      insightId = editingInsight.id;
    } else {
      const newInsight = await addInsight(formData);
      insightId = newInsight.id;
    }

    // Extract and save mentions from notes field
    if (formData.notes) {
      const mentionedEntityIds = extractMentionedEntityIds(formData.notes);
      await updateMentionsForSource('insight', insightId, 'notes', mentionedEntityIds, formData.notes);
    } else {
      // If notes are empty, clear any existing mentions
      await updateMentionsForSource('insight', insightId, 'notes', [], '');
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this insight?')) {
      await deleteMentionsForSource('insight', id);
      await deleteInsight(id);
    }
  };

  const getMetricEffect = (metric: string): 'positive' | 'negative' | null => {
    const found = formData.affectedMetrics.find(m => m.metric === metric);
    return found ? found.effect : null;
  };

  const getMetricButtonStyle = (metric: string) => {
    const effect = getMetricEffect(metric);
    if (!effect) {
      return "bg-muted text-foreground border border-border";
    }
    if (effect === 'positive') {
      return "bg-green-500 text-white border border-green-600";
    }
    return "bg-red-500 text-white border border-red-600";
  };

  const getMetricSymbol = (metric: string) => {
    const effect = getMetricEffect(metric);
    if (!effect) return '';
    return effect === 'positive' ? ' ↑' : ' ↓';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading insights...</div>
      </div>
    );
  }

  // Calculate velocity stats
  const avgNumeric = velocityData.length > 0
    ? velocityData.reduce((sum, week) => sum + week.totalNumeric, 0) / velocityData.length
    : 0;
  const avgTasks = velocityData.length > 0
    ? velocityData.reduce((sum, week) => sum + week.taskCount, 0) / velocityData.length
    : 0;

  // Get Show Up routine and other routines with completions
  const showUpRoutine = routines.find(r => r.isShowUpRoutine);
  const routinesWithStreaks = routines
    .filter(r => r.cron && !r.isShowUpRoutine)
    .map(r => ({
      routine: r,
      streakInfo: getStreaksForRoutine(r.id)
    }))
    .filter(r => r.streakInfo.currentStreak > 0 || r.streakInfo.longestStreak > 0);

  return (
    <>
        <div className="space-y-6">
          {/* Year View Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('yearView')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">📅</span>
                <h2 className="text-lg font-semibold text-foreground">Year View</h2>
              </div>
              {expandedSections.yearView ? (
                <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {expandedSections.yearView && (
              <div className="px-4 pb-4">
                {routines.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No routines yet. Create routines to see your year view!
                  </p>
                ) : routines.filter(r => r.cron && !r.isShowUpRoutine).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No scheduled routines found. Add routines with schedules to see your year view!
                  </p>
                ) : (
                  <>
                    {routines.filter(r => r.cron && !r.isShowUpRoutine).length > 1 && (
                      <p className="text-xs text-muted-foreground mb-3 text-center">
                        ← Scroll horizontally to view all routines →
                      </p>
                    )}
                    <div className="overflow-x-auto pb-4 -mx-4 px-4" style={{ scrollbarWidth: 'thin' }}>
                      <div className="flex gap-6 min-w-max">
                        {routines
                          .filter(r => r.cron && !r.isShowUpRoutine) // Only show scheduled routines, exclude Show Up
                          .map(routine => (
                            <YearViewHeatmap
                              key={routine.id}
                              completions={routineCompletions}
                              routineId={routine.id}
                              routineName={routine.name}
                            />
                          ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Streaks Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('streaks')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <h2 className="text-lg font-semibold text-foreground">Streaks</h2>
              </div>
              {expandedSections.streaks ? (
                <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {expandedSections.streaks && (
              <div className="px-4 pb-4 space-y-3">
                {/* Show Up Streak */}
                {showUpRoutine && (
                  <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">Show Up</h3>
                        <p className="text-xs text-muted-foreground">Daily app usage streak</p>
                      </div>
                      <StreakBadge streakInfo={getStreaksForRoutine(showUpRoutine.id)} />
                    </div>
                  </div>
                )}

                {/* Other Routine Streaks */}
                {routinesWithStreaks.length > 0 && (
                  <div className="space-y-2">
                    {routinesWithStreaks.map(({ routine, streakInfo }) => (
                      <div key={routine.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium text-foreground">{routine.name}</span>
                        <StreakBadge streakInfo={streakInfo} />
                      </div>
                    ))}
                  </div>
                )}

                {!showUpRoutine && routinesWithStreaks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Complete routines to build streaks!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ActivityWatch Statistics Section */}
          {awData && awData.buckets.length > 0 && (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('activityWatch')}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">📈</span>
                  <h2 className="text-lg font-semibold text-foreground">ActivityWatch Statistics</h2>
                </div>
                {expandedSections.activityWatch ? (
                  <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
              {expandedSections.activityWatch && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Buckets</p>
                      <p className="text-2xl font-bold text-foreground">
                        {awData.buckets.length}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Visible Buckets</p>
                      <p className="text-2xl font-bold text-foreground">
                        {filterSettings.visibleBuckets.length}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Total Events</p>
                      <p className="text-2xl font-bold text-foreground">
                        {awData.buckets.reduce((sum, b) => sum + b.eventCount, 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Bucket Types</p>
                      <p className="text-2xl font-bold text-foreground">
                        {new Set(awData.buckets.map((b) => b.type)).size}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Velocity Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('velocity')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">📊</span>
                <h2 className="text-lg font-semibold text-foreground">Velocity</h2>
              </div>
              {expandedSections.velocity ? (
                <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            {expandedSections.velocity && (
              <div className="px-4 pb-4">
                {velocityLoading ? (
                  <p className="text-sm text-muted-foreground">Loading velocity data...</p>
                ) : velocityData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Complete tasks with effort estimates to see velocity tracking.
                  </p>
                ) : (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{avgNumeric.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Points/Week</div>
                      </div>
                      <div className="text-center p-4 bg-muted/50 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{avgTasks.toFixed(1)}</div>
                        <div className="text-xs text-muted-foreground">Avg Tasks/Week</div>
                      </div>
                    </div>

                    {/* Weekly Breakdown */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent Weeks</h4>
                      {velocityData.slice(-4).map((week) => (
                        <div key={week.week} className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded">
                          <div className="text-sm font-medium">{week.week.replace('-W', ' Week ')}</div>
                          <div className="flex items-center gap-2">
                            {week.totalNumeric > 0 && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
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
                  </>
                )}
              </div>
            )}
          </div>

          {/* Insights Section */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('insights')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <h2 className="text-lg font-semibold text-foreground">What Helps</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); openAddModal(); }}
                  size="sm"
                  variant="outline"
                  className="hidden md:flex items-center gap-1"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add</span>
                </Button>
                {expandedSections.insights ? (
                  <ChevronUpIcon className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>
            {expandedSections.insights && (
              <div className="px-4 pb-4 space-y-3">
                {insights.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground mb-4">
                      No insights yet. Track what helps your mood!
                    </p>
                    <Button onClick={openAddModal} size="sm">
                      Add Your First Insight
                    </Button>
                  </div>
                ) : (
                  insights.map(insight => (
                    <div
                      key={insight.id}
                      className="bg-muted/30 rounded-lg p-4 hover:bg-muted/50 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">
                            {insight.name}
                          </h3>
                          {insight.category && (
                            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded">
                              {insight.category}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEditModal(insight)}
                            className="p-1.5 text-foreground hover:bg-muted rounded transition"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(insight.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded transition"
                            title="Delete"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {insight.affectedMetrics.map(({ metric, effect }) => (
                          <span
                            key={metric}
                            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                              effect === 'positive'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                            }`}
                          >
                            {effect === 'positive' ? '↑' : '↓'} {metric}
                          </span>
                        ))}
                      </div>

                      {insight.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          <HighlightedMentions text={insight.notes} />
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Add Button */}
        <button
          onClick={openAddModal}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Insight</span>
        </button>

        {/* Add/Edit Modal */}
        <Modal isOpen={showModal} closeModal={() => setShowModal(false)}>
          <Modal.Title>
            {editingInsight ? 'Edit Insight' : 'Add Insight'}
          </Modal.Title>
          <Modal.Body>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Tea, Walk outside, Call a friend"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category (optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Self-care, Social, Physical"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Affected Metrics *
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                  Click once for positive effect (↑), twice for negative (↓), third to remove
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_METRICS.map(metric => (
                    <button
                      key={metric}
                      type="button"
                      onClick={() => toggleMetric(metric)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${getMetricButtonStyle(metric)}`}
                    >
                      {metric}{getMetricSymbol(metric)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (optional)
                </label>
                <MentionInput
                  placeholder="When does this help? Any specific situations? Use @ to mention people, projects, or contexts"
                  value={formData.notes}
                  onChange={(value) => setFormData({ ...formData, notes: value })}
                  entities={entities}
                  multiline={true}
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
              >
                {editingInsight ? 'Save Changes' : 'Add Insight'}
              </button>
            </div>
          </Modal.Footer>
        </Modal>
    </>
  );
}
