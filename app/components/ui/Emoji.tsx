import { memo } from "react";

/**
 * Twemoji SVG renderer — same modern emoji set on every device (Apple, Windows, Android, Linux).
 * Uses jsDelivr CDN: https://github.com/jdecked/twemoji
 */

// Convert an emoji string to its Twemoji codepoint filename (handles surrogate pairs & ZWJ).
// Strips the FE0F variation selector (Twemoji's filenames omit it for most glyphs).
function toCodepoint(emoji: string): string {
  const codepoints: string[] = [];
  for (const char of emoji) {
    const cp = char.codePointAt(0);
    if (cp === undefined) continue;
    if (cp === 0xfe0f) continue; // variation selector
    codepoints.push(cp.toString(16));
  }
  return codepoints.join("-");
}

interface EmojiProps {
  emoji: string;
  /** Accessible label. If omitted the emoji is treated as decorative. */
  label?: string;
  className?: string;
  /** Pixel size of the rendered SVG. Defaults to 1em via CSS. */
  size?: number | string;
}

const BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg";

export const Emoji = memo(function Emoji({
  emoji,
  label,
  className,
  size,
}: EmojiProps) {
  const code = toCodepoint(emoji);
  const src = `${BASE}/${code}.svg`;
  const style =
    size !== undefined
      ? { width: typeof size === "number" ? `${size}px` : size, height: typeof size === "number" ? `${size}px` : size }
      : { width: "1em", height: "1em" };

  return (
    <img
      src={src}
      alt={label ?? ""}
      role={label ? "img" : "presentation"}
      aria-hidden={label ? undefined : true}
      draggable={false}
      loading="lazy"
      className={`inline-block align-[-0.125em] select-none ${className ?? ""}`}
      style={style}
      onError={(e) => {
        // Fallback: hide broken image and let parent text show the unicode emoji
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
});

export default Emoji;
