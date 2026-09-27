import { NextResponse, type NextRequest } from "next/server";

// Per-IP rate limit for /api/*. In-memory, so it's per serverless instance: a speed bump, not a hard cap.
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const hits = new Map<string, { count: number; reset: number }>();

function rateLimited(req: NextRequest): NextResponse | null {
  // x-real-ip is set by Vercel. Clients can prepend to x-forwarded-for, so only trust its LAST entry.
  const ip = req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() || "local";
  const now = Date.now();
  if (hits.size > 10_000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);

  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + WINDOW_MS });
    return null;
  }
  if (++entry.count <= MAX_REQUESTS) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(Math.ceil((entry.reset - now) / 1000)) } }
  );
}

function csp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    // Only scripts carrying this request's nonce (and what they load) may run.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function middleware(req: NextRequest) {
  const limited = req.nextUrl.pathname.startsWith("/api/") ? rateLimited(req) : null;

  const nonce = btoa(crypto.randomUUID());
  const policy = csp(nonce);
  // Next.js reads the nonce from the request's CSP header and stamps it on its own scripts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", policy);

  const res = limited ?? NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", policy);
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  return res;
}

export const config = {
  // Everything except static build assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
