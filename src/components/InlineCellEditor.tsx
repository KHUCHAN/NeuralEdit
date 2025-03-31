import { useState, useRef, useEffect } from 'react';

interface Props {
  value: any;
  row: number;
  column: string;
  table: string;
  onSave: (value: any, row: number, column: string, table: string) => void;
}

const InlineCellEditor = ({ value, row, column, table, onSave }: Props) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value !== null ? value : '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = () => {
    onSave(editValue, row, column, table);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full p-1 border border-primary-500"
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="cursor-pointer hover:bg-gray-100 p-1 rounded min-h-[24px]"
    >
      {value !== null && value !== undefined ? value : <span className="text-gray-400 italic">NULL</span>}
    </div>
  );
};

export default InlineCellEditor; 