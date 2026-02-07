import { useState } from "react";
import Modal from ".";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { v4 as uuidv4 } from "uuid";

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (sampleData: {
    goal: { name: string; color: string; description: string };
    task: { name: string; description: string };
    routine: { name: string; cron: string; tasks: string[] };
    impact: { activity: string; date: number };
  }) => void;
  onSkip: () => void;
}

const SAMPLE_DATA = {
  goal: {
    name: "Learn a new skill",
    color: "bg-blue-500",
    description: "Dedicate time each week to learning something new and track my progress"
  },
  task: {
    name: "Read for 30 minutes",
    description: "Continue reading my current book"
  },
  routine: {
    name: "Morning Routine",
    cron: "0 8 * * *", // Every day at 8 AM
    tasks: ["Review today's goals", "Plan priorities", "Quick standup"]
  },
  impact: {
    activity: "Completed onboarding tutorial",
    date: Date.now()
  }
};

const OnboardingModal = ({ isOpen, onComplete, onSkip }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(SAMPLE_DATA);

  const steps = [
    {
      title: "Welcome to Leptum!",
      description: "Your personal productivity tracker with local-first, user-owned data storage.",
      content: (
        <div className="space-y-4 mt-4">
          <p className="text-foreground">
            Leptum helps you track your goals, manage tasks, build routines, and log activities - all while keeping your data under your control.
          </p>
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">Key Features:</h4>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Goals:</strong> Track what matters most with deadlines and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Tasks:</strong> Manage one-off to-dos with ease</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Routines:</strong> Schedule recurring tasks with CRON expressions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Timeline:</strong> Log activities and track your journey</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span><strong>Stacks:</strong> Themed lists of habits (e.g. morning habits) on the Stacks page</span>
              </li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">
            Let&apos;s create some sample data to help you get started. You can modify or delete these examples anytime.
          </p>
        </div>
      )
    },
    {
      title: "Step 1: Create Your First Goal",
      description: "Goals help you track what matters most. They can have deadlines, descriptions, and visual colors.",
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Goal Name
            </label>
            <Input
              type="text"
              value={formData.goal.name}
              onChange={(e) => setFormData({
                ...formData,
                goal: { ...formData.goal, name: e.target.value }
              })}
              placeholder="e.g., Learn React, Exercise daily..."
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description
            </label>
            <RichTextEditor
              value={formData.goal.description}
              onChange={(value) => setFormData({
                ...formData,
                goal: { ...formData.goal, description: value }
              })}
              placeholder="Describe your goal..."
              minHeight="100px"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {["bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500", "bg-pink-500"].map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    goal: { ...formData.goal, color }
                  })}
                  className={`w-10 h-10 rounded-lg ${color} hover:opacity-80 transition ${
                    formData.goal.color === color
                      ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 2: Add Your First Task",
      description: "Tasks are one-off items you need to complete. They're perfect for quick to-dos.",
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Task Name
            </label>
            <Input
              type="text"
              value={formData.task.name}
              onChange={(e) => setFormData({
                ...formData,
                task: { ...formData.task, name: e.target.value }
              })}
              placeholder="e.g., Buy groceries, Call dentist..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <RichTextEditor
              value={formData.task.description}
              onChange={(value) => setFormData({
                ...formData,
                task: { ...formData.task, description: value }
              })}
              placeholder="Add details..."
              minHeight="100px"
            />
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-foreground">
              <strong>Tip:</strong> You can complete tasks by clicking the checkbox next to them. Completed tasks are automatically archived.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Step 3: Set Up a Routine",
      description: "Routines are recurring tasks scheduled with CRON expressions. They automatically create tasks when triggered.",
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Routine Name
            </label>
            <Input
              type="text"
              value={formData.routine.name}
              onChange={(e) => setFormData({
                ...formData,
                routine: { ...formData.routine, name: e.target.value }
              })}
              placeholder="e.g., Morning Routine, Weekly Review..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Schedule (CRON)
            </label>
            <Input
              type="text"
              value={formData.routine.cron}
              onChange={(e) => setFormData({
                ...formData,
                routine: { ...formData.routine, cron: e.target.value }
              })}
              placeholder="e.g., 0 8 * * * (every day at 8 AM)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Current: Every day at 8:00 AM
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tasks in this routine
            </label>
            <div className="space-y-2">
              {formData.routine.tasks.map((task, idx) => (
                <Input
                  key={idx}
                  type="text"
                  value={task}
                  onChange={(e) => {
                    const newTasks = [...formData.routine.tasks];
                    newTasks[idx] = e.target.value;
                    setFormData({
                      ...formData,
                      routine: { ...formData.routine, tasks: newTasks }
                    });
                  }}
                  placeholder={`Task ${idx + 1}...`}
                />
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Step 4: Log Your First Activity",
      description: "The timeline helps you track what you've done throughout the day. You can attach goals, moods, and photos.",
      content: (
        <div className="space-y-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Activity
            </label>
            <Input
              type="text"
              value={formData.impact.activity}
              onChange={(e) => setFormData({
                ...formData,
                impact: { ...formData.impact, activity: e.target.value }
              })}
              placeholder="What did you do?"
            />
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-foreground mb-2">
              <strong>Timeline Features:</strong>
            </p>
            <ul className="space-y-1 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Link activities to goals using the dropdown</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Track mood metrics like stress and fulfillment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Attach photos to create a visual journal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Import ActivityWatch data for automatic tracking</span>
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      title: "You're All Set!",
      description: "We've created sample data to get you started. Explore the app and make it your own!",
      content: (
        <div className="space-y-4 mt-4">
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2">What&apos;s Next?</h4>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Review your sample goal, task, routine, and timeline entry</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Modify or delete them to suit your needs</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Create your own goals and tasks</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Connect RemoteStorage in Settings to sync your data across devices</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            <p className="text-sm text-foreground">
              <strong>Remember:</strong> Your data is stored locally and only syncs when you connect a RemoteStorage provider. You&apos;re in full control!
            </p>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(formData);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipAll = () => {
    localStorage.setItem('leptum_onboarding_completed', 'true');
    onSkip();
  };

  const currentStepData = steps[currentStep];

  return (
    <Modal isOpen={isOpen} closeModal={handleSkipAll}>
      <Modal.Title>{currentStepData.title}</Modal.Title>
      <Modal.Body>
        <p className="text-sm text-muted-foreground mb-2">{currentStepData.description}</p>
        {currentStepData.content}

        {/* Progress indicator */}
        <div className="mt-6 mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <div className="flex gap-1">
            {steps.map((_, idx) => (
              <div
                key={idx}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  idx <= currentStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-between">
          <button
            type="button"
            className="min-h-[44px] px-4 py-2 text-muted-foreground hover:text-foreground transition text-sm"
            onClick={handleSkipAll}
          >
            Skip tutorial
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                className="min-h-[44px] px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
                onClick={handleBack}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
            </button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default OnboardingModal;
