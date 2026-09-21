import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple in-memory rate limiter per IP address
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests/min

const ipRequestMap = new Map<string, { count: number; resetTime: number }>();

// Cleanup stale IP entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRequestMap.entries()) {
    if (now > record.resetTime) {
      ipRequestMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export function middleware(request: NextRequest) {
  // Only apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // On Vercel, x-real-ip is set by the platform and cannot be spoofed by the
    // client. x-forwarded-for may carry client-supplied entries, so trust only
    // the LAST entry (the one the platform appends), never the first.
    const ip =
      request.headers.get("x-real-ip") ||
      request.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
      "127.0.0.1";

    const now = Date.now();
    const current = ipRequestMap.get(ip);

    if (!current || now > current.resetTime) {
      ipRequestMap.set(ip, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });

      const res = withSecurityHeaders(NextResponse.next());
      res.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
      res.headers.set("X-RateLimit-Remaining", String(MAX_REQUESTS_PER_WINDOW - 1));
      return res;
    }

    if (current.count >= MAX_REQUESTS_PER_WINDOW) {
      const res = NextResponse.json(
        { error: "Too many requests. Please slow down." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(MAX_REQUESTS_PER_WINDOW),
            "X-RateLimit-Remaining": "0",
            "Retry-After": String(Math.ceil((current.resetTime - now) / 1000)),
          },
        }
      );
      return withSecurityHeaders(res);
    }

    current.count++;
    const res = withSecurityHeaders(NextResponse.next());
    res.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS_PER_WINDOW));
    res.headers.set(
      "X-RateLimit-Remaining",
      String(MAX_REQUESTS_PER_WINDOW - current.count)
    );
    return res;
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/api/:path*"],
};
