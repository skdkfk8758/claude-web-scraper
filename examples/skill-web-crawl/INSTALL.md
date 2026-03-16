# web-crawl 스킬 설치 가이드

이 폴더의 `SKILL.md`는 Claude Code에서 `/web-crawl` 명령어를 사용할 수 있게 해주는 스킬 파일입니다.

## 설치 방법

### 방법 1: Claude Code에서 프롬프트로 설치

아래 프롬프트를 Claude Code에 붙여넣으세요:

```
https://github.com/skdkfk8758/claude-web-scraper 프로젝트를 클론하고,
.claude/skills/web-crawl/ 폴더에 있는 스킬을 내 Claude Code에 설치해줘.
npm install, npm run build, playwright 설치까지 전부 해줘.
```

### 방법 2: 수동 설치

1. 프로젝트를 클론합니다:
```bash
git clone https://github.com/skdkfk8758/claude-web-scraper
cd web-crawler
npm install && npm run build
npx playwright install chromium
```

2. 스킬 파일을 복사합니다:
```bash
# 프로젝트 내 .claude/skills/web-crawl/SKILL.md 가 이미 포함되어 있으므로
# 해당 디렉토리에서 Claude Code를 실행하면 자동으로 스킬이 로드됩니다.
```

3. Claude Code를 프로젝트 디렉토리에서 실행합니다:
```bash
cd web-crawler
claude
```

## 사용 확인

Claude Code에서 아래를 입력하면 스킬이 동작합니다:

```
/web-crawl https://news.ycombinator.com 뉴스 제목 수집해줘
```

## 다른 프로젝트에서 사용하기

이 스킬을 다른 프로젝트에서도 사용하고 싶다면:

1. `SKILL.md`를 해당 프로젝트의 `.claude/skills/web-crawl/SKILL.md`로 복사
2. `SKILL.md` 내 `{PROJECT_ROOT}`가 web-crawler 프로젝트 절대 경로를 가리키도록 수정

```bash
mkdir -p /path/to/your-project/.claude/skills/web-crawl
cp SKILL.md /path/to/your-project/.claude/skills/web-crawl/
```
