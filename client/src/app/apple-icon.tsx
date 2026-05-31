import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a1830, #040404)",
        }}
      >
        {/* orbit ring */}
        <div
          style={{
            position: "absolute",
            width: 132,
            height: 58,
            borderRadius: 9999,
            border: "12px solid #5aa2fa",
            transform: "rotate(-30deg)",
          }}
        />
        {/* body */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 9999,
            background: "#ffffff",
          }}
        />
      </div>
    ),
    { ...size },
  );
}
