import {NextResponse} from 'next/server';
export function GET(){return NextResponse.json({error:'Social sign-in is no longer available. Please use /login.'},{status:410,headers:{'Cache-Control':'no-store'}});}
