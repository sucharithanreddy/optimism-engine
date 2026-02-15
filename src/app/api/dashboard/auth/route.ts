import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limit';
import { validatePassword } from '@/lib/input-validation';
import crypto from 'crypto';

// Session token store (use Redis in production)
const sessionTokens = new Map<string, { createdAt: number; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [token, data] of sessionTokens.entries()) {
      if (data.expiresAt < now) {
        sessionTokens.delete(token);
      }
    }
  }, 5 * 60 * 1000);
}

// Session duration: 24 hours
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP to prevent brute force
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, 'dashboard');

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', retryAfter: rateLimit.retryAfter },
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
          }
        }
      );
    }

    const body = await request.json();
    const { password } = body;

    // Validate password input
    const validation = validatePassword(password);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check password using timing-safe comparison
    const dashboardPassword = process.env.DASHBOARD_PASSWORD;
    
    if (!dashboardPassword) {
      console.error('DASHBOARD_PASSWORD environment variable not set');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Timing-safe comparison to prevent timing attacks
    const passwordBuffer = Buffer.from(password, 'utf-8');
    const expectedBuffer = Buffer.from(dashboardPassword, 'utf-8');
    
    // Use length of expected password to prevent length leaks
    if (passwordBuffer.length !== expectedBuffer.length) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const isValid = crypto.timingSafeEqual(passwordBuffer, expectedBuffer);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Generate session token
    const token = generateSessionToken();
    const now = Date.now();

    sessionTokens.set(token, {
      createdAt: now,
      expiresAt: now + SESSION_DURATION_MS,
    });

    // Set secure HTTP-only cookie
    const response = NextResponse.json({ success: true });
    
    response.cookies.set('dashboard_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_DURATION_MS / 1000,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Dashboard auth error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

// Verify session token
export function verifyDashboardSession(token: string | undefined): boolean {
  if (!token) return false;

  const session = sessionTokens.get(token);
  if (!session) return false;

  if (session.expiresAt < Date.now()) {
    sessionTokens.delete(token);
    return false;
  }

  return true;
}

// DELETE - logout
export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('dashboard_session')?.value;
  
  if (token) {
    sessionTokens.delete(token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('dashboard_session');
  
  return response;
}
