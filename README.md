# webcrawl

Playwright & Scrapling 기반 적응형 웹 스크래핑 CLI. Claude Code / Claude Desktop과 연동하여 자연어로 웹 데이터를 추출할 수 있다.

## 비개발자 가이드 (Claude에서 바로 시작하기)

코딩 경험이 없어도 Claude를 통해 웹 데이터를 수집할 수 있습니다.

### Claude Code에서 자동 설치

아래 프롬프트를 Claude Code에 그대로 붙여넣으세요:

```
https://github.com/skdkfk8758/claude-web-scraper
이 프로젝트를 클론해서 설치해줘.
npm install, npm run build, playwright 브라우저 설치까지 전부 해주고,
완료되면 Claude Desktop MCP 서버 설정도 추가해줘.
```

### 설치 후 사용법

브라우저에서 원하는 페이지의 URL을 복사한 뒤, Claude에 아래처럼 입력하세요:

```
/web-crawl https://www.oliveyoung.co.kr/store/main/getBestList.do?dispCatNo=900000100100001
여기 모든 상품의 리뷰 데이터 수집해줘.
상품명, 가격, 별점, 리뷰 개수를 정리해서 CSV로도 저장해줘.
```

```
/web-crawl https://search.shopping.naver.com/search/all?query=블루투스이어폰
검색 결과에서 상품명, 가격, 판매처, 리뷰 수를 추출해줘.
3페이지까지 수집해줘.
```

> 더 많은 예시는 [`examples/prompts-for-non-developers.md`](examples/prompts-for-non-developers.md)를 참고하세요.

---

## 설치

```bash
npm install
npm run build

# Playwright 브라우저 설치 (최초 1회)
npx playwright install chromium
```

### 선택사항: Scrapling (경량 HTTP 크롤링)

```bash
pip install scrapling
```

Scrapling이 없으면 모든 요청에 Playwright를 사용한다.

## 빠른 시작

### CLI 직접 사용

```bash
# 셀렉터 기반 추출
webcrawl fetch "https://news.ycombinator.com" \
  -f "title:.titleline a::text" "link:.titleline a::attr(href)"

# AI 추출 (Claude Code 연동)
webcrawl fetch "https://news.ycombinator.com" \
  -e "각 게시물의 제목, 링크, 점수를 추출해줘"

# 쿠팡 상품 리뷰 수집
webcrawl review "https://www.coupang.com/vp/products/1234567" --pages 1-5

# YAML 설정 파일 실행
webcrawl run jobs/example-simple.yaml

# 정리된 HTML만 가져오기
webcrawl html "https://example.com"
```

### Claude Code에서 사용 (`/web-crawl` 스킬)

```
/web-crawl https://news.ycombinator.com 상위 게시물 제목과 점수 추출해줘
/web-crawl https://shop.com --fields "name:.product-name::text" "price:.price::text"
/web-crawl review https://www.coupang.com/vp/products/1234567 --pages 1-5
/web-crawl run jobs/example-simple.yaml
```

## Claude Desktop / Cowork 연동

Claude Desktop이나 Cowork에서 이 도구를 MCP 서버로 등록하면 대화형으로 웹 스크래핑을 수행할 수 있다.

### 1단계: MCP 서버 설정

`claude_desktop_config.json` (Claude Desktop) 또는 `cowork.json`에 아래를 추가한다.

**macOS 기준 설정 파일 위치:**
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Cowork: 프로젝트 루트의 `.cowork/config.json`

```json
{
  "mcpServers": {
    "webcrawl": {
      "command": "node",
      "args": ["/Users/<username>/Workspace/web-crawler/dist/cli/index.js"],
      "env": {}
    }
  }
}
```

> `<username>`을 실제 사용자명으로 교체한다.

### 2단계: Claude Code 스킬 활용

이 프로젝트에는 `.claude/skills/web-crawl/SKILL.md` 스킬이 포함되어 있다. Claude Code에서 프로젝트 디렉토리를 열면 자동으로 `/web-crawl` 스킬을 사용할 수 있다.

