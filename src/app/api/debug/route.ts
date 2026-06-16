import { NextResponse } from 'next/server';
import { Agent } from 'undici';

export const maxDuration = 30;

const agent = new Agent({
  connect: {
    ciphers: 'DEFAULT:!DH:!DHE:!EDH:!EXPORT',
    honorCipherOrder: true,
  },
});

const CHROME_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Google Chrome";v="120", "Chromium";v="120", "Not-A.Brand";v="24"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0',
};

export async function GET() {
  const results: Record<string, unknown> = {};

  // 스케줄 URL 테스트
  const schedRes = await fetch('https://www.gameone.kr/club/info/schedule/table?club_idx=13588', {
    // @ts-ignore
    dispatcher: agent,
    headers: CHROME_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  const schedHtml = await schedRes.text();
  results.schedule = {
    status: schedRes.status,
    htmlLength: schedHtml.length,
    hasLeftTitle: schedHtml.includes('left_title'),
    tableRowCount: (schedHtml.match(/<tr/g) || []).length,
    snippet: schedHtml.substring(schedHtml.indexOf('<table'), schedHtml.indexOf('<table') + 300),
  };

  // 랭킹 URL 테스트 (full Chrome headers)
  const rankRes = await fetch('https://www.gameone.kr/club/info/ranking/hitter?club_idx=13588', {
    // @ts-ignore
    dispatcher: agent,
    headers: {
      ...CHROME_HEADERS,
      'Referer': 'https://www.gameone.kr/club/info?club_idx=13588',
      'Sec-Fetch-Site': 'same-origin',
    },
    signal: AbortSignal.timeout(15000),
  });
  const rankHtml = await rankRes.text();
  const ltIdx = rankHtml.indexOf('left_title');
  results.ranking = {
    status: rankRes.status,
    htmlLength: rankHtml.length,
    hasLeftTitle: ltIdx >= 0,
    tableRowCount: (rankHtml.match(/<tr/g) || []).length,
    snippet: ltIdx >= 0
      ? rankHtml.substring(ltIdx, ltIdx + 300)
      : rankHtml.substring(rankHtml.indexOf('<body'), rankHtml.indexOf('<body') + 400),
  };

  return NextResponse.json(results);
}
