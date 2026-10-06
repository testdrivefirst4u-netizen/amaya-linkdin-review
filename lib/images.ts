// Client-safe helpers for ImageKit URLs.

/** Resized copy via ImageKit URL transforms, e.g. thumb(url, 200, 200). */
export function thumb(url: string, w: number, h?: number) {
  const tr = [`w-${w}`, h ? `h-${h}` : "", h ? "fo-auto" : ""].filter(Boolean).join(",");
  return `${url}${url.includes("?") ? "&" : "?"}tr=${tr}`;
}
