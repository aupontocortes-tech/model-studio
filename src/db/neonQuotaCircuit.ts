/** Circuito: se Neon estourar cota, evita esperar 9s+ em toda request. */

let neonQuotaUntil = 0;

export function markNeonQuotaHit(ms = 10 * 60 * 1000) {
  neonQuotaUntil = Date.now() + ms;
}

export function isNeonQuotaCircuitOpen() {
  return Date.now() < neonQuotaUntil;
}

export function clearNeonQuotaCircuit() {
  neonQuotaUntil = 0;
}
