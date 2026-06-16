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
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

export async function GET() {
  // 로그인 페이지에서 폼 action URL 찾기
  const loginPageRes = await fetch('https://www.gameone.kr/member/login', {
    // @ts-ignore
    dispatcher: agent,
    headers: CHROME_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  const loginHtml = await loginPageRes.text();

  // 폼 action 추출
  const formMatch = loginHtml.match(/<form[^>]+action=["']([^"']+)["'][^>]*>/i);
  const inputsMatch = loginHtml.match(/<input[^>]+name=["']([^"']+)["'][^>]*>/gi) || [];

  return NextResponse.json({
    loginPageStatus: loginPageRes.status,
    loginHtmlLength: loginHtml.length,
    formAction: formMatch?.[1] ?? '찾지 못함',
    inputNames: inputsMatch.map(m => m.match(/name=["']([^"']+)["']/i)?.[1]),
    snippet: loginHtml.substring(loginHtml.indexOf('<form'), loginHtml.indexOf('<form') + 600),
  });
}
