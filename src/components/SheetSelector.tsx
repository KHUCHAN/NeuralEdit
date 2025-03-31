interface Props {
  sheets: string[];
  activeSheet: string;
  onSelectSheet: (sheetName: string) => void;
}

const SheetSelector = ({ sheets, activeSheet, onSelectSheet }: Props) => {
  if (sheets.length === 0) {
    return null;
  }

  return (
    <div className="flex overflow-x-auto pb-2 mb-4">
      <div className="inline-flex rounded-md shadow-sm">
        {sheets.map(sheet => (
          <button
            key={sheet}
            type="button"
            className={`px-3 py-1 border text-sm rounded-md ${
              sheet === activeSheet
                ? 'bg-primary-600 text-black border-primary-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            } ${
              sheets.indexOf(sheet) === 0
                ? 'rounded-l-lg'
                : sheets.indexOf(sheet) === sheets.length - 1
                ? 'rounded-r-lg'
                : ''
            }`}
            onClick={() => onSelectSheet(sheet)}
          >
            {sheet}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SheetSelector; 