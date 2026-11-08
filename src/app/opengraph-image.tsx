import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

/** 카카오톡·슬랙 같은 곳에 링크를 붙였을 때 보이는 미리보기 이미지예요. 빌드 때 한 번 만들어져요. */
export const runtime = "nodejs";
export const alt = `${SITE.name} · ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#194c32";
const PEN = "#d23a2b";
const PAPER = "#f1f6f3";
const RULE = "#d9e2dd";
const PASS = "#2e7d5b";

export default async function Image() {
  const pretendard = await readFile(join(process.cwd(), "src/assets/Pretendard-Bold.otf"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: PAPER,
          fontFamily: "Pretendard",
          color: INK,
          padding: 64,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#ffffff",
            border: `2px solid ${RULE}`,
            borderRadius: 28,
            padding: "56px 64px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 72,
                height: 72,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: PEN,
                borderRadius: 14,
                color: "#fff",
                fontSize: 24,
                lineHeight: 1.1,
              }}
            >
              <span>합</span>
              <span>격</span>
            </div>
            <span style={{ fontSize: 44, letterSpacing: -1 }}>{SITE.name}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            {/* 줄바꿈 위치를 직접 정해요. 자동 줄바꿈은 쉼표만 다음 줄로 넘기는 경우가 있어요. */}
            <div style={{ display: "flex", flexDirection: "column", fontSize: 60, lineHeight: 1.2, letterSpacing: -1.5 }}>
              <span>지원하는 회사의 기준으로 서류를 고치고,</span>
              <span>그 회사 면접관과 연습해요.</span>
            </div>
            <div style={{ fontSize: 28, color: "#6f7471", lineHeight: 1.4, wordBreak: "keep-all" }}>
              회사 리서치 · 맞춤 자기소개서 · 회사 기준 채점 · 꼬리질문 모의 면접
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 22, color: "#6f7471" }}>{SITE.url.replace(/^https?:\/\//, "")}</span>
            {/* 앱 안의 점수 도장과 같은 규칙: 80점 이상은 초록 '합격권'. */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: 156,
                height: 156,
                borderRadius: 999,
                border: `6px solid ${PASS}`,
                color: PASS,
                transform: "rotate(-12deg)",
                lineHeight: 1,
              }}
            >
              <span style={{ fontSize: 58 }}>86</span>
              <span style={{ fontSize: 20, marginTop: 6 }}>합격권</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Pretendard", data: pretendard, weight: 700, style: "normal" }] },
  );
}
