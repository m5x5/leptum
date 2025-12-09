import Head from "next/head";
import { useState } from "react";
import GoalList from "../components/Goals/List";
import { useGoals } from "../utils/useGoals";
import { useGoalTypes } from "../utils/useGoalTypes";
import { useWeeklyGoals } from "../utils/useWeeklyGoals";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from "@heroicons/react/solid";

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const;

export default function GoalsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'weekly'>('general');
  const { goals, isError } = useGoals();
  const { goalTypes, isError: isErrorGoalTypes, addGoalType } = useGoalTypes();

  const {
    weeklyGoal,
    currentWeekStart,
    isLoading: weeklyLoading,
    isError: weeklyError,
    addGoal,
    removeGoal,
    updateGoal,
    navigateWeek,
    goToCurrentWeek
  } = useWeeklyGoals();

  const [editingGoal, setEditingGoal] = useState<{ day: string; index: number } | null>(null);
  const [editText, setEditText] = useState("");

  const handleRemove = (name: string) => {};

  const handleAddGoalType = () => {
    const name = prompt("What is the name of the goal category?");
    if (!name) return;

    const description = prompt("Optional: Add a description for this category") || "";
    addGoalType(name, description);
  };

  if (isError) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goals) return <div>loading...</div>;
  if (isErrorGoalTypes) return <div>Failed to load. Press F5 to retry.</div>;
  if (!goalTypes) return <div>loading...</div>;

  const formatWeekDisplay = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(currentWeekStart);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return today >= monday && today <= sunday;
  };

  const handleAddGoal = (day: typeof DAYS[number]['key']) => {
    const goalText = prompt(`What goal do you want to add for ${day}?`);
    if (!goalText) return;
    addGoal(day, goalText);
  };

  const handleEditGoal = (day: typeof DAYS[number]['key'], index: number, currentText: string) => {
    setEditingGoal({ day, index });
    setEditText(currentText);
  };

  const handleSaveEdit = () => {
    if (!editingGoal || !editText.trim()) return;
    updateGoal(editingGoal.day as any, editingGoal.index, editText);
    setEditingGoal(null);
    setEditText("");
  };

  const handleCancelEdit = () => {
    setEditingGoal(null);
    setEditText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <>
      <Head>
        <title>Goals - Leptum</title>
      </Head>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Goals</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your objectives and organize them by category
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 px-1 border-b-2 transition ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            General Goals
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`pb-3 px-1 border-b-2 transition ${
              activeTab === 'weekly'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly Goals
          </button>
        </div>
      </div>

      {/* General Goals Tab */}
      {activeTab === 'general' && (
        <>
          <div className="mb-4 flex justify-end">
            <button
              onClick={handleAddGoalType}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition cursor-pointer"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Add Goal Category</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {goalTypes.map((goalType) => (
              <GoalList
                name={goalType.name}
                stored={true}
                key={goalType.id}
                id={goalType.id}
                remove={handleRemove}
                items={goals.filter((goal) => goal.type === goalType.id)}
              />
            ))}
            {goalTypes.length === 0 && (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                No goal categories yet. Click "Add Goal Category" to create one.
              </div>
            )}
          </div>
        </>
      )}

      {/* Weekly Goals Tab */}
      {activeTab === 'weekly' && (
        <>
          {weeklyError && <div>Failed to load weekly goals. Press F5 to retry.</div>}
          {weeklyLoading && <div>loading weekly goals...</div>}
          {!weeklyLoading && !weeklyError && weeklyGoal && (
            <>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigateWeek('prev')}
                      className="p-2 text-muted-foreground hover:text-primary transition cursor-pointer"
                    >
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>

                    <div className="text-center min-w-[240px]">
                      <div className="text-sm text-foreground">{formatWeekDisplay(currentWeekStart)}</div>
                      {!isCurrentWeek() && (
                        <button
                          onClick={goToCurrentWeek}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          Go to current week
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => navigateWeek('next')}
                      className="p-2 text-muted-foreground hover:text-primary transition cursor-pointer"
                    >
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {DAYS.map(({ key, label }) => (
                  <div key={key} className="p-4 bg-card border border-border rounded-lg">
                    <div className="flex flex-row justify-between items-center mb-3">
                      <h2 className="text-lg text-foreground font-medium">{label}</h2>
                      <PlusIcon
                        className="w-5 cursor-pointer text-muted-foreground hover:text-primary transition"
                        onClick={() => handleAddGoal(key)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      {weeklyGoal.goals[key].map((goal, index) => (
                        <div
                          key={index}
                          className="group flex items-start gap-2 p-2 bg-background border border-border rounded hover:border-primary transition"
                        >
                          {editingGoal?.day === key && editingGoal?.index === index ? (
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={handleKeyPress}
                              onBlur={handleSaveEdit}
                              autoFocus
                              className="flex-1 bg-transparent text-foreground outline-none"
                            />
                          ) : (
                            <>
                              <span
                                className="flex-1 text-sm text-foreground cursor-pointer"
                                onClick={() => handleEditGoal(key, index, goal)}
                              >
                                {goal}
                              </span>
                              <TrashIcon
                                className="w-4 h-4 text-muted-foreground hover:text-red-500 cursor-pointer opacity-0 group-hover:opacity-100 transition"
                                onClick={() => removeGoal(key, index)}
                              />
                            </>
                          )}
                        </div>
                      ))}

                      {weeklyGoal.goals[key].length === 0 && (
                        <p className="text-sm text-muted-foreground">No goals yet.</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}
