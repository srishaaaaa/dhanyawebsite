// Responsive image URLs. Cloudinary URLs get f_auto,q_auto + width transforms; others pass through.
const CLD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.*)$/;

export function imgUrl(url: string, width: number) {
  const m = url.match(CLD);
  if (!m) return url;
  return `${m[1]}f_auto,q_auto,c_limit,w_${width}/${m[2]}`;
}

export function imgSrcSet(url: string, widths = [400, 640, 960, 1280, 1800]) {
  if (!CLD.test(url)) return undefined;
  return widths.map((w) => `${imgUrl(url, w)} ${w}w`).join(", ");
}
