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

export async function GET() {
  const userId = process.env.GAMEONE_USER_ID ?? '';
  const passwd = process.env.GAMEONE_PASSWD ?? '';

  // 1) 로그인 페이지 → CSRF 토큰
  const lpRes = await fetch(`${BASE}/member/login`, {
    // @ts-ignore
    dispatcher: agent, headers: HEADERS, signal: AbortSignal.timeout(15000),
  });
  const lpHtml = await lpRes.text();
  const tokenMatch = lpHtml.match(/name="login_token"\s+value="([^"]+)"/);
  const loginToken = tokenMatch?.[1] ?? '';
  const sess0 = lpRes.headers.get('set-cookie')?.match(/PHPSESSID=([^;]+)/)?.[1] ?? '';

  // 2) 로그인 POST
  const body = new URLSearchParams({
    login_token: loginToken, return_url: 'https%3A%2F%2Fwww.gameone.kr%2F',
    isPop: 'F', user_id: userId, passwd, save_id: '',
  });
  const loginRes = await fetch(`${BASE}/member/exec/login`, {
    method: 'POST',
    // @ts-ignore
    dispatcher: agent,
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sess0 ? `PHPSESSID=${sess0}` : '',
      'Referer': `${BASE}/member/login`,
    },
    body: body.toString(), redirect: 'manual', signal: AbortSignal.timeout(15000),
  });
  const rawCookies = loginRes.headers.getSetCookie?.() ?? [loginRes.headers.get('set-cookie') ?? ''];
  const sess1 = rawCookies.join(';').match(/PHPSESSID=([^;,]+)/)?.[1] ?? sess0;

  // 3) 로그인 후 랭킹 페이지 접근
  const rankRes = await fetch(`${BASE}/club/info/ranking/hitter?club_idx=13588`, {
    // @ts-ignore
    dispatcher: agent,
    headers: { ...HEADERS, Cookie: `PHPSESSID=${sess1}` },
    signal: AbortSignal.timeout(15000),
  });
  const rankHtml = await rankRes.text();
  const hasData = rankHtml.includes('left_title');

  return NextResponse.json({
    hasEnvVars: !!(userId && passwd),
    loginToken: loginToken ? loginToken.slice(0, 20) + '…' : '없음',
    loginStatus: loginRes.status,
    cookie: sess1 ? `PHPSESSID=${sess1.slice(0, 10)}…` : '없음',
    rankStatus: rankRes.status,
    hasLeftTitle: hasData,
    rankHtmlLength: rankHtml.length,
    snippet: hasData
      ? rankHtml.substring(rankHtml.indexOf('left_title'), rankHtml.indexOf('left_title') + 200)
      : rankHtml.substring(rankHtml.indexOf('login_box'), rankHtml.indexOf('login_box') + 200),
  });
}
