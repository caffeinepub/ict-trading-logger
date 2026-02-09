import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface EmojiMultiSelectProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

const MOOD_EMOJIS = [
  { emoji: '😊', label: 'Happy' },
  { emoji: '😰', label: 'Anxious' },
  { emoji: '😤', label: 'Frustrated' },
  { emoji: '😌', label: 'Calm' },
  { emoji: '🤔', label: 'Thoughtful' },
  { emoji: '😎', label: 'Confident' },
  { emoji: '😟', label: 'Worried' },
  { emoji: '🥳', label: 'Excited' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🤯', label: 'Overwhelmed' },
];

export default function EmojiMultiSelect({ selected, onChange }: EmojiMultiSelectProps) {
  const handleToggle = (emoji: string) => {
    // For now, only allow single selection (can be changed to multi-select if needed)
    if (selected.includes(emoji)) {
      onChange([]);
    } else {
      onChange([emoji]);
    }
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {MOOD_EMOJIS.map(({ emoji, label }) => (
        <Button
          key={emoji}
          variant={selected.includes(emoji) ? 'default' : 'outline'}
          size="lg"
          onClick={() => handleToggle(emoji)}
          className="text-2xl h-16 flex flex-col items-center justify-center gap-1"
          title={label}
        >
          <span>{emoji}</span>
          <span className="text-xs">{label}</span>
        </Button>
      ))}
    </div>
  );
}
