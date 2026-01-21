import { useState } from "react";

export type Emotion = 
  | 'happy' 
  | 'sad' 
  | 'neutral' 
  | 'excited' 
  | 'anxious' 
  | 'calm' 
  | 'frustrated' 
  | 'proud' 
  | 'tired' 
  | 'energized';

interface EmotionOption {
  id: Emotion;
  label: string;
  emoji: string;
  color: string;
}

const EMOTIONS: EmotionOption[] = [
  { id: 'happy', label: 'Happy', emoji: '😊', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { id: 'excited', label: 'Excited', emoji: '🎉', color: 'bg-orange-500 hover:bg-orange-600' },
  { id: 'proud', label: 'Proud', emoji: '✨', color: 'bg-purple-500 hover:bg-purple-600' },
  { id: 'energized', label: 'Energized', emoji: '⚡', color: 'bg-blue-500 hover:bg-blue-600' },
  { id: 'calm', label: 'Calm', emoji: '😌', color: 'bg-green-500 hover:bg-green-600' },
  { id: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-gray-500 hover:bg-gray-600' },
  { id: 'tired', label: 'Tired', emoji: '😴', color: 'bg-slate-500 hover:bg-slate-600' },
  { id: 'anxious', label: 'Anxious', emoji: '😰', color: 'bg-amber-600 hover:bg-amber-700' },
  { id: 'frustrated', label: 'Frustrated', emoji: '😤', color: 'bg-red-500 hover:bg-red-600' },
  { id: 'sad', label: 'Sad', emoji: '😢', color: 'bg-indigo-500 hover:bg-indigo-600' },
];

interface EmotionSelectorProps {
  selectedEmotions?: Emotion[];
  onChange: (emotions: Emotion[]) => void;
  maxSelections?: number;
  className?: string;
}

export default function EmotionSelector({
  selectedEmotions = [],
  onChange,
  maxSelections,
  className = "",
}: EmotionSelectorProps) {
  const handleToggle = (emotion: Emotion) => {
    if (selectedEmotions.includes(emotion)) {
      // Remove emotion
      onChange(selectedEmotions.filter(e => e !== emotion));
    } else {
      // Add emotion (respect max selections)
      if (maxSelections && selectedEmotions.length >= maxSelections) {
        return;
      }
      onChange([...selectedEmotions, emotion]);
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-foreground">
        How did this make you feel?
      </label>
      <div className="flex flex-wrap gap-2">
        {EMOTIONS.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion.id);
          return (
            <button
              key={emotion.id}
              type="button"
              onClick={() => handleToggle(emotion.id)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                flex items-center gap-2
                ${isSelected 
                  ? `${emotion.color} text-white shadow-md scale-105` 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }
              `}
            >
              <span className="text-lg">{emotion.emoji}</span>
              <span>{emotion.label}</span>
            </button>
          );
        })}
      </div>
      {selectedEmotions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Selected: {selectedEmotions.map(e => EMOTIONS.find(opt => opt.id === e)?.label).join(', ')}
        </p>
      )}
    </div>
  );
}

export { EMOTIONS };
