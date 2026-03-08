import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'resume-builder',
      env: process.env.NODE_ENV ?? 'development',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
