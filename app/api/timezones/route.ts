import { NextResponse } from 'next/server';

/**
 * GET /api/timezones
 * Retourne la liste des timezones IANA supportées
 */
export async function GET() {
  const timezones = [
    { id: 'UTC', label: 'UTC / GMT (Coordinated Universal Time)' },
    { id: 'Europe/Paris', label: 'France (Paris)' },
    { id: 'Europe/London', label: 'United Kingdom (London)' },
    { id: 'Europe/Berlin', label: 'Germany (Berlin)' },
    { id: 'Europe/Amsterdam', label: 'Netherlands (Amsterdam)' },
    { id: 'America/New_York', label: 'USA (New York - EST)' },
    { id: 'America/Chicago', label: 'USA (Chicago - CST)' },
    { id: 'America/Denver', label: 'USA (Denver - MST)' },
    { id: 'America/Los_Angeles', label: 'USA (Los Angeles - PST)' },
    { id: 'America/Toronto', label: 'Canada (Toronto - EST)' },
    { id: 'America/Mexico_City', label: 'Mexico (Mexico City)' },
    { id: 'America/Sao_Paulo', label: 'Brazil (São Paulo)' },
    { id: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
    { id: 'Asia/Shanghai', label: 'China (Shanghai)' },
    { id: 'Asia/Hong_Kong', label: 'Hong Kong' },
    { id: 'Asia/Singapore', label: 'Singapore' },
    { id: 'Asia/Bangkok', label: 'Thailand (Bangkok)' },
    { id: 'India/Kolkata', label: 'India (Kolkata)' },
    { id: 'Asia/Dubai', label: 'United Arab Emirates (Dubai)' },
    { id: 'Asia/Istanbul', label: 'Turkey (Istanbul)' },
    { id: 'Australia/Sydney', label: 'Australia (Sydney)' },
    { id: 'Australia/Melbourne', label: 'Australia (Melbourne)' },
    { id: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
    { id: 'Africa/Cairo', label: 'Egypt (Cairo)' },
    { id: 'Africa/Johannesburg', label: 'South Africa (Johannesburg)' },
    { id: 'Africa/Lagos', label: 'Nigeria (Lagos)' },
  ];

  return NextResponse.json({
    success: true,
    timezones,
  });
}
