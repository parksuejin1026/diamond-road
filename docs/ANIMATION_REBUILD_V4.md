# 캐릭터·애니메이션 재작업

2026-11-06. 사용자가 배포된 캐릭터 디자인과 동작을 거부했다. 이전 SVG 도형 캐릭터의 부위 회전을 완성된 애니메이션으로 설명한 것은 부적절했다. 이 문서는 그 대체 작업을 기록한다.

## 제작한 원화

built-in `image_gen`으로 새 선수 한 명의 일관된 얼굴·의상·체형을 기준으로 서로 다른 전신 자세 64개를 제작했다. PNG의 투명 알파는 보존했다. 각 시트는 4×4, 16개 자세다. 기존 게임 자산은 복사하지 않았다.

- `public/art/animation/batting-v4.png`: 준비, 앞발 들기, 스트라이드, 골반 회전, 타격, 팔로스루, 주루 출발.
- `public/art/animation/pitching-v4.png`: 세트, 다리 들기, 손 분리, 앞발 착지, 릴리스, 팔로스루, 수비 준비.
- `public/art/animation/fielding-v4.png`: 준비, 달리기, 도약, 글러브 뻗기, 포구, 착지, 일어나기.
- `public/art/animation/running-v4.png`: 좌우 교차 달리기 8자세와 정지·주먹 쥐기·점프·착지·환호 8자세.
- `public/art/animation/stadium-v4.png`: 타자 쪽에서 마운드를 바라보는 구장.
- `public/art/animation/pitcher-stadium-v4.png`: 전경 마운드와 원경 홈플레이트가 보이는 투수 시점.
- `public/art/animation/outfield-stadium-v4.png`: 주루·다이빙 캐치를 보여주는 외야 잔디 시점.

정확한 생성 프롬프트: [animation-prompts-v4.json](animation-prompts-v4.json). 제작 방식은 CLI가 아닌 built-in image_gen이다. 이번 단계는 서로 다른 얼굴 6명의 완전한 동작 세트를 만든 것이 아니다. 한 선수의 실제 동작을 먼저 완성했고, 기존 외형 선택 번호는 그 선수의 카드 포즈 6가지로 연결한다. 데이터의 능력치·계약·커리어 기록은 바꾸지 않는다.

## 재생 방식

- CSS로 고정된 팔·다리 그림을 회전하던 방식을 제거했다. Canvas가 시트의 서로 다른 전신 원화 프레임을 실제로 그린다.
- `src/game/replay/atlas.json`에 프레임별 소스 영역과 발 기준점을 기록한다. 행이 바뀔 때 발이 튀지 않도록 등록 좌표를 적용한다.
- `src/game/replay/timeline.ts`에서 투수 릴리스, 타격, 포구, 착지, 주루 전환 시간을 함께 관리한다. 타격의 공은 배트 끝에서 타구 궤적으로 바뀌고, 캐치는 포구 프레임의 글러브 위치에서 공이 사라진다.
- 타격은 투수 와인드업 → 투구 → 타자의 준비·스윙 → 타구 → 주루로 이어진다. 투구 장면은 늦게 나온 상대 스윙과 삼진으로 마무리한다.
- 장면이 보이는 동안 반복 재생하며, 화면 밖으로 나가거나 탭을 숨기면 진행 시간을 멈춘다. 일시정지·처음부터·느리게·전체화면 보기를 제공한다.
- `/motion-preview/`에서 타격·투구·수비·주루·환호를 게임 진행 없이 선택해 볼 수 있다. 선수 생성의 카드 선택에서 별도 탭으로 열 수 있다.

## 시각 확인과 검증

Canvas 재생을 MediaRecorder로 녹화해 WebM 영상으로 확인했다. 스크린샷 한 장으로 동작을 판정하지 않는다. 타격의 앞발 들기·임팩트, 투구 릴리스, 다이빙 포구를 영상에서 추출해 위치를 점검했다.

검사는 실제 Canvas 픽셀 변화, 재생된 원화 프레임의 다양성, 일시정지, 모바일 화면, 공의 릴리스·타격·포구 좌표를 확인한다. 단순히 DOM 요소의 transform이 바뀌었다는 이유로 애니메이션이 완성됐다고 판정하지 않는다.

로컬 영상: `artifacts/batting-v4.webm`, `artifacts/pitching-v4.webm`, `artifacts/fielding-v4.webm`, `artifacts/running-v4.webm`, `artifacts/celebration-v4.webm`.
