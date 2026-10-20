import {NextResponse} from 'next/server';
export async function GET(){return NextResponse.json({error:'Local experiment storage was removed. Use your configured GA4 property.'},{status:410});}
