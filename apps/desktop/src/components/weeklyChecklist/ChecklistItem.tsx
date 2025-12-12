/**
 * Checklist Item Component
 * Problem 10: Weekly Checklists
 */

import { Check, X, Edit2 } from "lucide-react";
import { useState } from "react";
import type { ChecklistItem as ChecklistItemType } from "../../types/weeklyChecklist";

interface ChecklistItemProps {
  item: ChecklistItemType;
  onToggle: () => void;
  onUpdate: (text: string) => void;
  onDelete: () => void;
  isReadonly?: boolean;
}

export default function ChecklistItem({
  item,
  onToggle,
  onUpdate,
  onDelete,
  isReadonly = false,
}: ChecklistItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(editText.trim());
      setIsEditing(false);
    } else {
      // If empty, delete instead
      onDelete();
    }
  };

  const handleCancel = () => {
    setEditText(item.text);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <input
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          autoFocus
          className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSave}
          className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
        >
          <Check size={18} />
        </button>
        <button
          onClick={handleCancel}
          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        item.completed
          ? "bg-gray-50 dark:bg-gray-800/50"
          : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
    >
      <button
        onClick={onToggle}
        disabled={isReadonly}
        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          item.completed
            ? "bg-blue-600 border-blue-600 text-white"
            : "border-gray-300 dark:border-gray-600 hover:border-blue-500"
        } ${isReadonly ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        {item.completed && <Check size={12} />}
      </button>

      <span
        className={`flex-1 ${
          item.completed
            ? "line-through text-gray-500 dark:text-gray-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {item.text}
      </span>

      {!isReadonly && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
            title="Edit item"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
            title="Delete item"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

