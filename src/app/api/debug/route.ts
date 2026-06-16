import { NextResponse } from 'next/server';
import { Agent } from 'undici';

export const maxDuration = 30;

const agent = new Agent({
  connect: {
    ciphers: 'DEFAULT:!DH:!DHE:!EDH:!EXPORT',
    honorCipherOrder: true,
  },
});

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://www.gameone.kr/',
};

export async function GET() {
  // 1단계: 세션 쿠키 획득
  const sessionRes = await fetch('https://www.gameone.kr/club/info/player?club_idx=13588', {
    // @ts-ignore
    dispatcher: agent,
    headers: HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  const setCookie = sessionRes.headers.get('set-cookie') ?? '';
  const cookieMatch = setCookie.match(/PHPSESSID=([^;]+)/);
  const cookie = cookieMatch ? `PHPSESSID=${cookieMatch[1]}` : '';

  // 2단계: 세션 쿠키로 랭킹 페이지 요청
  const rankRes = await fetch('https://www.gameone.kr/club/info/ranking/hitter?club_idx=13588', {
    // @ts-ignore
    dispatcher: agent,
    headers: { ...HEADERS, ...(cookie ? { Cookie: cookie } : {}) },
    signal: AbortSignal.timeout(20000),
  });
  const html = await rankRes.text();
  const leftTitleIdx = html.indexOf('left_title');
  const snippet = leftTitleIdx >= 0
    ? html.substring(Math.max(0, leftTitleIdx - 10), leftTitleIdx + 400)
    : html.substring(0, 500);

  return NextResponse.json({
    sessionStatus: sessionRes.status,
    cookie: cookie || '없음',
    rankStatus: rankRes.status,
    htmlLength: html.length,
    hasLeftTitle: leftTitleIdx >= 0,
    tableRowCount: (html.match(/<tr/g) || []).length,
    snippet,
  });
}
