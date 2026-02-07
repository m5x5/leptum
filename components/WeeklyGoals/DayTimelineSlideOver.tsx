import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XIcon } from '@heroicons/react/solid';
import { Impact } from '../../utils/timeCalculations';
import { TimelineDayView } from '../Timeline/TimelineDayView';
import { ProcessedAWEvent } from '../../activity-watch.d';
import Modal from '../Modal';
import ActivityForm from '../Timeline/ActivityForm';
import AWEventDetailModal from '../Modal/AWEventDetailModal';

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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
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

  const handleOpenEditModal = (impact: Impact, index: number) => {
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
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-in-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in-out duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 transition-opacity" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-hidden">
            <div className="absolute inset-0 overflow-hidden">
              <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
                <Transition.Child
                  as={Fragment}
                  enter="transform transition ease-in-out duration-300"
                  enterFrom="translate-x-full"
                  enterTo="translate-x-0"
                  leave="transform transition ease-in-out duration-300"
                  leaveFrom="translate-x-0"
                  leaveTo="translate-x-full"
                >
                  <Dialog.Panel className="pointer-events-auto w-screen max-w-7xl">
                    <div className="flex h-full flex-col overflow-y-scroll bg-background shadow-xl">
                      {/* Header */}
                      <div className="sticky top-0 z-20 bg-background border-b border-border px-6 py-4">
                        <div className="flex items-center justify-between">
                          <Dialog.Title className="text-xl font-semibold text-foreground">
                            {dayLabel} Timeline
                          </Dialog.Title>
                          <button
                            type="button"
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                            onClick={onClose}
                          >
                            <XIcon className="h-6 w-6" />
                          </button>
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
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Add Activity Modal - Higher z-index to appear above slide-over */}
      <Modal
        isOpen={showAddModal}
        closeModal={() => {
          setShowAddModal(false);
          setAddFormInitialData(null);
        }}
        className="z-[60]"
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

      {/* Edit Activity Modal - Higher z-index to appear above slide-over */}
      <Modal
        isOpen={showEditModal}
        closeModal={() => {
          setShowEditModal(false);
          setEditFormData(null);
        }}
        className="z-[60]"
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
        className="z-[70]"
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

      {/* ActivityWatch Event Detail Modal - Higher z-index to appear above slide-over */}
      <AWEventDetailModal
        isOpen={showAWDetailModal}
        closeModal={() => setShowAWDetailModal(false)}
        event={selectedAWEvent}
        onCreateManualEntry={handleCreateManualEntry}
      />
    </>
  );
}
