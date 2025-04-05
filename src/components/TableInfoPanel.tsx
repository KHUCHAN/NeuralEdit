import { useState, useEffect } from 'react';

interface TableInfo {
  description: string;
  columns: {
    [columnName: string]: string;
  };
}

interface TableInfoPanelProps {
  activeTable: string;
  columns: string[];
  onInfoChange: (info: TableInfo) => void;
  tableInfo?: TableInfo;
}

const TableInfoPanel = ({
  activeTable,
  columns,
  onInfoChange,
  tableInfo: initialTableInfo,
}: TableInfoPanelProps) => {
  const [tableInfo, setTableInfo] = useState<TableInfo>({
    description: '',
    columns: {},
  });
  
  // 테이블이 변경되면 정보 초기화
  useEffect(() => {
    if (initialTableInfo) {
      setTableInfo(initialTableInfo);
    } else {
      // 기본값으로 초기화
      setTableInfo({
        description: '',
        columns: columns.reduce((acc, col) => ({ ...acc, [col]: '' }), {}),
      });
    }
  }, [activeTable, columns, initialTableInfo]);
  
  // 테이블 설명 변경 처리
  const handleTableDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedInfo = {
      ...tableInfo,
      description: e.target.value,
    };
    setTableInfo(updatedInfo);
    onInfoChange(updatedInfo);
  };
  
  // 컬럼 설명 변경 처리
  const handleColumnDescriptionChange = (columnName: string, description: string) => {
    const updatedInfo = {
      ...tableInfo,
      columns: {
        ...tableInfo.columns,
        [columnName]: description,
      },
    };
    setTableInfo(updatedInfo);
    onInfoChange(updatedInfo);
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-4 h-full overflow-auto">
      <h2 className="text-lg font-semibold mb-4">테이블 정보</h2>
      
      {activeTable ? (
        <>
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2 flex items-center">
              <span className="mr-2">📊</span>
              {activeTable} 
            </h3>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                테이블 설명
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={3}
                placeholder="이 테이블에 대한 설명을 입력하세요..."
                value={tableInfo.description}
                onChange={handleTableDescriptionChange}
              />
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2 text-gray-700">칼럼 설명</h4>
            <div className="space-y-3">
              {columns.map(columnName => (
                <div key={columnName} className="border border-gray-200 rounded-md p-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {columnName}
                  </label>
                  <textarea
                    className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    rows={2}
                    placeholder="이 칼럼에 대한 설명을 입력하세요..."
                    value={tableInfo.columns[columnName] || ''}
                    onChange={(e) => handleColumnDescriptionChange(columnName, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center text-gray-500 p-4">
          테이블이 선택되지 않았습니다.
        </div>
      )}
    </div>
  );
};

export default TableInfoPanel; 