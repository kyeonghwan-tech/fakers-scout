import { NextResponse } from 'next/server';
import { Agent } from 'undici';

export const maxDuration = 30;

const agent = new Agent({
  connect: {
    ciphers: 'DEFAULT:!DH:!DHE:!EDH:!EXPORT',
    honorCipherOrder: true,
  },
});

export async function GET() {
  const url = 'https://www.gameone.kr/club/info/ranking/hitter?club_idx=13588';
  try {
    const res = await fetch(url, {
      // @ts-ignore
      dispatcher: agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer': 'https://www.gameone.kr/',
      },
      signal: AbortSignal.timeout(20000),
    });
    const html = await res.text();
    const leftTitleIdx = html.indexOf('left_title');
    const snippet = leftTitleIdx >= 0
      ? html.substring(Math.max(0, leftTitleIdx - 30), leftTitleIdx + 400)
      : html.substring(0, 600);
    return NextResponse.json({
      status: res.status,
      htmlLength: html.length,
      hasLeftTitle: leftTitleIdx >= 0,
      tableRowCount: (html.match(/<tr/g) || []).length,
      snippet,
    });
  } catch (err) {
    const cause = (err as { cause?: { code?: string } }).cause;
    return NextResponse.json({ error: String(err), cause: cause?.code }, { status: 500 });
  }
}
