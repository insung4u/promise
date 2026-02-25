import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 이 스크립트를 실행하려면 터미널에서 다음 명령어를 실행하세요:
// node scripts/generate_sprite.mjs "원하는 프롬프트" "저장할파일명"
// (별도의 npm 패키지 설치가 필요 없습니다! Node.js v18 이상 권장)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env 파일 수동 파싱 (의존성 최소화)
const envPath = path.join(__dirname, '..', '.env');
let apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/GEMINI_API_KEY=["']?([^"'\r\n]+)["']?/);
    if (match) apiKey = match[1];
}

if (!apiKey || apiKey === "여기에_API_키를_입력하세요") {
    console.error("❌ 오류: .env 파일에 올바른 GEMINI_API_KEY가 설정되지 않았습니다.");
    console.error("https://aistudio.google.com/api-keys 에서 발급받은 키를 .env 에 넣어주세요.");
    process.exit(1);
}

async function generateSprite() {
    const userPrompt = process.argv[2] || "A highly detailed pixel art sprite sheet of a futuristic cyberpunk space marine, top-down isometric view. Features a walk cycle and shooting animation. Arranged in a 4x4 grid. Clean edges, vibrant neon blue and dark grey armor. Solid white background for easy transparency removal. Professional indie game asset, sharp focus";
    const outputFileName = process.argv[3] || "cyberpunk_marine.jpeg";

    console.log(`\n🎨 Google AI Pro (Imagen 3)를 통해 스프라이트 생성을 시작합니다...`);
    console.log(`📝 프롬프트: ${userPrompt}`);
    console.log(`⏳ 잠시만 기다려주세요 (최대 1~2분 소요될 수 있습니다)...\n`);

    try {
        // Imagen 3 API 엔드포인트 호출
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                instances: [{ prompt: userPrompt }],
                parameters: {
                    sampleCount: 1,
                    outputOptions: { mimeType: "image/jpeg" },
                    aspectRatio: "1:1"
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API 통신 에러: ${response.status} ${response.statusText}\n${errBody}`);
        }

        const data = await response.json();

        if (!data.predictions || data.predictions.length === 0) {
            throw new Error("결과 이미지를 반환받지 못했습니다.");
        }

        // Base64 인코딩된 이미지 데이터 파싱
        const base64Image = data.predictions[0].bytesBase64Encoded;

        // 파일명 검증 및 확장자 기본값(.jpeg) 보장
        let finalPath = outputFileName;
        if (!finalPath.match(/\.(jpg|jpeg|png)$/i)) {
            finalPath += '.jpeg';
        }

        // 사용자가 입력한 경로(예: "units/infantry.jpeg")를 파싱해 실제 저장 폴더 계산
        const fullOutputPath = path.join(__dirname, '..', 'public', 'assets', finalPath);
        const targetDir = path.dirname(fullOutputPath);

        // 프로젝트의 public/assets 내부의 하위 폴더까지 안전하게 생성
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 최종 파일 저장
        fs.writeFileSync(fullOutputPath, base64Image, 'base64');

        console.log(`✅ 생성 완료! 이미지가 성공적으로 저장되었습니다.`);
        console.log(`📁 저장 위치: ${fullOutputPath}`);
        console.log(`\n게임을 켜서 새 에셋을 확인해보세요!`);

    } catch (error) {
        console.error("\n❌ 이미지 생성 중 오류가 발생했습니다:");
        console.error(error.message);
    }
}

generateSprite();
