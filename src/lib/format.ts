export const usd = (n: number, cents = false) =>
  (n < 0 ? "−" : "") +
  "$" +
  Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

export const pct = (n: number, digits = 1, sign = true) => `${sign && n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n * 100).toFixed(digits)}%`;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (ym: string, long = false) => {
  const [y, m] = ym.split("-").map(Number);
  return long ? `${["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m - 1]} ${y}` : `${MONTHS[m - 1]} ${y}`;
};

export const price = (n: number) => (n >= 1000 ? usd(n) : usd(n, true));
/** Industry eras trade an index that starts at 100, not a dollar share price. */
export const level = (n: number, isIndex = false) => (isIndex ? n.toFixed(1) : price(n));
