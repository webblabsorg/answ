import { NextResponse } from 'next/server'

// No-op analytics endpoint to avoid 404s from web-vitals beacons during dev
export async function POST() {
  return new NextResponse(null, { status: 204 })
}
