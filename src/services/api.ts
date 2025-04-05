interface GenerateQueryRequest {
  prompt: string;
  tableName: string;
  columns: string[];
  tableDescription: string;
  columnDescriptions: Record<string, string>;
  sampleData?: any[];
}

interface GenerateQueryResponse {
  query: string;
  explanation?: string;
  error?: string;
}

// Flask 서버 기본 URL
const API_BASE_URL = 'http://localhost:5000';

// Gemini를 이용해 자연어 프롬프트를 SQL 쿼리로 변환
export const generateQueryFromPrompt = async (data: GenerateQueryRequest): Promise<GenerateQueryResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`서버 오류 (${response.status}): ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Query generation error:', error);
    return {
      query: '',
      error: error instanceof Error ? error.message : '쿼리 생성 중 오류가 발생했습니다',
    };
  }
};

// 쿼리 실행 기록 저장 (선택적)
export const saveQueryHistory = async (prompt: string, query: string, result: any): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/api/save-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        query,
        result: Array.isArray(result) ? result.length : 0,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.error('Error saving query history:', error);
    // 실패해도 사용자 경험에 영향 없으므로 오류 무시
  }
}; 