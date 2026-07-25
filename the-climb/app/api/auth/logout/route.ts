import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

export async function POST(req: Request) {
  await clearSession();
  // 303 forces the browser to follow with GET. A default 307 would re-POST to /login and 405.
  return NextResponse.redirect(new URL("/login", req.url), 303);
}
