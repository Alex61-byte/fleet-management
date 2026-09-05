/** Free OSM Nominatim address assist (client-only). */
export type NominatimResult = {
  display_name: string;
};

const USER_AGENT = "FleetManagement/0.1 (local-dev; contact@fleet.example)";

export async function searchAddress(query: string, signal?: AbortSignal): Promise<NominatimResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("q", q);
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal,
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { display_name?: string }[];
  return data
    .filter((r) => typeof r.display_name === "string" && r.display_name.length > 0)
    .map((r) => ({ display_name: r.display_name! }));
}
