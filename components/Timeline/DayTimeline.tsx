import { useState, useEffect } from 'react';
import { Impact } from '../../utils/timeCalculations';
import { PlusIcon } from '@heroicons/react/solid';
import Modal from '../Modal';
import ActivityForm from './ActivityForm';

interface DayTimelineProps {
  dateKey: string;
  impacts: Impact[];
  goals: Array<{ id: string; name: string; color?: string }> | null;
  onSaveImpacts: (impacts: Impact[]) => void;
  showAddButton?: boolean;
}

export function DayTimeline({
  dateKey,
  impacts,
  goals,
  onSaveImpacts,
  showAddButton = true,
}: DayTimelineProps) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingImpact, setEditingImpact] = useState<Impact | null>(null);
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

  // Filter impacts for this specific day
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStart = new Date(year, month - 1, day).getTime();
  const dayEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

  const dayImpacts = impacts
    .filter(impact => {
      const impactDate = new Date(impact.date);
      return (
        impactDate.getFullYear() === year &&
        impactDate.getMonth() === month - 1 &&
        impactDate.getDate() === day
      );
    })
    .sort((a, b) => b.date - a.date); // Sort descending (newest first)

  const isToday = () => {
    const today = new Date();
    return (
      today.getFullYear() === year &&
      today.getMonth() === month - 1 &&
      today.getDate() === day
    );
  };

  const isTodayFlag = isToday();

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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

  const getDuration = (startTime: number, endTime: number) => {
    const durationMs = endTime - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getDurationInMs = (startTime: number, endTime: number) => {
    return endTime - startTime;
  };

  const getActivityColor = (impact: Impact) => {
    if (impact.goalId && goals) {
      const goal = goals.find(g => g.id === impact.goalId);
      if (goal?.color) return goal.color;
    }
    return 'bg-gray-400';
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

  const openEditModal = (impact: Impact) => {
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

  const saveEditedActivity = (formData: { activity: string; date: string; time: string; goalId: string }) => {
    const dateTimeString = `${formData.date}T${formData.time}`;
    const timestamp = new Date(dateTimeString).getTime();

    // Find the actual index in the full impacts array
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
    // Find the actual index in the full impacts array
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

  const handleAddActivityClick = () => {
    const now = Date.now();
    const { dateStr, timeStr } = getLocalDateTimeStrings(now);

    setAddFormInitialData({
      activity: "",
      date: dateKey,
      time: timeStr,
      goalId: "",
    });
    setShowAddModal(true);
  };

  const roundToNearest15Minutes = (timestamp: number): number => {
    const date = new Date(timestamp);
    const minutes = date.getMinutes();
    const roundedMinutes = Math.round(minutes / 15) * 15;

    date.setMinutes(roundedMinutes);
    date.setSeconds(0);
    date.setMilliseconds(0);

    return date.getTime();
  };

  return (
    <>
      <div className="relative">
        {dayImpacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg text-muted-foreground mb-2">No activities yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Start logging activities to see your timeline
            </p>
            {showAddButton && (
              <button
                onClick={handleAddActivityClick}
                className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Add Activity
              </button>
            )}
          </div>
        ) : (
          <div className="relative pl-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">Manual Activities</h3>

            {dayImpacts.map((impact, index) => {
              const isFirstItem = index === 0;
              const isLive = isTodayFlag && isFirstItem;

              let duration = null;
              let endTime: number;
              let durationMs: number;

              if (isFirstItem && !isTodayFlag) {
                endTime = dayEnd;
                duration = getDuration(impact.date, endTime);
                durationMs = getDurationInMs(impact.date, endTime);
              } else if (!isFirstItem) {
                const nextActivity = dayImpacts[index - 1];
                endTime = nextActivity.date;
                duration = getDuration(impact.date, endTime);
                durationMs = getDurationInMs(impact.date, endTime);
              } else {
                durationMs = now - impact.date;
                endTime = now;
              }

              const durationMinutes = durationMs / (1000 * 60);
              const barHeight = Math.max(12, durationMinutes * 2);

              return (
                <div
                  key={`manual-${impact.date}-${index}`}
                  className="relative flex items-start group/manual-entry mb-2"
                >
                  <div
                    className={`absolute left-[-1.45rem] w-1 ${getActivityColor(
                      impact
                    )} ${isLive ? 'animate-pulse' : ''}`}
                    style={{ height: `${barHeight}px` }}
                  ></div>

                  <div
                    className={`bg-card border hover:shadow-md transition-shadow cursor-pointer flex-1 min-w-0 px-3 py-2 rounded ${
                      isLive ? 'border-primary border-2' : 'border-border'
                    }`}
                    style={{ minHeight: `${barHeight}px` }}
                    onClick={() => openEditModal(impact)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-sm font-mono whitespace-nowrap shrink-0 ${isLive ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                          {formatTime(impact.date)}
                        </span>
                        <h3 className={`text-base font-semibold truncate ${isLive ? 'text-primary' : 'text-foreground'}`}>
                          {impact.activity}
                        </h3>
                        {isLive && <span className="text-xs text-primary whitespace-nowrap shrink-0">(Live)</span>}
                      </div>
                      {duration && (
                        <span className="text-sm px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                          {duration}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Activity Modal */}
      <Modal isOpen={showAddModal} closeModal={() => {
        setShowAddModal(false);
        setAddFormInitialData(null);
      }}>
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
      <Modal isOpen={showEditModal} closeModal={() => {
        setShowEditModal(false);
        setEditFormData(null);
      }}>
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
    </>
  );
}
