import { useState } from 'react';
import * as XLSX from 'xlsx';

interface Props {
  onSheetsLoaded: (sheets: Record<string, any[]>) => void;
}

const ExcelUploader = ({ onSheetsLoaded }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) {
          throw new Error('파일 데이터를 읽을 수 없습니다.');
        }

        // 안전하게 타입 확인
        const arrayBuffer = data instanceof ArrayBuffer 
          ? data 
          : new Uint8Array(String(data).split('').map(c => c.charCodeAt(0))).buffer;
        
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error('엑셀 파일에 시트가 없습니다.');
        }

        const sheets: Record<string, any[]> = {};
        
        // 모든 시트 처리
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          // 빈 데이터 확인
          if (jsonData.length === 0) {
            console.warn(`시트 '${sheetName}'에 데이터가 없습니다.`);
            // 빈 배열로 저장해도 괜찮음
          }
          
          sheets[sheetName] = jsonData;
        });
        
        console.log('Parsed sheets:', Object.keys(sheets));
        onSheetsLoaded(sheets);
      } catch (error) {
        console.error('Excel parsing error:', error);
        setError(error instanceof Error ? error.message : '파일 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('파일 읽기 오류가 발생했습니다.');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-center w-full">
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 border-gray-300 hover:bg-gray-100">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            ) : (
              <>
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-1 text-sm text-gray-500">
                  <span className="font-semibold">클릭하여 업로드</span> 또는 파일을 여기로 끌어오세요
                </p>
                <p className="text-xs text-gray-500">.xlsx, .xls 형식 지원</p>
              </>
            )}
          </div>
          <input 
            id="file-upload" 
            type="file"
            name="file-upload"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileUpload}
            disabled={isLoading}
          />
        </label>
      </div>
      {fileName && (
        <p className="mt-2 text-sm text-gray-600">
          파일: {fileName}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-600">
          오류: {error}
        </p>
      )}
    </div>
  );
};

export default ExcelUploader; 