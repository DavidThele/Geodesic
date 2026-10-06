import React from 'react';
import { Check } from 'lucide-react';

interface TaskBubbleProps {
  completed: boolean;
  totalSubtasks?: number;
  completedSubtasks?: number;
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
}

export const TaskBubble: React.FC<TaskBubbleProps> = ({
  completed,
  totalSubtasks = 0,
  completedSubtasks = 0,
  onClick,
  size = 'md',
}) => {
  const hasSubtasks = totalSubtasks > 0;
  const percentage = hasSubtasks ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  // If completed directly
  if (completed) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${sizeClasses[size]} rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center shrink-0 transition-transform active:scale-90 animate-completion-bounce shadow-xs`}
        title="Mark uncompleted"
      >
        <Check className={`${iconSizes[size]} stroke-[3]`} />
      </button>
    );
  }

  // If has subtasks, render liquid fill from bottom
  if (hasSubtasks) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative ${sizeClasses[size]} rounded-full border-2 border-neutral-400 dark:border-neutral-500 overflow-hidden shrink-0 transition-transform active:scale-90 group hover:border-neutral-700 dark:hover:border-neutral-300`}
        title={`${completedSubtasks}/${totalSubtasks} subtasks complete (${percentage}%) - Click to complete all`}
      >
        {/* Background Fill from bottom */}
        <div
          className="absolute inset-x-0 bottom-0 bg-blue-500 dark:bg-blue-400 transition-all duration-300 ease-out"
          style={{ height: `${percentage}%` }}
        />
        {/* Subtle hover icon if 100% */}
        {percentage === 100 && (
          <Check className={`relative z-10 ${iconSizes[size]} stroke-[3] text-white m-auto`} />
        )}
      </button>
    );
  }

  // Simple task circle
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-full border-2 border-neutral-300 dark:border-neutral-600 hover:border-neutral-600 dark:hover:border-neutral-300 shrink-0 transition-all active:scale-90 flex items-center justify-center`}
      title="Mark as completed"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-transparent group-hover:bg-neutral-400 transition-colors" />
    </button>
  );
};
