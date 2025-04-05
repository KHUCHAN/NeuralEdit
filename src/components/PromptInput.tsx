import { useState } from 'react';

interface PromptInputProps {
  onPromptSubmit: (prompt: string) => void;
  isLoading: boolean;
}

const PromptInput = ({ onPromptSubmit, isLoading }: PromptInputProps) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isLoading) {
      onPromptSubmit(prompt.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 mb-4">
      <h2 className="text-lg font-semibold mb-2">자연어로 쿼리 생성</h2>
      <p className="text-sm text-gray-600 mb-3">
        원하는 데이터 조회 내용을 자연어로 입력하세요. AI가 SQL 쿼리로 변환합니다.
      </p>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="예: '서울에 사는 20대 고객의 평균 구매액을 보여줘'"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            disabled={isLoading}
          />
          {prompt.length > 0 && (
            <button
              type="button"
              onClick={() => setPrompt('')}
              className="absolute right-10 top-2 text-gray-400 hover:text-gray-600"
              title="지우기"
            >
              ×
            </button>
          )}
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className={`px-4 py-2 rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isLoading || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                <span>처리 중...</span>
              </div>
            ) : (
              '쿼리 생성'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PromptInput; 