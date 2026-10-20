import {NextRequest,NextResponse} from 'next/server';
import {findSession} from '@/lib/shop-server';
import {appOrigin,finishKakao} from '@/lib/providers';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{const s=await findSession(req.cookies.get('onepiece-session')?.value);if(!s)throw new Error('Session expired');const result=await finishKakao(s,req.nextUrl.searchParams.get('state')||'',req.nextUrl.searchParams.get('code')||'');const response=NextResponse.redirect(appOrigin()+'/join');response.cookies.set('onepiece-session',result.token,{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:'),maxAge:30*86400,path:'/'});return response;}catch{return NextResponse.redirect(appOrigin()+'/login?error=kakao_failed');}}
