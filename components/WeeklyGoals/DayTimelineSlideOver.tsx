import { useState } from 'react';
import { XIcon } from '@heroicons/react/solid';
import { Impact } from '../../utils/timeCalculations';
import { TimelineDayView } from '../Timeline/TimelineDayView';
import { ProcessedAWEvent } from '../../activity-watch.d';
import Modal from '../Modal';
import ActivityForm from '../Timeline/ActivityForm';
import AWEventDetailModal from '../Modal/AWEventDetailModal';
import { Sheet, SheetPortal, SheetOverlay } from '../ui/sheet';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../lib/utils';

interface DayTimelineSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  dayLabel: string;
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
  onSaveImpacts: (impacts: Impact[]) => void;
  awEvents?: ProcessedAWEvent[];
  filterSettings?: {
    showManual: boolean;
    showActivityWatch: boolean;
  };
}

export function DayTimelineSlideOver({
  isOpen,
  onClose,
  dateKey,
  dayLabel,
  impacts,
  goals,
  onSaveImpacts,
  awEvents = [],
  filterSettings = { showManual: true, showActivityWatch: awEvents.length > 0 },
}: DayTimelineSlideOverProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAWDetailModal, setShowAWDetailModal] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
  const [selectedAWEvent, setSelectedAWEvent] = useState<ProcessedAWEvent | null>(null);
  const [editFormData, setEditFormData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);
  const [addFormInitialData, setAddFormInitialData] = useState<{
    activity: string;
    date: string;
    time: string;
    goalId: string;
  } | null>(null);

  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day).getTime();

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getLocalDateTimeStrings = (timestamp: number) => {
    const date = new Date(timestamp);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${y}-${m}-${d}`,
      timeStr: `${hours}:${minutes}`
    };
  };

  const getActivityColor = (impact: Impact) => {
    if (impact.goalId && goals) {
      const goal = goals.find(g => g.id === impact.goalId);
      if (goal?.color) return goal.color;
    }
    return 'bg-gray-400';
  };

  const handleOpenEditModal = (impact: Impact, _index: number) => {
    setEditingImpact(impact);
    const { dateStr, timeStr } = getLocalDateTimeStrings(impact.date);
    setEditFormData({
      activity: impact.activity,
      date: dateStr,
      time: timeStr,
      goalId: impact.goalId || "",
    });
    setShowEditModal(true);
  };

  const handleOpenAddModal = (data: { activity: string; date: string; time: string; goalId: string }) => {
    setAddFormInitialData(data);
    setShowAddModal(true);
  };

  const handleAWEventClick = (event: ProcessedAWEvent) => {
    setSelectedAWEvent(event);
    setShowAWDetailModal(true);
  };

  const addNewActivity = (formData: { activity: string; date: string; time: string; goalId: string }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const newImpact: Impact = {
      activity: formData.activity,
      date: timestamp,
    };

    if (formData.goalId) {
      newImpact.goalId = formData.goalId;
    }

    const updatedImpacts = [...impacts, newImpact];
    onSaveImpacts(updatedImpacts);

    setShowAddModal(false);
    setAddFormInitialData(null);
  };

  const saveEditedActivity = (formData: { activity: string; date: string; time: string; goalId: string }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    const actualIndex = impacts.findIndex(
      (imp) => imp.date === editingImpact?.date && imp.activity === editingImpact?.activity
    );

    if (actualIndex === -1) return;

    const updatedImpacts = [...impacts];
    updatedImpacts[actualIndex] = {
      ...updatedImpacts[actualIndex],
      activity: formData.activity,
      date: timestamp,
      goalId: formData.goalId || undefined,
    };

    onSaveImpacts(updatedImpacts);

    setShowEditModal(false);
    setEditingImpact(null);
    setEditFormData(null);
  };

  const deleteActivity = () => {
    const actualIndex = impacts.findIndex(
      (imp) => imp.date === editingImpact?.date && imp.activity === editingImpact?.activity
    );

    if (actualIndex === -1) return;

    const updatedImpacts = impacts.filter((_, index) => index !== actualIndex);
    onSaveImpacts(updatedImpacts);

    setShowDeleteConfirm(false);
    setShowEditModal(false);
    setEditingImpact(null);
    setEditFormData(null);
  };

  const handleCreateManualEntry = (event: ProcessedAWEvent) => {
    const { dateStr, timeStr } = getLocalDateTimeStrings(event.timestamp);
    setAddFormInitialData({
      activity: event.displayName,
      date: dateStr,
      time: timeStr,
      goalId: "",
    });
    setShowAWDetailModal(false);
    setShowAddModal(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetPortal>
          <SheetOverlay />
          <SheetPrimitive.Content
            className={cn(
              "fixed z-50 inset-y-0 right-0 h-full w-screen max-w-7xl",
              "bg-background shadow-xl flex flex-col overflow-y-scroll",
              "transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out",
              "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
              "data-[state=closed]:duration-300 data-[state=open]:duration-300"
            )}
          >
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-4">
              <div className="flex items-center justify-between">
                <SheetPrimitive.Title className="text-xl font-semibold text-foreground">
                  {dayLabel} Timeline
                </SheetPrimitive.Title>
                <SheetPrimitive.Close
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <XIcon className="h-6 w-6" />
                </SheetPrimitive.Close>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(dayStart)}
                {awEvents.length > 0 && (
                  <span className="ml-2 text-xs">
                    • {awEvents.length} ActivityWatch events
                  </span>
                )}
              </p>
            </div>

            {/* Timeline Content */}
            <div className="flex-1 px-8 py-4">
              <TimelineDayView
                dateKey={dateKey}
                impacts={impacts}
                goals={goals}
                awEvents={awEvents}
                filterSettings={filterSettings}
                onOpenEditModal={handleOpenEditModal}
                onOpenAddModal={handleOpenAddModal}
                onAWEventClick={handleAWEventClick}
                getActivityColor={getActivityColor}
              />
            </div>
          </SheetPrimitive.Content>
        </SheetPortal>
      </Sheet>

      {/* Add Activity Modal */}
      <Modal
        isOpen={showAddModal}
        closeModal={() => {
          setShowAddModal(false);
          setAddFormInitialData(null);
        }}
      >
        <Modal.Title>Add Activity</Modal.Title>
        <Modal.Body>
          {addFormInitialData && (
            <ActivityForm
              initialData={addFormInitialData}
              onSubmit={addNewActivity}
              onCancel={() => {
                setShowAddModal(false);
                setAddFormInitialData(null);
              }}
              submitLabel="Add Activity"
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Edit Activity Modal */}
      <Modal
        isOpen={showEditModal}
        closeModal={() => {
          setShowEditModal(false);
          setEditFormData(null);
        }}
      >
        <Modal.Title>Edit Activity</Modal.Title>
        <Modal.Body>
          {editFormData && (
            <ActivityForm
              initialData={editFormData}
              onSubmit={saveEditedActivity}
              onCancel={() => {
                setShowEditModal(false);
                setEditFormData(null);
              }}
              submitLabel="Save Changes"
              showDelete={true}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}
        </Modal.Body>
      </Modal>

      {/* Delete Activity Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        closeModal={() => setShowDeleteConfirm(false)}
      >
        <Modal.Title>Delete Activity</Modal.Title>
        <Modal.Body>
          Are you sure you want to delete &quot;{editingImpact?.activity}&quot;?
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="min-h-[44px] px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={deleteActivity}
              className="min-h-[44px] px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* ActivityWatch Event Detail Modal */}
      <AWEventDetailModal
        isOpen={showAWDetailModal}
        closeModal={() => setShowAWDetailModal(false)}
        event={selectedAWEvent}
        onCreateManualEntry={handleCreateManualEntry}
      />
    </>
  );
}
