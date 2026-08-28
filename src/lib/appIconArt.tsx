/** Arte compartilhada dos ícones PWA (icon.tsx / apple-icon.tsx). */

type IconArtProps = {
  size: number;
};

export function AppIconArt({ size }: IconArtProps) {
  const radius = Math.round(size * 0.22);
  const fontSize = Math.round(size * 0.38);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #9d7bff 0%, #6d4aff 42%, #4526d4 100%)",
        borderRadius: radius,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: size * 0.08,
          right: size * 0.1,
          width: size * 0.14,
          height: size * 0.14,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: size * 0.12,
          left: size * 0.12,
          width: size * 0.08,
          height: size * 0.08,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.22)",
        }}
      />
      <div
        style={{
          fontSize,
          fontWeight: 800,
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: "-0.06em",
          lineHeight: 1,
          textShadow: "0 4px 18px rgba(30,10,90,0.35)",
        }}
      >
        M
      </div>
    </div>
  );
}
