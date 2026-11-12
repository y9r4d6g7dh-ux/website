/**
 * Small unique id. `crypto.randomUUID` is unavailable on plain-http LAN
 * origins (e.g. testing from a phone), so we don't depend on it.
 */
let counter = 0;
export function uid(): string {
  counter = (counter + 1) % 1296;
  return (
    Date.now().toString(36) +
    counter.toString(36).padStart(2, "0") +
    Math.random().toString(36).slice(2, 8)
  );
}
