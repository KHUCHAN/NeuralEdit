import { useState } from 'react';
import * as XLSX from 'xlsx';

interface Props {
  onSheetsLoaded: (sheets: Record<string, any[]>) => void;
}

const FileUploader = ({ onSheetsLoaded }: Props) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);
    setError(null);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    console.log('File extension:', fileExtension);

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
        
        let sheets: Record<string, any[]> = {};
        
        // 파일 확장자에 따라 다르게 처리
        if (fileExtension === 'csv') {
          // CSV 파일 처리
          const options = { type: 'binary', FS: ',', raw: true };
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          // CSV는 시트가 하나만 있음
          if (workbook.SheetNames.length > 0) {
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            // 헤더 행을 기반으로 JSON 배열로 변환
            if (jsonData.length > 1) {
              const headers = jsonData[0] as string[];
              const rows = jsonData.slice(1);
              const formattedData = rows.map(row => {
                const obj: Record<string, any> = {};
                headers.forEach((header, i) => {
                  obj[header] = (row as any[])[i];
                });
                return obj;
              });
              
              sheets['CSV_Data'] = formattedData;
            } else {
              sheets['CSV_Data'] = jsonData as any[];
            }
          }
        } else if (fileExtension === 'dat') {
          // DAT 파일 처리 - 일반적으로 탭이나 공백으로 구분된 텍스트 파일
          // 텍스트로 읽고 파싱
          const text = new TextDecoder().decode(arrayBuffer instanceof ArrayBuffer ? arrayBuffer : new Uint8Array(arrayBuffer));
          const lines = text.split('\n').filter(line => line.trim().length > 0);
          
          if (lines.length > 0) {
            // 구분자 자동 감지 (탭, 콤마, 파이프, 세미콜론 중 가장 많이 사용된 것)
            const firstLine = lines[0];
            const delimiters = ['\t', ',', '|', ';'];
            let bestDelimiter = '\t'; // 기본 구분자는 탭
            let maxCount = 0;
            
            for (const delimiter of delimiters) {
              const count = (firstLine.match(new RegExp(delimiter, 'g')) || []).length;
              if (count > maxCount) {
                maxCount = count;
                bestDelimiter = delimiter;
              }
            }
            
            // 헤더를 첫 번째 줄로 가정
            const headers = lines[0].split(bestDelimiter).map(h => h.trim());
            const rows = lines.slice(1).map(line => {
              const values = line.split(bestDelimiter).map(v => v.trim());
              const obj: Record<string, any> = {};
              headers.forEach((header, i) => {
                // 숫자로 변환 가능한 경우 숫자로 변환
                const value = values[i];
                obj[header] = !isNaN(Number(value)) ? Number(value) : value;
              });
              return obj;
            });
            
            sheets['DAT_Data'] = rows;
          }
        } else {
          // 엑셀 파일 처리 (기존 코드)
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('파일에 시트가 없습니다.');
          }
          
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
        }
        
        console.log('Parsed data:', Object.keys(sheets));
        onSheetsLoaded(sheets);
      } catch (error) {
        console.error('File parsing error:', error);
        setError(error instanceof Error ? error.message : '파일 파싱 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('파일 읽기 오류가 발생했습니다.');
      setIsLoading(false);
    };
    
    // 파일 형식에 따라 읽는 방식 선택
    if (fileExtension === 'csv' || fileExtension === 'dat') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
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
                <p className="text-xs text-gray-500">.xlsx, .xls, .csv, .dat 형식 지원</p>
              </>
            )}
          </div>
          <input 
            id="file-upload" 
            type="file"
            name="file-upload"
            accept=".xlsx,.xls,.csv,.dat"
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

export default FileUploader; 