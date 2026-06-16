import { NextResponse } from 'next/server';
import { Agent } from 'undici';

export const maxDuration = 30;

const agent = new Agent({
  connect: { ciphers: 'DEFAULT:!DH:!DHE:!EDH:!EXPORT', honorCipherOrder: true },
});

const BASE = 'https://www.gameone.kr';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

async function login(): Promise<string> {
  const lpRes = await fetch(`${BASE}/member/login`, {
    // @ts-ignore
    dispatcher: agent, headers: HEADERS, signal: AbortSignal.timeout(15000),
  });
  const lpHtml = await lpRes.text();
  const loginToken = lpHtml.match(/name="login_token"\s+value="([^"]+)"/)?.[1] ?? '';
  const sess0 = lpRes.headers.get('set-cookie')?.match(/PHPSESSID=([^;]+)/)?.[1] ?? '';

  const body = new URLSearchParams({
    login_token: loginToken, return_url: 'https%3A%2F%2Fwww.gameone.kr%2F',
    isPop: 'F', user_id: process.env.GAMEONE_USER_ID ?? '',
    passwd: process.env.GAMEONE_PASSWD ?? '', save_id: '',
  });
  const loginRes = await fetch(`${BASE}/member/exec/login`, {
    method: 'POST',
    // @ts-ignore
    dispatcher: agent,
    headers: { ...HEADERS, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': `PHPSESSID=${sess0}`, 'Referer': `${BASE}/member/login` },
    body: body.toString(), redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  const cookies = loginRes.headers.getSetCookie?.() ?? [loginRes.headers.get('set-cookie') ?? ''];
  return cookies.join(';').match(/PHPSESSID=([^;,]+)/)?.[1] ?? sess0;
}

export async function GET() {
  const sess = await login();
  const rankRes = await fetch(`${BASE}/club/info/ranking/hitter?club_idx=13588`, {
    // @ts-ignore
    dispatcher: agent,
    headers: { ...HEADERS, Cookie: `PHPSESSID=${sess}`, Referer: `${BASE}/club/info?club_idx=13588` },
    signal: AbortSignal.timeout(15000),
  });
  const html = await rankRes.text();

  // 테이블 관련 클래스 찾기
  const classes = [...html.matchAll(/class="([^"]+)"/g)]
    .map(m => m[1])
    .filter(c => c.includes('table') || c.includes('rank') || c.includes('list') || c.includes('title'))
    .slice(0, 20);

  // 테이블 첫 200자
  const tIdx = html.indexOf('<table');
  const tableSnippet = tIdx >= 0 ? html.substring(tIdx, tIdx + 400) : '테이블 없음';

  return NextResponse.json({
    session: sess.slice(0, 10) + '…',
    htmlLength: html.length,
    hasLeftTitle: html.includes('left_title'),
    tableCount: (html.match(/<table/g) || []).length,
    relevantClasses: [...new Set(classes)],
    tableSnippet,
  });
}
