import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { activityLog } from "@/lib/schema"
import { desc } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const entries = await db
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt))
    .limit(50)

  return NextResponse.json({ entries })
}
