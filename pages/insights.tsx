import { useState } from "react";
import Head from "next/head";
import { useInsights, Insight, AffectedMetric } from "../utils/useInsights";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/solid";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import Modal from "../components/Modal";

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

export default function InsightsPage() {
  const { insights, loading, addInsight, updateInsight, deleteInsight } = useInsights();
  const [showModal, setShowModal] = useState(false);
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    category: '',
    affectedMetrics: [] as AffectedMetric[]
  });

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

    if (editingInsight) {
      await updateInsight(editingInsight.id, formData);
    } else {
      await addInsight(formData);
    }

    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this insight?')) {
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

  return (
    <>
      <Head>
        <title>Insights - Leptum</title>
      </Head>

      <div className="max-w-4xl mx-auto pb-32 md:pb-0">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Insights</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track what helps improve your wellbeing
            </p>
          </div>
          <Button
            onClick={openAddModal}
            className="hidden md:flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Insight</span>
          </Button>
        </div>

        {/* Mobile Add Button */}
        <button
          onClick={openAddModal}
          className="md:hidden fixed bottom-24 left-1/2 transform -translate-x-1/2 z-[45] flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Insight</span>
        </button>

        {/* Insights List */}
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-12 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground mb-4">
                No insights yet. Start adding what helps your mood!
              </p>
              <Button onClick={openAddModal}>
                Add Your First Insight
              </Button>
            </div>
          ) : (
            insights.map(insight => (
              <div
                key={insight.id}
                className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {insight.name}
                    </h3>
                    {insight.category && (
                      <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                        {insight.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(insight)}
                      className="p-2 text-foreground hover:bg-muted rounded-lg transition"
                      title="Edit"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(insight.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition"
                      title="Delete"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {insight.affectedMetrics.map(({ metric, effect }) => (
                    <span
                      key={metric}
                      className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${
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
                  <p className="text-sm text-muted-foreground">
                    {insight.notes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

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
                <Textarea
                  placeholder="When does this help? Any specific situations?"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="min-h-[100px]"
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
      </div>
    </>
  );
}
