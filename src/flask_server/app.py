from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import os
import json
from dotenv import load_dotenv

# .env 파일에서 환경 변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)  # 모든 도메인에서의 요청 허용

# Gemini API 키 로드
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Gemini 설정
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("경고: GEMINI_API_KEY가 설정되지 않았습니다.")

# 기본 프롬프트 템플릿
PROMPT_TEMPLATE = """
당신은 자연어를 SQL 쿼리로 변환하는 전문가입니다.
사용자의 요청을 분석하여 알맞은 SQL 쿼리를 생성해주세요.
답변이 바로 SQL로 사용되므로 필요없는 문장 / 식별자는 답변에 넣지 않아야함에 주의해주세요

### 테이블 정보
테이블 이름: {table_name}
테이블 설명: {table_description}

### 칼럼 정보
{column_info}

### 샘플 데이터
{sample_data}

### 사용자 요청
{user_prompt}

다음 규칙을 무조건 지켜주세요:
1. 테이블 이름과 칼럼 이름은 대괄호([])로 감싸주세요. 예: SELECT [column1] FROM [table] WHERE [Column2] = '3'
2. alasql 구문을 사용해야 합니다. ANSI SQL과 호환되는 기본 SQL 구문을 사용해주세요.
3. 쿼리만 출력하세요 ''' sql ''' 같은 불필요 단어 포함시키지 말고, 설명이나 추가 텍스트는 포함하지 마세요. . 답변 예시: SELECT column1 FROM table
4. 모든 테이블 및 칼럼 이름은 소문자로 처리되므로 그에 맞게 쿼리를 작성하세요.
5. 제공하는 답변이 바로 쿼리로 실행됩니다 "'''"이나 header에 sql 이런 단어를 넣지마


"""

@app.route('/api/generate-query', methods=['POST'])
def generate_query():
    try:
        data = request.json
        
        # 필수 매개변수 검증
        if not all(key in data for key in ['prompt', 'tableName', 'columns']):
            return jsonify({
                'error': '필수 매개변수(prompt, tableName, columns)가 누락되었습니다.'
            }), 400
            
        # 데이터 준비
        prompt = data['prompt']
        table_name = data['tableName']
        columns = data['columns']
        table_description = data.get('tableDescription', '')
        column_descriptions = data.get('columnDescriptions', {})
        sample_data = data.get('sampleData', [])
        
        # 칼럼 정보 형식화
        column_info = []
        for col in columns:
            description = column_descriptions.get(col, '')
            column_info.append(f"- [{col}]: {description}")
        column_info_str = "\n".join(column_info)
        
        # 샘플 데이터 형식화 (최대 5행)
        sample_data = sample_data[:5]
        sample_data_str = json.dumps(sample_data, ensure_ascii=False, indent=2)
        
        # 프롬프트 완성
        final_prompt = PROMPT_TEMPLATE.format(
            table_name=table_name,
            table_description=table_description,
            column_info=column_info_str,
            sample_data=sample_data_str,
            user_prompt=prompt
        )

            
        # Gemini 모델로 쿼리 생성
        # 모델 구성
        generation_config = {
        "temperature": 0.55,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 12000,
        }

        model = genai.GenerativeModel(
        model_name="gemini-2.0-flash",
        generation_config=generation_config,
        )
        genai.configure(api_key="")


        chat_session = model.start_chat(
        history=[]
        )
        response = chat_session.send_message(final_prompt)
        # 응답 텍스트 추출 (응답이 GenerateContentResponse 객체일 경우)
        print(final_prompt)
        # model = genai.GenerativeModel('gemini-1.5-flash')

        # response = model.generate_content(final_prompt)
        print(response)
        # 응답 파싱
        generated_query = response.text
        generated_query = generated_query.replace("```","").replace('sql\n',"").strip()
        print("추출 쿼리:",generated_query)
        
        # SQL 쿼리가 맞는지 검증
        if not (generated_query.lower().startswith("select") or 
                generated_query.lower().startswith("insert") or 
                generated_query.lower().startswith("update") or 
                generated_query.lower().startswith("delete")):
            return jsonify({
                'error': f'유효한 SQL 쿼리가 생성되지 않았습니다.',
                'rawResponse': generated_query
            }), 400
        print(generate_query)    
        return jsonify({
            'query': generated_query,
            'explanation': f"자연어 요청 '{prompt}'에 대해 생성된 SQL 쿼리입니다."
        })
        
    except Exception as e:
        print("Error:", str(e))
        return jsonify({'error': str(e)}), 500

@app.route('/api/save-history', methods=['POST'])
def save_history():
    try:
        data = request.json
        
        # 실제 저장 로직은 간단하게 로그만 출력
        print("쿼리 기록 저장:", data)
        
        # 향후 데이터베이스 연동 등으로 확장 가능
        
        return jsonify({'success': True})
    except Exception as e:
        print("Error:", str(e))
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 