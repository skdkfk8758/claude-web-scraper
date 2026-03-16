# 비개발자를 위한 프롬프트 가이드

> 코딩 경험이 없어도 아래 프롬프트를 **Claude Code** 또는 **Claude Desktop**에 붙여넣으면 웹 데이터를 수집할 수 있습니다.

---

## 초기 설정 (최초 1회)

### Claude Code에서 자동 설치

아래 프롬프트를 Claude Code에 붙여넣으세요:

```
https://github.com/skdkfk8758/claude-web-scraper

이 프로젝트를 클론해서 설치해줘.
npm install, npm run build, playwright 브라우저 설치까지 전부 해주고,
완료되면 Claude Desktop MCP 서버 설정도 추가해줘.
```

> `skdkfk8758`를 실제 GitHub 사용자명으로 바꿔주세요.

### Claude Desktop에서 수동 설치

Claude Desktop만 사용하는 경우, 터미널에서 아래 명령어를 직접 실행해야 합니다:

```bash
# 1. 프로젝트 다운로드
git clone https://github.com/skdkfk8758/claude-web-scraper
cd web-crawler

# 2. 설치 및 빌드
npm install
npm run build
npx playwright install chromium

# 3. 완료 후 Claude Desktop에서 아래 프롬프트 입력:
```

```
web-crawler 프로젝트를 Claude Desktop MCP 서버로 등록하고 싶어.
프로젝트 경로는 ~/web-crawler 야. 설정 파일 수정해줘.
```

---

## 실전 사용 예시

### 예시 1: 올리브영 베스트 상품 리뷰 수집

```
/web-crawl https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001

여기 모든 상품의 리뷰 데이터 수집해줘.
상품명, 가격, 별점, 리뷰 개수를 정리해서 엑셀로 볼 수 있게 CSV로도 저장해줘.
```

### 예시 2: 쿠팡 특정 카테고리 상품 비교

```
/web-crawl https://www.coupang.com/np/categories/497135

이 카테고리에서 상품명, 가격, 별점, 리뷰 수 추출해줘.
가격 낮은 순으로 정렬해서 보여줘.
```

> 쿠팡은 봇 차단이 있을 수 있습니다. 차단되면 Claude가 프로필 로그인 또는 수동 HTML 저장 방법을 안내합니다.

### 예시 3: 뉴스 헤드라인 수집

```
/web-crawl https://news.naver.com

오늘 주요 뉴스 헤드라인과 링크를 모두 수집해줘.
카테고리별로 정리해서 보여주고 JSON으로 저장해줘.
```

### 예시 4: 여러 페이지 한번에 수집

```
/web-crawl https://search.shopping.naver.com/search/all?query=블루투스이어폰

검색 결과에서 상품명, 가격, 판매처, 리뷰 수를 추출해줘.
페이지네이션이 있으면 3페이지까지 수집해줘.
```

### 예시 5: 정기 모니터링 설정

```
/web-crawl https://www.musinsa.com/ranking/best

무신사 베스트 랭킹 상위 20개 상품의 이름, 가격, 브랜드를 수집해줘.
매일 아침 9시에 자동으로 수집되도록 스케줄도 설정해줘.
```

### 예시 6: 경쟁사 가격 비교

```
아래 3개 사이트에서 "에어팟 프로 2" 가격을 비교해줘:
- https://www.coupang.com/np/search?q=에어팟프로2
- https://search.shopping.naver.com/search/all?query=에어팟프로2
- https://www.11st.co.kr/search/Search.tmall?kwd=에어팟프로2

각 사이트별 최저가, 판매처, 배송비를 정리해줘.
```

---

## 팁

- **URL은 브라우저 주소창에서 복사**해서 그대로 붙여넣으세요
- **추출하고 싶은 항목을 구체적으로** 적을수록 정확한 결과를 얻습니다
- 결과는 자동으로 `data/` 폴더에 JSON과 CSV로 저장됩니다
- 봇 차단 시 Claude가 대안을 안내합니다 (프로필 로그인, 수동 HTML 등)
- "CSV로 저장해줘", "엑셀로 볼 수 있게 해줘" 등 출력 형식을 요청할 수 있습니다

## 자주 하는 실수

| 실수 | 해결 |
|------|------|
| URL 없이 "올리브영 크롤링해줘" | 구체적인 URL을 포함해주세요 |
| 너무 많은 페이지 요청 | 한 번에 20페이지가 최대입니다. 범위를 좁혀주세요 |
| 로그인 필요 사이트 | "프로필 로그인" 기능을 먼저 사용하세요 |
| 데이터가 비어있음 | JavaScript로 로딩되는 사이트일 수 있음 → Claude가 자동 대응합니다 |
