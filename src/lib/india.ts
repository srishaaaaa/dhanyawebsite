export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
] as const;

export const PINCODE_RE = /^[1-9][0-9]{5}$/;
/** Indian mobile: optional +91 / 0 prefix, then 10 digits starting 6–9. */
export const MOBILE_RE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/;
export function normaliseMobile(v: string) {
  const d = v.replace(/\D/g, "");
  return d.slice(-10);
}
