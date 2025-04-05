import { useState, useEffect } from 'react';
import ExcelUploader from './components/ExcelUploader';
import SqlEditor from './components/SqlEditor';
import DataGrid from './components/DataGrid';
import SheetSelector from './components/SheetSelector';
import PromptInput from './components/PromptInput';
import TableDescription from './components/TableDescription';
import { initializeDatabase, executeQuery, SqlResult, exportToExcel } from './utils/sqlParser';
import { generateQueryFromPrompt, saveQueryHistory } from './services/api';

function App() {
  const [sheets, setSheets] = useState<Record<string, any[]>>({});
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sqlResult, setSqlResult] = useState<SqlResult | null>(null);
  const [sqlError, setSqlError] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'sheet' | 'query'>('sheet');
  const [dbInitialized, setDbInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingQuery, setIsGeneratingQuery] = useState(false);
  const [tableDescription, setTableDescription] = useState('');
  const [columnDescriptions, setColumnDescriptions] = useState<Record<string, string>>({});
  const [generatedQuery, setGeneratedQuery] = useState('');

  // 데이터베이스 초기화
  useEffect(() => {
    if (Object.keys(sheets).length > 0) {
      console.log('Initializing database with sheets:', Object.keys(sheets));
      setInitError(null);
      
      try {
        const success = initializeDatabase(sheets);
        setDbInitialized(success);
        
        if (success) {
          console.log('Database initialized successfully');
          // 첫 번째 시트를 활성 시트로 설정
          const firstSheet = Object.keys(sheets)[0];
          setActiveSheet(firstSheet);
        } else {
          setInitError('데이터베이스 초기화에 실패했습니다.');
        }
      } catch (error) {
        console.error('Error initializing database:', error);
        setInitError('데이터베이스 초기화 중 오류가 발생했습니다.');
        setDbInitialized(false);
      }
    }
  }, [sheets]);

  // 엑셀 시트 로드 처리
  const handleSheetsLoaded = (loadedSheets: Record<string, any[]>) => {
    console.log('Sheets loaded:', Object.keys(loadedSheets));
    
    // 엑셀 파일 데이터가 비어있는지 확인
    if (Object.keys(loadedSheets).length === 0) {
      setSqlError('엑셀 파일에 시트가 없습니다.');
      return;
    }
    
    // 모든 시트가 빈 데이터인지 확인
    const allEmpty = Object.values(loadedSheets).every(data => !data || data.length === 0);
    if (allEmpty) {
      setSqlError('엑셀 파일에 데이터가 없습니다.');
      return;
    }
    
    setSheets(loadedSheets);
    setSqlResult(null);
    setViewMode('sheet');
    setSqlError(undefined);
  };

  // SQL 쿼리 실행
  const handleExecuteQuery = (query: string) => {
    if (!dbInitialized) {
      setSqlError('데이터베이스가 초기화되지 않았습니다. 엑셀 파일을 다시 업로드해 주세요.');
      return;
    }
    
    setIsProcessing(true);
    setSqlError(undefined);

    setTimeout(() => {
      try {
        const result = executeQuery(query);
        setSqlResult(result);
        
        if (!result.success) {
          setSqlError(result.error);
        } else {
          if (result.data.length === 0) {
            setSqlError('쿼리 결과가 없습니다.');
          }
          setViewMode('query');
        }
      } catch (error) {
        console.error('Query execution error:', error);
        setSqlError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다');
      } finally {
        setIsProcessing(false);
      }
    }, 100); // 약간의 지연 추가 (UI 반응성 향상)
  };

  // 셀 편집 처리
  const handleCellEdit = (value: any, rowIndex: number, column: string, tableName: string) => {
    if (!dbInitialized) {
      console.error('Database not initialized');
      return;
    }
    
    try {
      // 테이블명과 칼럼명을 소문자로 변환
      const lowerTableName = tableName.toLowerCase();
      const lowerColumn = column.toLowerCase();
      
      // alasql을 통한 데이터 업데이트
      const updateQuery = `UPDATE [${lowerTableName}] SET [${lowerColumn}] = ${
        typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value
      } WHERE __rowindex__ = ${rowIndex}`;
      
      const result = executeQuery(updateQuery);
      if (!result.success) {
        console.error('Cell update failed:', result.error);
        return;
      }
      
      // 로컬 데이터 상태 업데이트
      const updatedSheets = { ...sheets };
      if (updatedSheets[tableName] && updatedSheets[tableName][rowIndex]) {
        updatedSheets[tableName][rowIndex][column] = value;
        setSheets(updatedSheets);
      }
    } catch (error) {
      console.error('Cell update error:', error);
    }
  };

  // 결과를 엑셀 파일로 내보내기
  const handleExportToExcel = () => {
    try {
      setIsExporting(true);
      
      if (viewMode === 'query' && sqlResult && sqlResult.success && sqlResult.data.length > 0) {
        // 쿼리 결과 내보내기
        exportToExcel(sqlResult.data, 'query_result');
      } else if (viewMode === 'sheet' && activeSheet && sheets[activeSheet] && sheets[activeSheet].length > 0) {
        // 현재 시트 내보내기
        exportToExcel(sheets[activeSheet], activeSheet);
      } else {
        console.error('내보낼 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // 테이블/칼럼 설명 변경 처리
  const handleDescriptionChange = (tableDesc: string, columnDescs: Record<string, string>) => {
    setTableDescription(tableDesc);
    setColumnDescriptions(columnDescs);
  };

  // AI를 통한 쿼리 생성 처리
  const handlePromptSubmit = async (prompt: string) => {
    if (!dbInitialized || !activeSheet) {
      setSqlError('데이터베이스가 초기화되지 않았거나 활성 시트가 없습니다.');
      return;
    }

    setIsGeneratingQuery(true);
    setSqlError(undefined);

    try {
      // 현재 테이블의 샘플 데이터 준비 (최대 10행)
      const sampleData = sheets[activeSheet].slice(0, 10);
      
      // 칼럼 이름 목록
      const columns = sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
      
      // API 요청 데이터 준비
      const requestData = {
        prompt,
        tableName: activeSheet,
        columns,
        tableDescription,
        columnDescriptions,
        sampleData
      };
      
      // Flask 서버에 쿼리 생성 요청
      const response = await generateQueryFromPrompt(requestData);
      
      if (response.error) {
        setSqlError(`쿼리 생성 오류: ${response.error}`);
        return;
      }
      
      if (!response.query) {
        setSqlError('생성된 쿼리가 없습니다.');
        return;
      }
      
      // 생성된 쿼리 표시
      setGeneratedQuery(response.query);
      
      // 생성된 쿼리 실행
      handleExecuteQuery(response.query);
      
      // 쿼리 이력 저장 (선택적)
      if (sqlResult && sqlResult.success) {
        saveQueryHistory(prompt, response.query, sqlResult.data);
      }
      
    } catch (error) {
      console.error('Query generation error:', error);
      setSqlError(error instanceof Error ? error.message : '쿼리 생성 중 오류가 발생했습니다');
    } finally {
      setIsGeneratingQuery(false);
    }
  };

  // 활성 시트의 칼럼 목록 가져오기 
  const getActiveSheetColumns = (): string[] => {
    if (!activeSheet || !sheets[activeSheet] || sheets[activeSheet].length === 0) {
      return [];
    }
    return Object.keys(sheets[activeSheet][0]);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Excel SQL Viewer</h1>
          <p className="mt-2 text-gray-600">
            엑셀 파일을 업로드하고 SQL로 데이터를 조회 및 편집하세요
          </p>
        </header>

        {initError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <strong>오류:</strong> {initError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold mb-4">파일 업로드</h2>
              <ExcelUploader onSheetsLoaded={handleSheetsLoaded} />
            </div>

            {Object.keys(sheets).length > 0 && (
              <>
                <div>
                  <h2 className="text-xl font-semibold mb-4">SQL 쿼리</h2>
                  <SqlEditor 
                    onExecuteQuery={handleExecuteQuery}
                    isProcessing={isProcessing}
                    error={sqlError}
                    availableTables={Object.keys(sheets)}
                    initialQuery={generatedQuery}
                  />
                </div>

                <div>
                  <PromptInput 
                    onPromptSubmit={handlePromptSubmit}
                    isLoading={isGeneratingQuery}
                  />
                </div>
              </>
            )}
          </div>

          <div className="lg:col-span-2">
            {Object.keys(sheets).length > 0 && (
              <div>
                {activeSheet && (
                  <TableDescription 
                    tableName={activeSheet}
                    columns={getActiveSheetColumns()}
                    onDescriptionChange={handleDescriptionChange}
                  />
                )}
                
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">데이터</h2>
                  <div className="flex space-x-2">
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        viewMode === 'sheet'
                          ? 'bg-primary-600 text-black'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => setViewMode('sheet')}
                    >
                      시트 보기
                    </button>
                    <button
                      className={`px-3 py-1 rounded-md text-sm ${
                        viewMode === 'query'
                          ? 'bg-primary-600 text-black'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      onClick={() => setViewMode('query')}
                      disabled={!sqlResult || !sqlResult.success}
                    >
                      쿼리 결과
                    </button>
                    <button
                      className="px-3 py-1 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      onClick={handleExportToExcel}
                      disabled={isExporting || 
                        (viewMode === 'query' && (!sqlResult || !sqlResult.success || sqlResult.data.length === 0)) ||
                        (viewMode === 'sheet' && (!activeSheet || !sheets[activeSheet] || sheets[activeSheet].length === 0))
                      }
                    >
                      {isExporting ? (
                        <span className="flex items-center">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          내보내는 중...
                        </span>
                      ) : (
                        '엑셀로 내보내기'
                      )}
                    </button>
                  </div>
                </div>

                {viewMode === 'sheet' && activeSheet && (
                  <>
                    <SheetSelector
                      sheets={Object.keys(sheets)}
                      activeSheet={activeSheet}
                      onSelectSheet={setActiveSheet}
                    />
                    {sheets[activeSheet] && sheets[activeSheet].length > 0 ? (
                      <DataGrid 
                        data={sheets[activeSheet]} 
                        title={activeSheet}
                      />
                    ) : (
                      <div className="bg-white rounded-lg shadow p-4">
                        <div className="text-center py-8 text-gray-500">
                          시트 '{activeSheet}'에 데이터가 없습니다.
                        </div>
                      </div>
                    )}
                  </>
                )}

                {viewMode === 'query' && (
                  <>
                    {sqlResult && sqlResult.success && sqlResult.data.length > 0 ? (
                      <DataGrid 
                        data={sqlResult.data} 
                        title="쿼리 결과"
                      />
                    ) : (
                      <>
                        {activeSheet && sheets[activeSheet] && sheets[activeSheet].length > 0 && (
                          <DataGrid 
                            data={sheets[activeSheet]} 
                            title={activeSheet}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {Object.keys(sheets).length === 0 && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">데이터 없음</h3>
                <p className="mt-1 text-sm text-gray-500">
                  엑셀 파일을 업로드하면 여기에 데이터가 표시됩니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
