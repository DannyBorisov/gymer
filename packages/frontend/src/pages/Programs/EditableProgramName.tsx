import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import editStyles from "./EditableProgramName.module.css";

export interface EditableProgramNameProps {
  name: string;
  className: string;
  onRename: (name: string) => void;
  isSaving?: boolean;
}

/**
 * Click the name to edit it in place. Enter/blur saves, Escape cancels.
 */
export const EditableProgramName = ({
  name,
  className,
  onRename,
  isSaving,
}: EditableProgramNameProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = (e: React.MouseEvent) => {
    if (isSaving) return;
    e.stopPropagation();
    setValue(name);
    setIsEditing(true);
    // Focus after the input mounts.
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const commit = () => {
    setIsEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onRename(trimmed);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className={`${className} ${editStyles.input}`}
        value={value}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            inputRef.current?.blur();
          } else if (e.key === "Escape") {
            setValue(name);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span className={editStyles.wrapper}>
      <span
        className={`${className} ${editStyles.text}`}
        onClick={startEditing}
      >
        {name}
      </span>
      {isSaving && <Loader2 size={14} className={editStyles.spinner} />}
    </span>
  );
};
