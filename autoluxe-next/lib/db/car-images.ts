import { db, carImagesTable } from "./index";
import { eq, inArray, asc } from "drizzle-orm";

export async function getGalleryUrlsByCarIds(carIds: number[]): Promise<Map<number, string[]>> {
  if (carIds.length === 0) return new Map();
  const rows = await db
    .select()
    .from(carImagesTable)
    .where(inArray(carImagesTable.carId, carIds))
    .orderBy(asc(carImagesTable.carId), asc(carImagesTable.sortOrder));

  const map = new Map<number, string[]>();
  for (const r of rows) {
    const list = map.get(r.carId) ?? [];
    list.push(r.url);
    map.set(r.carId, list);
  }
  return map;
}

export async function getGalleryUrlsForCar(carId: number): Promise<string[]> {
  const rows = await db
    .select()
    .from(carImagesTable)
    .where(eq(carImagesTable.carId, carId))
    .orderBy(asc(carImagesTable.sortOrder));
  return rows.map((r) => r.url);
}

/** Replace all gallery rows for a car. Empty list clears gallery only. */
export async function replaceCarGallery(carId: number, urls: string[]) {
  await db.delete(carImagesTable).where(eq(carImagesTable.carId, carId));
  const cleaned = urls.map((u) => u.trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  await db.insert(carImagesTable).values(
    cleaned.map((url, sortOrder) => ({ carId, url, sortOrder }))
  );
}
