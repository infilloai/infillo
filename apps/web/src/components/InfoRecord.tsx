import { Edit, Trash2 } from "lucide-react";

interface InfoRecordProps {
  label: string;
  value: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function InfoRecord({ label, value, onEdit, onDelete }: InfoRecordProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-text-sm-normal text-[var(--text-secondary)] text-[length:var(--text-sm-normal-font-size)] tracking-[var(--text-sm-normal-letter-spacing)] leading-[var(--text-sm-normal-line-height)] [font-style:var(--text-sm-normal-font-style)] mb-1">
          {label}
        </p>
        <p className="font-text-sm-medium text-black text-[length:var(--text-sm-medium-font-size)] tracking-[var(--text-sm-medium-letter-spacing)] leading-[var(--text-sm-medium-line-height)] [font-style:var(--text-sm-medium-font-style)]">
          {value}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onEdit}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Edit ${label}`}
        >
          <Edit className="w-4 h-4 text-[var(--text-secondary)]" />
        </button>
        <button 
          onClick={onDelete}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          aria-label={`Delete ${label}`}
        >
          <Trash2 className="w-4 h-4 text-[var(--color-destructive)]" />
        </button>
      </div>
    </div>
  );
} 