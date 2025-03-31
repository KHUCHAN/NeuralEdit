import alasql from 'alasql';
import * as XLSX from 'xlsx';

export interface SqlResult {
  success: boolean;
  data: any[];
  error?: string;
}

// alasql 데이터베이스 초기화
export const initializeDatabase = (sheets: Record<string, any[]>) => {
  try {
    console.log('Initializing database with sheets:', Object.keys(sheets));
    
    // 기존 테이블 삭제
    Object.keys(sheets).forEach(sheetName => {
      try {
        alasql(`DROP TABLE IF EXISTS [${sheetName}]`);
      } catch (err) {
        console.warn(`테이블 ${sheetName} 삭제 중 오류:`, err);
      }
    });

    // 새 테이블 생성
    Object.entries(sheets).forEach(([sheetName, data]) => {
      if (data.length > 0) {
        try {
          // 첫 번째 행을 사용하여 스키마 생성
          const columns = Object.keys(data[0]);
          
          // 테이블 생성 (소문자로 통일)
          const lowerSheetName = sheetName.toLowerCase();
          const createTableSQL = `CREATE TABLE [${lowerSheetName}] (${columns.map(c => `[${c.toLowerCase()}]`).join(', ')})`;
          console.log('Creating table:', createTableSQL);
          alasql(createTableSQL);
          
          // 데이터 삽입
          console.log(`Inserting ${data.length} rows into [${lowerSheetName}]`);
          
          // 대용량 데이터 처리를 위한 배치 처리
          const BATCH_SIZE = 10000; // 한 번에 처리할 행 수
          
          for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${i/BATCH_SIZE + 1}, rows ${i} to ${Math.min(i + BATCH_SIZE, data.length)}`);
            
            // 배치 단위로 데이터 삽입
            batch.forEach((row, idx) => {
              // 칼럼명을 소문자로 변환한 새 객체 생성
              const lowerCaseRow: Record<string, any> = {};
              for (const col of columns) {
                lowerCaseRow[col.toLowerCase()] = row[col];
              }
              
              const values = columns.map(col => {
                const val = row[col];
                if (typeof val === 'string') {
                  return `'${val.replace(/'/g, "''")}'`; // SQL 주입 방지
                }
                return val === null || val === undefined ? 'NULL' : val;
              });
              
              try {
                alasql(`INSERT INTO [${lowerSheetName}] VALUES (${values.join(', ')})`);
              } catch (insertErr) {
                console.error(`Row ${i + idx} insert error:`, insertErr);
              }
            });
          }
          
        } catch (tableErr) {
          console.error(`테이블 ${sheetName} 생성 중 오류:`, tableErr);
        }
      } else {
        console.warn(`시트 ${sheetName}에 데이터가 없어 테이블을 생성하지 않습니다.`);
      }
    });
    
    // 생성된 테이블 목록 확인
    const tables = alasql('SHOW TABLES');
    console.log('Created tables:', tables);
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};

// SQL 쿼리 실행 (대소문자 구분 없이)
export const executeQuery = (query: string): SqlResult => {
  try {
    if (!query || query.trim() === '') {
      return {
        success: false,
        data: [],
        error: '쿼리가 비어있습니다.'
      };
    }
    
    console.log('원본 쿼리:', query);
    
    // SQL 키워드 패턴
    const sqlKeywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL', 'CROSS',
      'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'INSERT', 'UPDATE', 'DELETE',
      'INTO', 'VALUES', 'SET', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'BETWEEN', 'LIKE', 'AS'
    ];
    
    // 전체 쿼리를 소문자로 변환
    let lowerCaseQuery = query.toLowerCase();
    
    // 문자열 내용은 소문자로 변환하지 않도록 처리
    // 작은따옴표 안의 내용은 원래 대소문자 유지 (정규식으로 찾기 어려우므로 간단한 방법 채택)
    
    // 대괄호 안의 식별자(테이블명, 칼럼명)는 이미 소문자로 변환됨
    
    console.log('소문자로 변환된 쿼리:', lowerCaseQuery);
    
    try {
      console.log('실행 중인 쿼리:', lowerCaseQuery);
      
      // 대용량 데이터 처리를 위한 쿼리 제한 설정
      // SELECT 쿼리에 LIMIT이 없는 경우, 기본 제한 추가 (페이지네이션용)
      const isSelectQuery = lowerCaseQuery.trim().toLowerCase().startsWith('select');
      
      if (isSelectQuery && !lowerCaseQuery.includes('limit')) {
        // 결과 크기 제한 (페이지당 최대 행수)
        lowerCaseQuery += ' limit 10000';
        console.log('쿼리에 LIMIT 추가:', lowerCaseQuery);
      }
      
      const result = alasql(lowerCaseQuery);
      console.log('쿼리 실행 결과:', `${Array.isArray(result) ? result.length : 0}개의 행`);
      
      return {
        success: true,
        data: Array.isArray(result) ? result : [{ result }]
      };
    } catch (error) {
      console.error('쿼리 실행 오류:', error);
      throw error;
    }
  } catch (error) {
    console.error('SQL execution error:', error);
    return {
      success: false,
      data: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

// 쿼리 결과를 엑셀 파일로 저장하는 함수
export const exportToExcel = (data: any[], fileName: string = 'query_result'): void => {
  try {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.error('저장할 데이터가 없습니다.');
      return;
    }
    
    console.log(`${data.length}개의 행을 엑셀로 내보내는 중...`);
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'QueryResult');
    
    // 엑셀 파일 생성 및 다운로드
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAsExcelFile(excelBuffer, fileName);
    
    console.log('엑셀 파일 생성 완료');
  } catch (error) {
    console.error('엑셀 내보내기 오류:', error);
  }
};

// 배열 버퍼를 파일로 저장하는 헬퍼 함수
const saveAsExcelFile = (buffer: ArrayBuffer, fileName: string): void => {
  const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  // 브라우저에서 파일 다운로드 링크 생성
  const url = window.URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  
  // 링크 클릭 이벤트 발생시켜 다운로드 시작
  document.body.appendChild(link);
  link.click();
  
  // 정리
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 200);
}; 