import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const method = request.method;
  const path = request.nextUrl.pathname;
  
  // Get time in HH:MM:SS format
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  // ANSI colors
  const colors: Record<string, string> = {
    GET: '\x1b[32m',    // Green
    POST: '\x1b[34m',   // Blue
    PUT: '\x1b[33m',    // Yellow
    DELETE: '\x1b[31m', // Red
  };
  const color = colors[method] || '\x1b[0m';
  const reset = '\x1b[0m';
  const gray = '\x1b[90m';
  
  console.log(`  ${gray}[${ts}]${reset} ${color}${method.padEnd(6)}${reset} ${path}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sessiof-logo.png, etc.
     */
    '/((?!_next/static|_next/image|favicon.ico|sessiof-logo.png|.*\\.png|.*\\.ico).*)',
  ],
};
