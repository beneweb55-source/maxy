import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const imed = await prisma.user.findFirst({
      where: { username: { equals: "imed", mode: "insensitive" } },
    });
    
    if (!imed) {
      return NextResponse.json({ success: false, error: "Imed not found" });
    }
    
    const update = await prisma.user.updateMany({
      where: { username: { in: ["samy", "raouf"], mode: "insensitive" } },
      data: { role: imed.role },
    });
    
    return NextResponse.json({ success: true, count: update.count, role: imed.role });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
