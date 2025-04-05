# Excel SQL Viewer with AI Query Generation

Excel 파일을 업로드하여 SQL로 데이터를 조회하고, 자연어로 쿼리를 생성할 수 있는 웹 애플리케이션입니다.

## 주요 기능

- Excel 파일(.xlsx, .xls) 업로드 및 시트별 데이터 조회
- SQL 쿼리를 통한 데이터 분석 및 편집
- 테이블과 칼럼에 대한 설명 추가 기능
- 자연어를 SQL 쿼리로 변환하는 AI 기능 (Gemini 2.0 Flash 활용)
- 쿼리 결과 엑셀 파일로 내보내기
- 대용량 데이터 처리(100만 행 이상) 지원

## 설치 방법

### 프론트엔드 (React)

```bash
# 프로젝트 클론
git clone <repository-url>
cd excel-sql-viewer

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 백엔드 (Flask)

```bash
# Flask 서버 디렉토리로 이동
cd src/flask_server

# 가상환경 생성 및 활성화 (선택사항)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 GEMINI_API_KEY 설정

# 서버 실행
python app.py
```

## 사용 방법

1. Excel 파일 업로드: 웹 애플리케이션에 Excel 파일을 업로드합니다.
2. SQL 쿼리 작성: 직접 SQL 쿼리를 작성하거나, 자연어 프롬프트를 입력하여 AI가 생성한 쿼리를 사용합니다.
3. 테이블/칼럼 설명 작성: 테이블과 칼럼에 대한 설명을 작성하면 AI가 더 정확한 쿼리를 생성합니다.
4. 결과 확인: 쿼리 실행 결과가 그리드에 표시됩니다.
5. 결과 내보내기: 쿼리 결과를 Excel 파일로 내보낼 수 있습니다.

## 기술 스택

- 프론트엔드: React, TypeScript, Tailwind CSS, SheetJS
- 백엔드: Flask, Python
- 데이터 처리: AlaSQL (클라이언트 측 SQL 엔진)
- AI 모델: Google Gemini 2.0 Flash

## 라이선스

MIT License
