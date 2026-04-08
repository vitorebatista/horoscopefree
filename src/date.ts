// UTC date helpers shared between the service layer and the HTTP server.
// Both functions return a YYYY-MM-DD string in UTC. They are kept here (and
// not in service.ts) so server.ts can use them without importing through the
// service barrel — keeps the dependency direction shallow.

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayUtc(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
