import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { buildExportCsv } from "@/lib/admin/export-csv";
import { EXPORT_DATASETS, type ExportDataset } from "@/lib/admin/export-datasets";
import { csvWithBom } from "@/lib/csv";

const VALID = new Set(EXPORT_DATASETS.map((d) => d.id));

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const dataset = req.nextUrl.searchParams.get("dataset") as ExportDataset | null;
    if (!dataset || !VALID.has(dataset)) {
      return NextResponse.json(
        { error: "Invalid dataset", valid: [...VALID] },
        { status: 400 }
      );
    }

    const meta = EXPORT_DATASETS.find((d) => d.id === dataset)!;
    const csv = csvWithBom(await buildExportCsv(dataset));
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${meta.filename}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
