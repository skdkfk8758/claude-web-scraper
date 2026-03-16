# 사용 예시 모음

이 폴더에는 비개발자도 바로 따라할 수 있는 **Claude Code / Claude Desktop 사용 예시**가 포함되어 있습니다.

## 파일 목록

| 파일 | 설명 |
|------|------|
| `prompts-for-non-developers.md` | 비개발자용 프롬프트 가이드 (복사해서 바로 사용) |
| `oliveyoung-reviews.yaml` | 올리브영 베스트 상품 리뷰 수집 설정 |
| `coupang-products.yaml` | 쿠팡 상품 목록 수집 설정 |
| `naver-news.yaml` | 네이버 뉴스 헤드라인 수집 설정 |
| `skill-web-crawl/` | `/web-crawl` Claude Code 스킬 (SKILL.md + 설치 가이드) |

## 스킬 설치

`skill-web-crawl/` 폴더에 Claude Code용 `/web-crawl` 스킬이 포함되어 있습니다.
설치 방법은 [`skill-web-crawl/INSTALL.md`](skill-web-crawl/INSTALL.md)를 참고하세요.

설치 후 Claude Code에서 이렇게 사용합니다:
```
/web-crawl https://www.oliveyoung.co.kr/store/main/getBestList.do 상품 리뷰 수집해줘
```

## 사용 방법

### 1. 프롬프트만으로 사용 (가장 간단)

`prompts-for-non-developers.md`를 열어서 원하는 프롬프트를 복사 → Claude에 붙여넣기

### 2. YAML 설정 파일로 실행

```bash
webcrawl run examples/oliveyoung-reviews.yaml
```

또는 Claude Code에서:
```
/web-crawl run examples/oliveyoung-reviews.yaml
```
