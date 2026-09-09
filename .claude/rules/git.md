# Git 커밋 규칙 (사용자 결정 2026-09-09)

- **제목은 영어 동사 한 단어, 소문자.** `initialize` · `add` · `fix` · `refactor` · `rename` · `remove` · `document` · `test` · `update` 처럼 커밋이 한 일을 동사 하나로 말한다. 설명·범위·콜론·마침표 없음.
- 본문은 쓰지 않는다. 무엇을 왜 했는지는 코드·문서(`.claude/rules`, `.claude/reference`)가 말한다.
- 트레일러 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` 는 제목 뒤 빈 줄 다음에 둔다(도구 규칙).
- 작성자: `git -c user.name=gunhee -c user.email=insighter.imt.claude.1@gmail.com commit -m "<동사>" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"`.
- 원격: `origin` = https://github.com/gunhe17/personal-infrastructure.git, 브랜치 `main`. 커밋 뒤 `git push`.
- 한 커밋에 한 동사가 어울리도록 나눈다. 여러 동사가 필요하면 커밋을 나눈다.
