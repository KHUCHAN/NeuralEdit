import { useState, useEffect, useRef } from 'react';

interface Props {
  onExecuteQuery: (query: string) => void;
  isProcessing: boolean;
  error?: string;
  availableTables: string[];
}

// SQL 키워드 목록 (하이라이팅용)
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT', 'UPDATE', 'DELETE',
  'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'OUTER JOIN',
  'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET',
  'AS', 'ON', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'NOT',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT'
];

const SqlEditor = ({ onExecuteQuery, isProcessing, error, availableTables }: Props) => {
  const [query, setQuery] = useState('');
  const [highlightedQuery, setHighlightedQuery] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  
  // SQL 구문 하이라이팅
  useEffect(() => {
    if (!query) {
      setHighlightedQuery('');
      return;
    }
    
    // HTML 특수문자만 이스케이프 처리
    function escapeHtml(text: string) {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }
    
    // 이스케이프 처리
    let highlighted = escapeHtml(query);
    
    // SQL 키워드 하이라이팅
    SQL_KEYWORDS.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlighted = highlighted.replace(regex, match => 
        `<span class="sql-keyword">${match}</span>`
      );
    });
    
    // 문자열(작은따옴표) 하이라이팅 - 간단한 정규식 사용
    highlighted = highlighted.replace(/'([^']*)'/g, 
      `<span class="sql-string">'$1'</span>`
    );
    
    // 숫자 하이라이팅
    highlighted = highlighted.replace(/\b(\d+)\b/g, 
      `<span class="sql-number">$1</span>`
    );
    
    // 대괄호 내용 하이라이팅 (테이블명, 컬럼명)
    highlighted = highlighted.replace(/\[([^\]]*)\]/g, 
      `[<span class="sql-identifier">$1</span>]`
    );
    
    setHighlightedQuery(highlighted);
  }, [query]);

  // 커서 위치 동기화
  useEffect(() => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, [query]);

  // 스크롤 동기화를 위한 이벤트 리스너
  useEffect(() => {
    const handleScroll = () => {
      if (textareaRef.current && preRef.current) {
        preRef.current.scrollTop = textareaRef.current.scrollTop;
        preRef.current.scrollLeft = textareaRef.current.scrollLeft;
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onExecuteQuery(query);
    }
  };

  // 드롭 영역 처리
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.classList.add('border-primary-500', 'bg-primary-50');
      }
    };

    const handleDragLeave = () => {
      if (textareaRef.current) {
        textareaRef.current.classList.remove('border-primary-500', 'bg-primary-50');
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.classList.remove('border-primary-500', 'bg-primary-50');
        
        const columnText = e.dataTransfer?.getData('text');
        if (columnText) {
          // 대괄호만 제거하고 원본 대소문자 그대로 유지
          const cleanText = columnText.replace(/^\[(.*)\]$/, '$1');
          
          // 현재 커서 위치에 텍스트 삽입
          const textarea = textareaRef.current;
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const text = textarea.value;
          
          const newText = text.substring(0, start) + cleanText + text.substring(end);
          setQuery(newText);
          
          // 삽입 후 커서 위치 조정
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + cleanText.length, start + cleanText.length);
          }, 0);
        }
      }
    };

    // Ctrl+Enter 키 이벤트 처리
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const currentQuery = textareaRef.current?.value.trim();
        if (currentQuery) {
          onExecuteQuery(currentQuery);
        }
      }
    };

    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('dragover', handleDragOver);
      textarea.addEventListener('dragleave', handleDragLeave);
      textarea.addEventListener('drop', handleDrop);
      textarea.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener('dragover', handleDragOver);
        textarea.removeEventListener('dragleave', handleDragLeave);
        textarea.removeEventListener('drop', handleDrop);
        textarea.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, [onExecuteQuery]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-4">
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
            SQL 쿼리 <span className="text-xs text-gray-500">(Ctrl+Enter로 실행)</span>
          </label>
          <div className="mb-2">
            <p className="text-xs text-gray-500 mb-1">사용 가능한 테이블:</p>
            <div className="flex flex-wrap gap-1">
              {availableTables.length > 0 ? (
                availableTables.map(table => (
                  <span 
                    key={table} 
                    className="px-2 py-1 text-xs bg-gray-100 rounded-md cursor-pointer hover:bg-gray-200"
                    onClick={() => {
                      // 테이블 이름 클릭 시 쿼리에 추가 (대괄호 없이)
                      setQuery(prev => prev + (prev ? ' ' : '') + table);
                      textareaRef.current?.focus();
                    }}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text', table);
                    }}
                  >
                    {table}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">
                  엑셀 파일을 업로드하면 각 시트가 테이블로 표시됩니다
                </span>
              )}
            </div>
          </div>
          <div className="relative border rounded-lg overflow-hidden">
            <pre 
              ref={preRef}
              className="block w-full p-2.5 text-gray-900 font-mono whitespace-pre-wrap break-words resize-none overflow-auto pointer-events-none absolute top-0 left-0 right-0 bottom-0 bg-white"
              style={{ minHeight: '5rem' }}
              dangerouslySetInnerHTML={{ __html: highlightedQuery || `<span class="sql-placeholder">SELECT * FROM Sheet1 WHERE column1 = '<span class="sql-string">value</span>'</span>` }}
            ></pre>
            <textarea
              id="query"
              ref={textareaRef}
              rows={5}
              className="block w-full p-2.5 font-mono resize-none border-0 focus:ring-0 z-10"
              placeholder="SELECT * FROM Sheet1 WHERE column1 = 'value'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ position: 'relative', background: 'transparent', color: 'transparent', caretColor: 'black' }}
            ></textarea>
            <style>
              {`
              .sql-keyword {
                color: #2563eb;
              }
              .sql-string {
                color: #059669;
              }
              .sql-number {
                color: #7c3aed;
              }
              .sql-identifier {
                color: #d97706;
              }
              .sql-placeholder {
                color: #9ca3af;
              }
              `}
            </style>
          </div>
          <p className="mt-1 text-xs text-gray-500">칼럼 이름을 여기로 드래그하여 쿼리에 추가할 수 있습니다</p>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={isProcessing || !query.trim() || availableTables.length === 0}
            className={`px-5 py-2.5 rounded-lg bg-primary-600 text-black ${
              isProcessing || !query.trim() || availableTables.length === 0 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-primary-700 focus:ring-4 focus:ring-primary-300'
            }`}
            title="Ctrl+Enter로도 실행 가능합니다"
          >
            {isProcessing ? (
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>실행 중...</span>
              </div>
            ) : (
              '실행'
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setQuery('')}
            className="text-gray-500 hover:text-gray-700"
          >
            초기화
          </button>
        </div>
      </form>
      
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <strong>에러:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default SqlEditor; 