**사용 예시:**
```
사용자: /web-crawl https://news.ycombinator.com 뉴스 제목 수집해줘
사용자: /web-crawl https://shop.com 상품명, 가격 추출해줘
사용자: /web-crawl run jobs/daily-news.yaml
```

### 3단계: 봇 차단 사이트 대응

쿠팡, 네이버 등 강력한 봇 탐지를 사용하는 사이트는 자동화 접근이 차단될 수 있다. 이 경우 아래 방법을 사용한다.

#### 방법 A: 프로필 로그인 (쿠키 세션 저장)

```bash
# 브라우저가 열리면 직접 로그인 → 창 닫기 → 쿠키 저장
webcrawl profile login coupang --url https://www.coupang.com/login

# 저장된 프로필로 크롤링
webcrawl fetch "https://www.coupang.com/vp/products/..." --profile coupang
```

#### 방법 B: 수동 HTML 저장 후 AI 분석

1. 브라우저에서 대상 페이지를 직접 연다
2. 리뷰 등 원하는 데이터가 로드될 때까지 스크롤
3. `Cmd + S` (Mac) / `Ctrl + S` (Windows) → "웹페이지, HTML만" 저장
4. 저장된 HTML을 Claude에게 전달:

```
사용자: data/coupang-product.html 파일에서 리뷰 데이터 추출해줘
```

#### 방법 C: Stealth 모드 단계적 적용

```bash
# 기본 (자동 판단)
webcrawl fetch "https://example.com" --stealth auto

# Cloudflare 우회 모드
webcrawl fetch "https://example.com" --stealth cloudflare
```

## CLI 명령어

### `fetch` - 페이지 크롤링 및 데이터 추출

```bash
webcrawl fetch <url> [options]

옵션:
  -f, --fields <fields...>   셀렉터 기반 필드 정의 (key:selector::attr 형식)
  -e, --extract <prompt>     AI 추출 프롬프트 (Claude Code 연동)
  -o, --output <path>        출력 파일 경로
  --format <json|csv>        출력 형식 (기본: json)
  --stealth <auto|off|cloudflare>  Stealth 모드 (기본: auto)
  --adaptive                 적응형 셀렉터 매칭
  --retry <n>                재시도 횟수 (기본: 3)
  --profile <name>           저장된 프로필 사용
```

### `html` - 정리된 HTML 가져오기

```bash
webcrawl html <url> [options]

옵션:
  --stealth <mode>    Stealth 모드
  --profile <name>    저장된 프로필
  --raw               HTML 정리 없이 원본 출력
  -o, --output <path> 파일로 저장
  --max-length <n>    최대 HTML 길이 (기본: 100000)
```

### `run` - YAML 설정 파일 실행

```bash
webcrawl run <config.yaml>
```

### `profile` - 로그인 세션 관리

```bash
webcrawl profile login <name> --url <login-url>   # 브라우저 로그인 후 쿠키 저장
webcrawl profile list                              # 저장된 프로필 목록
webcrawl profile remove <name>                     # 프로필 삭제
```

### `review` - 쿠팡 상품 리뷰 수집

```bash
webcrawl review <url> [options]

옵션:
  --pages <range>      페이지 범위 (예: 1-5, all, 기본: 1)
  --rating <stars>     별점 필터 (예: 1,2,5)
  --sort <order>       정렬: latest|rating|helpful (기본: latest)
  --delay <range>      요청 딜레이 초 (예: 3-6, 기본: 3-6)
  --format <json|csv>  출력 형식 (기본: json)
  -o, --output <path>  출력 파일 경로
  --profile <name>     로그인 프로필 사용
  --timeout <ms>       타임아웃 (기본: 30000)
```

**사용 예시:**

```bash
# 첫 페이지 리뷰 (기본)
webcrawl review "https://www.coupang.com/vp/products/1234567"

# 1~5 페이지, CSV 저장
webcrawl review "https://www.coupang.com/vp/products/1234567" --pages 1-5 --format csv

# 1-2점 리뷰만 필터링
webcrawl review "https://www.coupang.com/vp/products/1234567" --pages 1-10 --rating 1,2

# 전체 리뷰 (최대 300페이지)
webcrawl review "https://www.coupang.com/vp/products/1234567" --pages all
```

