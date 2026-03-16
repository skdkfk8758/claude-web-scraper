---
name: web-crawl
description: 웹페이지 스크래핑 및 데이터 추출 스킬. URL에서 데이터를 가져오고 구조화된 형태로 추출한다. 웹사이트 데이터 수집, 크롤링, 스크래핑, 페이지 분석, 가격 비교, 상품 목록 수집 등 웹에서 정보를 가져와야 할 때 사용. Use when user mentions 'scrape', 'crawl', 'extract from website', 'get data from URL', '크롤링', '스크래핑', '웹에서 가져와', '사이트에서 추출', '페이지 분석'.
user-invocable: true
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent
argument-hint: "<URL> [추출 요청 또는 서브커맨드]"
---

# Web Crawl Skill

웹페이지에서 데이터를 추출하는 올인원 스크래핑 스킬.

## 프로젝트 경로

이 스킬은 `web-crawler` 프로젝트의 CLI를 활용한다:
- CLI 경로: `node {PROJECT_ROOT}/dist/cli/index.js`
- 빌드 확인: `dist/` 디렉토리 존재 여부 체크, 없으면 `npm run build` 실행
- 데이터 저장: `{PROJECT_ROOT}/data/`

`{PROJECT_ROOT}`는 이 SKILL.md가 위치한 저장소 루트이다.

## 인자 파싱

`$ARGUMENTS` 전체를 분석하여 모드를 결정한다:

### Mode 1: AI 추출 (URL + 자연어)
```
/web-crawl https://shop.com "상품명, 가격 추출해줘"
/web-crawl https://shop.com 상품 정보 가져와
```
- 첫 번째 인자가 URL이고, 나머지가 자연어 → AI 추출 모드

### Mode 2: 셀렉터 추출 (URL + --fields)
```
/web-crawl https://shop.com --fields "title:.product-name::text" "price:.price::text"
```
- `--fields` 플래그 감지 → 셀렉터 모드

### Mode 3: YAML 실행 (run 서브커맨드)
```
/web-crawl run jobs/shop-monitor.yaml
```
- 첫 번째 인자가 `run` → YAML 모드

### Mode 4: 프로필 관리 (profile 서브커맨드)
```
/web-crawl profile list
/web-crawl profile login myshop --url https://shop.com/login
/web-crawl profile remove myshop
```
- 첫 번째 인자가 `profile` → 프로필 모드

### Mode 5: 스케줄 관리 (schedule 서브커맨드)
```
/web-crawl schedule add jobs/daily.yaml --cron "0 9 * * *"
/web-crawl schedule list
/web-crawl schedule remove job-name
/web-crawl schedule start
```
- 첫 번째 인자가 `schedule` → 스케줄 모드

### Mode 6: 페이지 탐색 (URL만)
```
/web-crawl https://shop.com
```
- URL만 제공, 추출 요청 없음 → 탐색 모드

### Mode 7: Claude 자동 호출
- 대화 중 웹 데이터가 필요하다고 판단될 때 Claude가 자동 호출
- 사용자의 의도에서 URL과 추출 대상을 파악

## 실행 흐름

### Phase 0: 환경 확인

1. `dist/cli/index.js` 존재 확인
2. 없으면: `npm run build` 실행
3. playwright 설치 여부 확인 (첫 실행 시)

### Phase 1: Fetch (페이지 가져오기)

CLI를 사용하여 HTML을 가져온다.

#### 단일 페이지
```bash
node dist/cli/index.js fetch "<URL>" --stealth auto --format json -o data/.ai-extract/page_<timestamp>.html 2>&1
```

단, **AI 추출 모드**에서는 정리된 HTML이 필요하므로:
```bash
node dist/cli/index.js fetch "<URL>" -e "placeholder" --stealth auto 2>&1
```
이 명령은 `data/.ai-extract/page_<timestamp>.html`에 정리된 HTML을 저장한다.

#### 멀티페이지 (페이지네이션)
사용자가 "전체", "모든 페이지", "--pages all" 등을 요청한 경우:

1. 첫 페이지를 fetch
2. HTML에서 페이지네이션 패턴 감지:
   - `a[href*="page="]`, `.pagination a`, `[aria-label="Next"]` 등
3. 다음 페이지 URL을 추출
4. 순차적으로 fetch (최대 20페이지, safety limit)
5. 각 페이지의 데이터를 누적

```bash
# 각 페이지를 순차 fetch
for page_url in <detected_urls>; do
  node dist/cli/index.js fetch "$page_url" -e "placeholder" --stealth auto 2>&1
done
```

### Phase 2: 데이터 추출

