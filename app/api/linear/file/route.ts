import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    requireAuth();
    const { searchParams } = new URL(req.url);
    const rawUrl = searchParams.get("url");
    if (!rawUrl) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    const parsed = new URL(rawUrl);
    if (parsed.hostname !== "uploads.linear.app") {
      return NextResponse.json({ error: "Invalid host" }, { status: 400 });
    }

    const res = await fetch(parsed.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.LINEAR_API_KEY || ""}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await res.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