> **참고**: 쿠팡은 Akamai Bot Protection을 사용하며, 시스템에 Google Chrome이 설치되어 있어야 합니다. headed Chrome + CDP 연결 방식으로 봇 탐지를 우회합니다.

### `schedule` - 정기 실행 관리

```bash
webcrawl schedule add <config.yaml> --cron "0 9 * * *"  # 스케줄 등록
webcrawl schedule list                                   # 스케줄 목록
webcrawl schedule remove <name>                          # 스케줄 삭제
webcrawl schedule start                                  # 스케줄러 데몬 시작
```

## YAML 설정 파일

### 셀렉터 기반 추출

```yaml
name: hn-posts
url: https://news.ycombinator.com

fields:
  title: ".titleline a::text"
  link: ".titleline a::attr(href)"
  score: ".score::text"

output:
  format: json
  path: ./data/hn-posts.json

stealth: "off"
retry: 3
```

### AI 추출

```yaml
name: hn-ai-extract
url: https://news.ycombinator.com

extract: "각 게시물의 제목, 링크, 점수, 작성자를 추출해줘"

output:
  format: json
  path: ./data/hn-ai.json

stealth: "off"
```

### 인터랙티브 (JS 렌더링 대기)

```yaml
name: quotes
url: https://quotes.toscrape.com/js/

steps:
  - action: wait
    selector: ".quote"
    timeout: 5000

fields:
  text: ".quote .text::text"
  author: ".quote .author::text"

output:
  format: csv
  path: ./data/quotes.csv

stealth: "auto"
screenshot_on_error: true
```

### 정기 실행

```yaml
name: daily-news
url: https://news.ycombinator.com

fields:
  title: ".titleline a::text"
  link: ".titleline a::attr(href)"

output:
  format: json
  path: ./data/hn-daily.json

schedule: "0 9 * * *"
```

## 프로젝트 구조

```
web-crawler/
├── src/
│   ├── cli/              # CLI 명령어 (fetch, run, schedule, profile, html, review)
│   ├── core/             # 설정 로더, 오케스트레이터
│   ├── coupang/          # 쿠팡 리뷰 크롤러 (URL 파서, 리뷰 추출, CDP fetcher)
│   ├── fetcher/          # Playwright / Scrapling 페치 전략
│   ├── extractor/        # 셀렉터 추출, AI 추출 (HTML 정리)
│   ├── output/           # JSON / CSV 출력
│   ├── profile/          # 쿠키/세션 프로필 관리
│   ├── scheduler/        # cron 스케줄러
│   ├── error/            # 로깅, 에러 리포터
│   ├── bridge/           # Python(Scrapling) 브릿지
│   └── utils/            # 유틸리티
├── examples/             # 비개발자용 사용 가이드 및 예시 설정
├── jobs/                 # YAML 설정 파일 예제
├── data/                 # 추출 결과 저장
├── profiles/             # 로그인 세션 저장
├── dist/                 # 빌드 결과
└── .claude/skills/       # Claude Code 스킬 정의
```

## Fetch 전략

| 조건 | 전략 |
|------|------|
| `steps` 포함 (인터랙션 필요) | Playwright |
| `--stealth cloudflare` | Scrapling Stealth (없으면 Playwright fallback) |
| `--stealth off` | Scrapling HTTP |
| `--stealth auto` (기본) | Scrapling HTTP → 실패 시 Stealth 단계적 적용 |
| Scrapling 미설치 | 항상 Playwright fallback |

## 개발

```bash
# 개발 모드 실행
npm run dev -- fetch "https://example.com" -f "title:h1::text"

# 빌드
npm run build

# 빌드 후 실행
npm start -- fetch "https://example.com" -f "title:h1::text"
```

## 라이선스

MIT
