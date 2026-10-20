import {NextRequest,NextResponse} from 'next/server';
import {createSession,findSession} from '@/lib/shop-server';
import {appOrigin,startKakao} from '@/lib/providers';
export const runtime='nodejs';
export async function GET(req:NextRequest){try{let s=await findSession(req.cookies.get('onepiece-session')?.value);let token:string|undefined;if(!s){const fresh=await createSession();s=fresh.session;token=fresh.token;}const response=NextResponse.redirect(await startKakao(s));if(token)response.cookies.set('onepiece-session',token,{httpOnly:true,sameSite:'lax',secure:appOrigin().startsWith('https:'),maxAge:30*86400,path:'/'});return response;}catch{return NextResponse.redirect(appOrigin()+'/login?error=kakao_config');}}
