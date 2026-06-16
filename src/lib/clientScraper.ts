'use client';

import { HitterStats, PitcherStats, GameSchedule } from '@/types/baseball';

// CORS 프록시 체인 - 실패 시 다음으로 fallback
const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchViaProxy(url: string): Promise<Document> {
  let lastErr: unknown;
  for (const makeProxy of PROXIES) {
    try {
      const proxyUrl = makeProxy(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const html = await res.text();
      if (!html || html.length < 200) continue;
      const parser = new DOMParser();
      return parser.parseFromString(html, 'text/html');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error(`모든 프록시 실패: ${url}`);
}

function cellText(cells: NodeListOf<Element> | Element[], i: number): string {
  const el = cells instanceof NodeList ? cells[i] : cells[i];
  return el ? (el as HTMLElement).innerText.trim().replace(/\s+/g, ' ') : '';
}

function pf(v: string): number {
  const n = parseFloat(v.replace(/[^0-9.-]/g, '') || '0');
  return isNaN(n) ? 0 : n;
}

function pi(v: string): number {
  const n = parseInt(v.replace(/[^0-9-]/g, '') || '0', 10);
  return isNaN(n) ? 0 : n;
}

function parseName(raw: string): { name: string; number: string } {
  const m = raw.match(/^(.+?)\((\d+)\)$/);
  if (m) return { name: m[1].trim(), number: m[2] };
  return { name: raw.trim(), number: '' };
}

export async function fetchHitters(clubIdx: string): Promise<HitterStats[]> {
  const doc = await fetchViaProxy(
    `https://www.gameone.kr/club/info/ranking/hitter?club_idx=${clubIdx}`
  );
  const hitters: HitterStats[] = [];

  doc.querySelectorAll('.left_title table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 10) return;

    const c = (i: number) => cellText(cells, i);
    const { name, number } = parseName(c(1));
    if (!name) return;

    const games = pi(c(3));
    if (games === 0) return;

    const ab   = pi(c(5));
    const hits = pi(c(7));
    const dbl  = pi(c(9));
    const trpl = pi(c(10));
    const hr   = pi(c(11));
    const tb   = pi(c(12));
    const rbi  = pi(c(13));
    const sb   = pi(c(14));
    const sacH = pi(c(16));
    const sacF = pi(c(17));
    const bb   = pi(c(18));
    const hbp  = pi(c(20));
    const so   = pi(c(21));
    const pa   = pi(c(4));
    const runs = pi(c(6));
    const slg  = pf(c(23));
    const obp  = pf(c(24));
    const ops  = pf(c(27));

    hitters.push({
      name, number, position: '', batSide: '',
      games, atBats: ab, plateAppearances: pa,
      hits, singles: hits - dbl - trpl - hr,
      doubles: dbl, triples: trpl, homeRuns: hr,
      rbi, runs, walks: bb, strikeouts: so,
      hitByPitch: hbp, stolenBases: sb,
      avg: ab > 0 ? hits / ab : 0,
      obp, slg, ops, totalBases: tb,
      sacHits: sacH, sacFlies: sacF,
    });
  });

  return hitters;
}

export async function fetchPitchers(clubIdx: string): Promise<PitcherStats[]> {
  const doc = await fetchViaProxy(
    `https://www.gameone.kr/club/info/ranking/pitcher?club_idx=${clubIdx}`
  );
  const pitchers: PitcherStats[] = [];

  doc.querySelectorAll('.left_title table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length < 10) return;

    const c = (i: number) => cellText(cells, i);
    const { name, number } = parseName(c(1));
    if (!name) return;

    const games = pi(c(3));
    if (games === 0) return;

    const inningStr = c(12);
    const ip = inningStr.split('.');
    const innings = pi(ip[0]) + (pi(ip[1] || '0') / 3);

    const bf = pi(c(9));
    const so = pi(c(20));
    const bb = pi(c(17));

    pitchers.push({
      name, number, throwSide: '',
      games, wins: pi(c(4)), losses: pi(c(5)), saves: pi(c(6)),
      innings, era: pf(c(2)), whip: pf(c(25)),
      strikeouts: so, walks: bb,
      hits: pi(c(13)), homeRuns: pi(c(14)),
      earnedRuns: pi(c(24)), pitches: pi(c(11)),
      battersFaced: bf,
      kRate: bf > 0 ? so / bf : 0,
      bbRate: bf > 0 ? bb / bf : 0,
    });
  });

  return pitchers;
}

export async function fetchSchedule(clubIdx: string): Promise<GameSchedule[]> {
  const doc = await fetchViaProxy(
    `https://www.gameone.kr/club/info/schedule/table?club_idx=${clubIdx}`
  );
  const schedules: GameSchedule[] = [];

  doc.querySelectorAll('table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 4) return;

    const c = (i: number) => (cells[i] as HTMLElement)?.innerText.trim().replace(/\s+/g, ' ') ?? '';

    const rawDate    = c(0);
    const leagueText = c(1);
    const stadium    = c(2);
    const gameText   = c(3);
    const resultText = c(4);

    if (rawDate === '일시' || rawDate === '') return;

    const timeMatch = rawDate.match(/(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';
    const date = rawDate.replace(time, '').trim();

    const league =
      leagueText.includes('마이너') || leagueText.includes('HS')
        ? 'HS리그'
        : leagueText.includes('리그B') || leagueText.includes('리그(B)')
        ? '동작 노들리그'
        : leagueText;

    const opponent = parseOpponent(gameText);
    const isCompleted = resultText.includes('BOX');
    const status: GameSchedule['status'] = isCompleted
      ? 'completed'
      : resultText.includes('대기')
      ? 'upcoming'
      : 'pending';

    let score = '';
    if (isCompleted) {
      const m = gameText.match(/(\d+)[^0-9]+(\d+)/);
      if (m) score = `${m[1]} : ${m[2]}`;
    }

    const boxLink = row.querySelector('a');
    const gameIdxM = boxLink?.getAttribute('href')?.match(/game_idx=(\d+)/);

    schedules.push({
      date, time, league, stadium, opponent,
      opponentClubIdx: '',
      result: resultText, score,
      gameIdx: gameIdxM?.[1] || '',
      status,
    });
  });

  return schedules;
}

function parseOpponent(gameText: string): string {
  const clean = gameText
    .replace(/콜드승|콜드패|몰수승|몰수패|BOX SCORE|게임대기/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = clean.split('FAKERS').map(s => s.trim()).filter(Boolean);
  return parts[0] || clean;
}

export async function searchTeamClubIdx(teamName: string): Promise<string> {
  try {
    const doc = await fetchViaProxy(
      `https://www.gameone.kr/search?keyword=${encodeURIComponent(teamName)}&type=club`
    );
    let found = '';
    doc.querySelectorAll('a[href*="club_idx"]').forEach((el) => {
      if (found) return;
      const href = el.getAttribute('href') || '';
      const text = (el as HTMLElement).innerText.trim();
      const m = href.match(/club_idx=(\d+)/);
      if (m && text.includes(teamName.slice(0, 2))) found = m[1];
    });
    return found;
  } catch {
    return '';
  }
}
