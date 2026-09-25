import logoAsset from "../assets/logo.webp";

export function getBrandLogoUrl(): string {
  if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
    try {
      return chrome.runtime.getURL("logo.webp");
    } catch {
      // Fallback in non-extension contexts (e.g. tests)
    }
  }
  return logoAsset;
}

interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
  style?: React.CSSProperties;
}

export function BrandLogo({
  size = 24,
  className = "",
  alt = "Workit",
  style,
}: BrandLogoProps) {
  const src = getBrandLogoUrl();

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`workit-brand-logo-img ${className}`}
      data-testid="workit-brand-logo-img"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        borderRadius: "6px",
        display: "inline-block",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
