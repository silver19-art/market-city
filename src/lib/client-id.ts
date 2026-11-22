/** An anonymous id for this browser, so each player counts once in the comparisons. */
export function clientId() {
  try {
    let id = window.localStorage.getItem("market-city-client");
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem("market-city-client", id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
