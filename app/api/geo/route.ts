import {NextResponse} from 'next/server';
export const dynamic = 'force-dynamic';import {query} from '@/lib/db';export async function GET(){const provinces=await query('SELECT id,name FROM provinces ORDER BY name');const cities=await query('SELECT id,name,province_id FROM cities ORDER BY name');return NextResponse.json({provinces,cities})}