#### Mode 1: AI 추출
1. Phase 1에서 저장된 HTML 파일을 Read 도구로 읽는다
2. **Claude가 직접 HTML을 분석**하여 사용자의 요청에 맞는 데이터를 추출
3. 결과를 JSON 배열로 구조화

**분석 시 지침:**
- HTML에서 반복되는 패턴(리스트, 테이블, 카드 등)을 식별
- 각 항목에서 요청된 필드를 추출
- 빈 값은 `null`로 표기
- 가격은 숫자+통화 형태 유지
- URL은 절대 경로로 변환

#### Mode 2: 셀렉터 추출
```bash
node dist/cli/index.js fetch "<URL>" -f <fields...> --format json -o data/<name>.json 2>&1
```
CLI가 직접 처리.

#### Mode 6: 페이지 탐색
1. HTML을 가져와서 읽는다
2. 페이지 구조를 분석하여 사용자에게 제안:

```
📄 페이지 분석 결과: https://shop.com

감지된 데이터:
  1. 상품 목록 (30개 항목) — .product-card
     → 상품명, 가격, 이미지, 링크
  2. 카테고리 네비게이션 (12개) — .nav-category
     → 카테고리명, URL
  3. 리뷰 섹션 (10개) — .review-item
     → 작성자, 별점, 리뷰 텍스트

어떤 데이터를 추출할까요? (번호 또는 직접 설명)
```

### Phase 3: 결과 출력

#### 대화 미리보기
추출된 데이터를 마크다운 테이블로 보여준다:

```
## 추출 결과 (30건)

| # | 상품명 | 가격 | 링크 |
|---|--------|------|------|
| 1 | 나이키 에어맥스 | ₩189,000 | https://... |
| 2 | 아디다스 울트라부스트 | ₩199,000 | https://... |
| ... | | | |

> 전체 30건 중 5건 미리보기 (나머지는 파일에 저장됨)
```

- 5건 이하: 전체 표시
- 6건 이상: 상위 5건 미리보기 + 전체는 파일 저장

#### 파일 저장
```
💾 저장 완료:
  JSON: data/shop-products_20260316.json (30건)
  CSV:  data/shop-products_20260316.csv (30건)
```

- 기본: JSON + CSV 둘 다 저장
- 파일명: `data/<도메인>-<설명>_<날짜>.<ext>`

### Phase 4: 후속 제안

추출 완료 후 사용자에게 제안:

```
다음 작업:
  [1] 다른 페이지도 추출
  [2] 추출 조건 변경 후 재실행
  [3] YAML 설정으로 저장 (정기 실행용)
  [4] 완료
```

## YAML 모드 (Mode 3)

```bash
node dist/cli/index.js run <config-path> 2>&1
```

결과를 파싱하여 Phase 3과 동일한 형식으로 출력.

## 프로필 모드 (Mode 4)

```bash
# CLI에 직접 전달
node dist/cli/index.js profile <subcommand> [args...] 2>&1
```

결과를 사용자에게 보기 좋게 포맷팅하여 출력.

## 스케줄 모드 (Mode 5)

```bash
node dist/cli/index.js schedule <subcommand> [args...] 2>&1
```

결과를 사용자에게 포맷팅하여 출력.

## Stealth 전략 자동 선택

| 사이트 특성 | 전략 |
|-------------|------|
| 기본 | `--stealth auto` |
| Cloudflare 감지 시 | `--stealth cloudflare`로 재시도 |
| JS 렌더링 필요 | Playwright 자동 사용 (steps 포함 시) |

첫 시도 실패 시 stealth 레벨을 올려 자동 재시도:
1. `--stealth off` → 실패 시
2. `--stealth auto` → 실패 시
3. `--stealth cloudflare`

## 에러 처리

- fetch 실패: 에러 메시지 + 스크린샷 경로 안내
- 셀렉터 미매칭: 페이지 구조 분석 후 대안 셀렉터 제안
- 타임아웃: 타임아웃 증가 후 재시도 제안

## Rules

- 대화 내 HTML 분석 시 개인정보(이메일, 전화번호 등)는 마스킹하여 출력
- 멀티페이지 크롤링은 최대 20페이지로 제한 (safety limit)
- robots.txt를 존중 — 차단된 경로는 사전 경고
- fetch 결과가 빈 HTML이면 JavaScript 렌더링 필요를 안내
- YAML 저장 제안 시 `jobs/` 디렉토리에 저장
- 파일 저장 시 기존 파일 덮어쓰기 전 확인
- 대화 미리보기는 항상 5건 이하로 제한 (컨텍스트 보호)
- 스케줄 start는 장시간 실행이므로 백그라운드 실행 안내
