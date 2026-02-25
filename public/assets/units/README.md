# /public/assets/units

이 폴더에는 게임 내 개별 유닛들의 스프라이트 시트 및 이미지 에셋이 저장됩니다.

## 스프라이트 시트 공통 규격

| 항목 | 값 |
|---|---|
| 레이아웃 | 4열 × 4행 = 16셀 |
| 전체 해상도 | 1024 × 1024 px |
| 셀 크기 | 256 × 256 px |
| Phaser frameWidth | 256 |
| Phaser frameHeight | 256 |
| 프레임 0~3 | Idle (대기) |
| 프레임 4~7 | Walk (이동) |
| 프레임 8~11 | Attack (공격) |
| 프레임 12~15 | Death (사망) |

## 에셋 목록

현재 생성된 스프라이트 파일 없음.

개발 초기에는 `asset-agent`의 Phaser `generateTexture` placeholder를 사용한다.
실제 스프라이트가 필요할 때 아래 명령어로 생성:

```bash
node scripts/generate_spritesheet.mjs infantry   # 5방향 전체
node scripts/generate_spritesheet.mjs infantry E  # E방향만
```

