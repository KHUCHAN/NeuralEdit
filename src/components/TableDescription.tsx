import { useState, useEffect } from 'react';

interface TableDescriptionProps {
  tableName: string;
  columns: string[];
  onDescriptionChange: (tableDesc: string, columnDescs: Record<string, string>) => void;
}

const TableDescription = ({ tableName, columns, onDescriptionChange }: TableDescriptionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [tableDescription, setTableDescription] = useState('');
  const [columnDescriptions, setColumnDescriptions] = useState<Record<string, string>>({});

  // 칼럼 변경시 초기화
  useEffect(() => {
    const initialColumnDescs: Record<string, string> = {};
    columns.forEach(col => {
      initialColumnDescs[col] = columnDescriptions[col] || '';
    });
    setColumnDescriptions(initialColumnDescs);
  }, [columns]);

  // 테이블 설명 변경 핸들러
  const handleTableDescChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTableDescription(e.target.value);
    onDescriptionChange(e.target.value, columnDescriptions);
  };

  // 칼럼 설명 변경 핸들러
  const handleColumnDescChange = (column: string, description: string) => {
    const updatedDescs = { ...columnDescriptions, [column]: description };
    setColumnDescriptions(updatedDescs);
    onDescriptionChange(tableDescription, updatedDescs);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 mb-4">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold">테이블/칼럼 설명</h2>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>
      
      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              테이블 설명 ({tableName})
            </label>
            <textarea
              value={tableDescription}
              onChange={handleTableDescChange}
              placeholder={`${tableName} 테이블에 대한 설명을 입력하세요`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={2}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              칼럼 설명
            </label>
            <div className="space-y-2">
              {columns.map(column => (
                <div key={column} className="flex items-center">
                  <div className="w-1/3 font-medium">{column}</div>
                  <div className="w-2/3">
                    <input
                      type="text"
                      value={columnDescriptions[column] || ''}
                      onChange={(e) => handleColumnDescChange(column, e.target.value)}
                      placeholder={`${column}에 대한 설명`}
                      className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TableDescription; 