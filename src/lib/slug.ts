export function slugify(input: string) {
  return input
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
