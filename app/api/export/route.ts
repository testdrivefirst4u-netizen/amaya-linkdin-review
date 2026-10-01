import ExcelJS from "exceljs";
import { getPosts, getReviews } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/config";
import { displayDate, formatTimestamp } from "@/lib/format";
import { fail, handleError } from "@/lib/http";
import type { Post, Review } from "@/lib/types";

export const dynamic = "force-dynamic";

const COLUMNS: { header: string; width: number; value: (p: Post, r?: Review) => string | number }[] = [
  { header: "Post ID", width: 10, value: (p) => p.postId },
  { header: "Date", width: 13, value: (p) => displayDate(p.date) },
  { header: "Channel", width: 14, value: (p) => (p.channel === "company" ? "Company page" : "Founder") },
  { header: "Founder / Pillar", width: 24, value: (p) => (p.channel === "company" ? p.pillar ?? "" : p.founder ?? "") },
  { header: "Focus / Week", width: 18, value: (p) => (p.channel === "company" ? `Week ${p.week}` : p.focus ?? "") },
  { header: "Topic", width: 48, value: (p) => p.topic },
  { header: "Hook", width: 60, value: (p) => p.hook },
  { header: "Status", width: 16, value: (p, r) => STATUS_LABEL[r?.status ?? "pending"] },
  { header: "Reviewed by", width: 18, value: (_p, r) => r?.reviewer ?? "" },
  { header: "Feedback", width: 60, value: (_p, r) => r?.feedback ?? "" },
  { header: "Remarks", width: 50, value: (_p, r) => r?.remarks ?? "" },
  { header: "Last saved (IST)", width: 20, value: (_p, r) => (r ? formatTimestamp(r.updatedAt) : "") },
  { header: "Post copy", width: 80, value: (p) => p.copy },
  { header: "Hashtags", width: 36, value: (p) => p.hashtags },
  { header: "Source / tag", width: 50, value: (p) => p.source },
];

const STATUS_FILL: Record<string, string> = { approved: "FFE4F1E6", rejected: "FFF8E3DE", pending: "FFEFEDE8" };

function csvCell(v: string | number) {
  return `"${String(v).replace(/"/g, '""')}"`;
}

// GET /api/export?format=xlsx|csv&channel=company|founder&status=pending|approved|rejected
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const format = url.searchParams.get("format") || "xlsx";
    const channel = url.searchParams.get("channel");
    const status = url.searchParams.get("status");
    if (!["xlsx", "csv"].includes(format)) return fail("Format must be xlsx or csv.");

    const [posts, reviews] = await Promise.all([getPosts(), getReviews()]);
    const byId = new Map(reviews.map((r) => [r.postId, r]));
    const rows = posts
      .filter((p) => !channel || p.channel === channel)
      .filter((p) => !status || (byId.get(p.postId)?.status ?? "pending") === status);

    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `Amaya_LinkedIn_Reviews_${stamp}.${format}`;

    if (format === "csv") {
      const lines = [COLUMNS.map((c) => csvCell(c.header)).join(",")];
      for (const p of rows) lines.push(COLUMNS.map((c) => csvCell(c.value(p, byId.get(p.postId)))).join(","));
      return new Response("﻿" + lines.join("\r\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = "BroaddCast";
    const ws = wb.addWorksheet("Founder reviews", { views: [{ state: "frozen", ySplit: 1, xSplit: 2 }] });
    ws.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" }, name: "Calibri" };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B2A41" } };
    head.alignment = { vertical: "middle" };
    head.height = 24;

    for (const p of rows) {
      const r = byId.get(p.postId);
      const row = ws.addRow(COLUMNS.map((c) => c.value(p, r)));
      row.alignment = { vertical: "top", wrapText: true };
      const statusCell = row.getCell(8);
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STATUS_FILL[r?.status ?? "pending"] } };
      statusCell.font = { bold: true };
    }
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

    const buf = await wb.xlsx.writeBuffer();
    return new Response(buf as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
