/**
 * generate_spritesheet.mjs
 *
 * Gemini Imagen API로 방향별 16개 프레임을 개별 생성 후
 * sharp로 4×4 그리드 스프라이트 시트를 합성한다.
 *
 * 8방향 중 5개 파일 생성 (나머지 3개는 Phaser에서 flipX 처리):
 *   E  (동 = 오른쪽)  →  파일 생성
 *   NE (북동 = 우상)  →  파일 생성
 *   N  (북 = 위)      →  파일 생성
 *   SE (남동 = 우하)  →  파일 생성
 *   S  (남 = 아래)    →  파일 생성
 *   W  (서 = 왼쪽)    =  E  + flipX (Phaser 처리)
 *   NW (북서 = 좌상)  =  NE + flipX (Phaser 처리)
 *   SW (남서 = 좌하)  =  SE + flipX (Phaser 처리)
 *
 * 사용법:
 *   node scripts/generate_spritesheet.mjs <유닛타입> [방향]
 *
 * 예시:
 *   node scripts/generate_spritesheet.mjs infantry          # 5방향 전체 생성
 *   node scripts/generate_spritesheet.mjs infantry E        # E 방향만 생성
 *   node scripts/generate_spritesheet.mjs tank NE           # NE 방향만 생성
 *
 * 결과: public/assets/units/<유닛타입>/<유닛타입>_<방향>.jpeg
 *       예) public/assets/units/infantry/infantry_E.jpeg
 *
 * Phaser 로드:
 *   this.load.spritesheet('infantry_E', '...infantry/infantry_E.jpeg', { frameWidth: 256, frameHeight: 256 });
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── .env 파싱 ───────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env');
let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && fs.existsSync(envPath)) {
  const m = fs.readFileSync(envPath, 'utf8').match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
  if (m) apiKey = m[1];
}
if (!apiKey || apiKey === '여기에_API_키를_입력하세요') {
  console.error('❌ .env 파일에 GEMINI_API_KEY가 없습니다.');
  process.exit(1);
}

// ─── 유닛 타입별 외형 설명 ────────────────────────────────────────────────────
const UNIT_DESCRIPTIONS = {
  infantry: 'WW2 infantry soldier, dark green military uniform, steel helmet, brown boots, holding a rifle',
  tank:     'WW2 military battle tank, dark olive green armor, long cannon, visible tank treads',
  air:      'WW2 military fighter plane, olive green fuselage, propeller at nose, roundel markings',
  special:  'special forces commando, black tactical uniform, beret, face paint, holding a pistol',
};

// ─── 8방향 정의 (5개 파일 생성, 3개는 flipX) ─────────────────────────────────
const DIRECTIONS = {
  E:  {
    label:   '동 (오른쪽)',
    facing:  'facing RIGHT, character right side visible, moving toward right',
    walkDir: 'toward the right',
    atkDir:  'toward the right',
  },
  NE: {
    label:   '북동 (우상 대각선)',
    facing:  'facing upper-right diagonal, character right-back quarter visible',
    walkDir: 'toward upper-right diagonal',
    atkDir:  'toward upper-right diagonal',
  },
  N:  {
    label:   '북 (위, 등면)',
    facing:  'facing AWAY from viewer, character back fully visible, moving upward',
    walkDir: 'straight upward away from viewer',
    atkDir:  'upward away from viewer',
  },
  SE: {
    label:   '남동 (우하 대각선)',
    facing:  'facing lower-right diagonal, character right-front quarter visible',
    walkDir: 'toward lower-right diagonal',
    atkDir:  'toward lower-right diagonal',
  },
  S:  {
    label:   '남 (아래, 정면)',
    facing:  'facing TOWARD viewer, character front fully visible, moving downward',
    walkDir: 'straight downward toward viewer',
    atkDir:  'downward toward viewer',
  },
};

// ─── 16개 프레임 정의 (방향에 따라 desc 변경됨) ──────────────────────────────
function getFrameDefinitions(dir) {
  const d = DIRECTIONS[dir];
  return [
    // Row 1: Idle (4프레임)
    { row: 1, col: 1, anim: 'idle',   desc: `${d.facing}. Idle frame 1: neutral standing pose, weight balanced` },
    { row: 1, col: 2, anim: 'idle',   desc: `${d.facing}. Idle frame 2: slight inhale, shoulders rise` },
    { row: 1, col: 3, anim: 'idle',   desc: `${d.facing}. Idle frame 3: exhale, shoulders drop slightly` },
    { row: 1, col: 4, anim: 'idle',   desc: `${d.facing}. Idle frame 4: return to neutral, loop ready` },
    // Row 2: Walk (4프레임)
    { row: 2, col: 1, anim: 'walk',   desc: `${d.facing}. Walk frame 1: step cycle ${d.walkDir}, left foot forward` },
    { row: 2, col: 2, anim: 'walk',   desc: `${d.facing}. Walk frame 2: mid-stride ${d.walkDir}, both feet near ground` },
    { row: 2, col: 3, anim: 'walk',   desc: `${d.facing}. Walk frame 3: step cycle ${d.walkDir}, right foot forward` },
    { row: 2, col: 4, anim: 'walk',   desc: `${d.facing}. Walk frame 4: mid-stride return ${d.walkDir}, loop ready` },
    // Row 3: Attack (4프레임)
    { row: 3, col: 1, anim: 'attack', desc: `${d.facing}. Attack frame 1: windup pose, weapon drawn back, aiming ${d.atkDir}` },
    { row: 3, col: 2, anim: 'attack', desc: `${d.facing}. Attack frame 2: weapon firing or striking ${d.atkDir}, muzzle flash if ranged` },
    { row: 3, col: 3, anim: 'attack', desc: `${d.facing}. Attack frame 3: full extension ${d.atkDir}, recoil or impact` },
    { row: 3, col: 4, anim: 'attack', desc: `${d.facing}. Attack frame 4: recovery, returning to idle stance` },
    // Row 4: Death (4프레임 — 방향 무관, 그 자리에서 쓰러짐)
    { row: 4, col: 1, anim: 'death',  desc: `${d.facing}. Death frame 1: hit reaction, staggering from impact` },
    { row: 4, col: 2, anim: 'death',  desc: `${d.facing}. Death frame 2: losing balance, knees buckling` },
    { row: 4, col: 3, anim: 'death',  desc: `${d.facing}. Death frame 3: falling, body nearly horizontal` },
    { row: 4, col: 4, anim: 'death',  desc: `${d.facing}. Death frame 4: fully collapsed on ground, motionless` },
  ];
}

// ─── 단일 프레임 API 생성 ─────────────────────────────────────────────────────
async function generateFrame(unitDesc, frameDesc) {
  const prompt = [
    `Single frame pixel art game sprite. Subject: ${unitDesc}.`,
    `Pose/action: ${frameDesc}.`,
    `Full body always visible. Subject centered horizontally. Feet at bottom-center of image. Body height 80% of image height.`,
    `SOLID bright lime green background, uniform flat color. Absolutely NO text, NO labels, NO numbers, NO watermark, NO other objects.`,
    `16-bit SNES pixel art style. Clean sharp pixels. Vibrant saturated colors. Professional mobile RTS game asset.`,
  ].join(' ');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        instances:  [{ prompt }],
        parameters: { sampleCount: 1, outputOptions: { mimeType: 'image/jpeg' }, aspectRatio: '1:1' },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API 오류 ${res.status}: ${err}`);
  }
  const data = await res.json();
  if (!data.predictions?.length) throw new Error('결과 없음');
  return Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
}

// ─── 16프레임 → 4×4 합성 ─────────────────────────────────────────────────────
const CELL_SIZE = 256;
const COLS = 4, ROWS = 4;

async function compositeFrames(frameBuffers) {
  const composites = await Promise.all(
    frameBuffers.map(async (buf, i) => {
      const { data, info } = await sharp(buf)
        .resize(CELL_SIZE, CELL_SIZE, { fit: 'cover' })
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      // 흰색 계열 픽셀 → 라임 그린으로 교체
      for (let p = 0; p < data.length; p += 4) {
        if (data[p] > 200 && data[p + 1] > 200 && data[p + 2] > 200) {
          data[p] = 0; data[p + 1] = 255; data[p + 2] = 0; data[p + 3] = 255;
        }
      }
      const processed = await sharp(data, {
        raw: { width: info.width, height: info.height, channels: 4 },
      }).jpeg().toBuffer();

      return { input: processed, left: (i % COLS) * CELL_SIZE, top: Math.floor(i / COLS) * CELL_SIZE };
    })
  );

  return sharp({
    create: { width: CELL_SIZE * COLS, height: CELL_SIZE * ROWS, channels: 3, background: { r: 0, g: 255, b: 0 } },
  }).composite(composites).jpeg({ quality: 95 }).toBuffer();
}

// ─── 방향 1개 생성 ────────────────────────────────────────────────────────────
async function generateDirection(unitType, unitDesc, dir, outputDir) {
  const frames = getFrameDefinitions(dir);
  const label  = DIRECTIONS[dir].label;
  const outFile = path.join(outputDir, `${unitType}_${dir}.jpeg`);

  console.log(`\n  📐 방향: ${dir} (${label}) — 16프레임 생성 중`);

  const frameBuffers = [];
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    process.stdout.write(`    [${String(i + 1).padStart(2)}/16] ${f.anim} R${f.row}C${f.col} ...`);
    try {
      frameBuffers.push(await generateFrame(unitDesc, f.desc));
      console.log(' ✅');
    } catch (err) {
      console.log(' ❌');
      throw err;
    }
    if (i < frames.length - 1) await new Promise(r => setTimeout(r, 400));
  }

  console.log(`    🔧 합성 중...`);
  const buf = await compositeFrames(frameBuffers);
  fs.writeFileSync(outFile, buf);

  console.log(`    💾 저장: ${outFile}`);
  return outFile;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────────
async function main() {
  const unitType  = process.argv[2];
  const dirFilter = process.argv[3]?.toUpperCase(); // 특정 방향만 생성 시

  if (!unitType || !UNIT_DESCRIPTIONS[unitType]) {
    console.error(`❌ 유닛 타입을 지정하세요. 사용 가능: ${Object.keys(UNIT_DESCRIPTIONS).join(', ')}`);
    console.error(`   예) node scripts/generate_spritesheet.mjs infantry`);
    process.exit(1);
  }
  if (dirFilter && !DIRECTIONS[dirFilter]) {
    console.error(`❌ 유효하지 않은 방향: ${dirFilter}. 사용 가능: ${Object.keys(DIRECTIONS).join(', ')}`);
    process.exit(1);
  }

  const unitDesc   = UNIT_DESCRIPTIONS[unitType];
  const targetDirs = dirFilter ? [dirFilter] : Object.keys(DIRECTIONS);

  // 출력 폴더: public/assets/units/<unitType>/
  const outputDir = path.join(__dirname, '..', 'public', 'assets', 'units', unitType);
  fs.mkdirSync(outputDir, { recursive: true });

  console.log(`\n🎨 [${unitType}] 8방향 스프라이트 시트 생성`);
  console.log(`📁 출력 폴더: ${outputDir}`);
  console.log(`📐 규격: 1024×1024px (4×4 그리드, 셀당 256×256px)`);
  console.log(`🗂️  생성할 방향: ${targetDirs.join(', ')} (W/NW/SW는 Phaser flipX 처리)`);

  const results = [];
  for (const dir of targetDirs) {
    try {
      const file = await generateDirection(unitType, unitDesc, dir, outputDir);
      results.push({ dir, file, ok: true });
    } catch (err) {
      console.error(`\n  ❌ ${dir} 방향 실패: ${err.message}`);
      results.push({ dir, ok: false });
    }
  }

  // ─── 결과 요약 ───────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log(`✅ 완료 — ${unitType} 스프라이트 시트`);
  console.log('═'.repeat(60));
  results.forEach(r => {
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.dir.padEnd(3)} → ${r.ok ? path.basename(r.file) : '실패'}`);
  });

  console.log(`
📋 Phaser 로드 코드:
─────────────────────────────────────────────────
// LoadingScene.ts preload()
const base = import.meta.env.BASE_URL;
${targetDirs.filter(d => results.find(r => r.dir === d)?.ok).map(d =>
  `this.load.spritesheet('${unitType}_${d}', \`\${base}assets/units/${unitType}/${unitType}_${d}.jpeg\`, { frameWidth: 256, frameHeight: 256 });`
).join('\n')}

📋 방향 판별 → 스프라이트 키 선택 (Phaser):
─────────────────────────────────────────────────
// angle: Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y) (라디안)
// degrees: Phaser.Math.RadToDeg(angle) → -180 ~ 180
//
//  -22.5 ~ 22.5   → '${unitType}_E'           (flipX: false)
//  22.5  ~ 67.5   → '${unitType}_NE'          (flipX: false)
//  67.5  ~ 112.5  → '${unitType}_N'           (flipX: false)
//  112.5 ~ 157.5  → '${unitType}_NE'          (flipX: true  ← NW)
//  157.5 ~ 180    → '${unitType}_E'           (flipX: true  ← W)
// -180  ~-157.5  → '${unitType}_E'           (flipX: true  ← W)
// -157.5~-112.5  → '${unitType}_SE'          (flipX: true  ← SW)
//  -112.5~ -67.5  → '${unitType}_S'           (flipX: false)
//  -67.5 ~ -22.5  → '${unitType}_SE'          (flipX: false)
`);
}

main().catch(err => { console.error(err); process.exit(1); });
