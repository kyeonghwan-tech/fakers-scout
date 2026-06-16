import * as cheerio from 'cheerio';
import { HitterStats, PitcherStats, Player, GameSchedule } from '@/types/baseball';

const BASE_URL = 'https://www.gameone.kr';

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9',
    },
    next: { revalidate: 300 }, // 5분 캐시
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function parseFloat2(val: string): number {
  const n = parseFloat(val?.replace(/[^0-9.-]/g, '') || '0');
  return isNaN(n) ? 0 : n;
}

function parseInt2(val: string): number {
  const n = parseInt(val?.replace(/[^0-9-]/g, '') || '0');
  return isNaN(n) ? 0 : n;
}

export async function scrapeHitters(clubIdx: string): Promise<HitterStats[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/ranking/hitter?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const hitters: HitterStats[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 10) return;

    const nameEl = $(cells[1]).text().trim();
    if (!nameEl) return;

    const numMatch = $(cells[1]).find('.num').text().trim();
    const name = nameEl.replace(numMatch, '').trim().split('\n')[0].trim();

    const games = parseInt2($(cells[3]).text());
    if (games === 0) return;

    const atBats = parseInt2($(cells[5]).text());
    const hits = parseInt2($(cells[6]).text());
    const doubles = parseInt2($(cells[8]).text());
    const triples = parseInt2($(cells[9]).text());
    const hr = parseInt2($(cells[10]).text());
    const rbi = parseInt2($(cells[12]).text());
    const runs = parseInt2($(cells[11]).text());
    const walks = parseInt2($(cells[18]).text());
    const so = parseInt2($(cells[21]).text());
    const hbp = parseInt2($(cells[20]).text());
    const sb = parseInt2($(cells[13]).text());
    const pa = parseInt2($(cells[4]).text());
    const tb = parseInt2($(cells[11 + 1]).text());
    const sacH = parseInt2($(cells[15]).text());
    const sacF = parseInt2($(cells[16]).text());

    const avg = atBats > 0 ? hits / atBats : 0;
    const obpDenom = atBats + walks + hbp + sacF;
    const obp = obpDenom > 0 ? (hits + walks + hbp) / obpDenom : 0;
    const slg = atBats > 0 ? tb / atBats : 0;

    hitters.push({
      name,
      number: numMatch || '?',
      position: $(cells[2]).text().trim(),
      batSide: '',
      games,
      atBats,
      plateAppearances: pa,
      hits,
      singles: hits - doubles - triples - hr,
      doubles,
      triples,
      homeRuns: hr,
      rbi,
      runs,
      walks,
      strikeouts: so,
      hitByPitch: hbp,
      stolenBases: sb,
      avg,
      obp,
      slg,
      ops: obp + slg,
      totalBases: tb,
      sacHits: sacH,
      sacFlies: sacF,
    });
  });

  return hitters;
}

export async function scrapePitchers(clubIdx: string): Promise<PitcherStats[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/ranking/pitcher?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const pitchers: PitcherStats[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 8) return;

    const nameEl = $(cells[1]).text().trim();
    if (!nameEl) return;

    const numMatch = $(cells[1]).find('.num').text().trim();
    const name = nameEl.replace(numMatch, '').trim().split('\n')[0].trim();

    const games = parseInt2($(cells[3]).text());
    if (games === 0) return;

    const inningStr = $(cells[6]).text().trim();
    const inningParts = inningStr.split('.');
    const innings = parseInt2(inningParts[0]) + (parseInt2(inningParts[1] || '0') / 3);

    const era = parseFloat2($(cells[2]).text());
    const wins = parseInt2($(cells[3]).text().split('-')[0]);
    const losses = parseInt2($(cells[3]).text().split('-')[1]);
    const cellText = (i: number) => (cells.length > i ? $(cells[i]).text() : '0');
    const so = parseInt2(cellText(15));
    const bb = parseInt2(cellText(13));
    const hits = parseInt2(cellText(10));
    const hr = parseInt2(cellText(11));
    const er = parseInt2(cellText(17));
    const whip = parseFloat2(cellText(cells.length - 2));
    const bf = parseInt2(cellText(8));

    const kRate = bf > 0 ? so / bf : 0;
    const bbRate = bf > 0 ? bb / bf : 0;

    pitchers.push({
      name,
      number: numMatch || '?',
      throwSide: '',
      games,
      wins: Math.max(wins, 0),
      losses: Math.max(losses, 0),
      saves: 0,
      innings,
      era,
      whip,
      strikeouts: so,
      walks: bb,
      hits,
      homeRuns: hr,
      earnedRuns: er,
      pitches: 0,
      battersFaced: bf,
      kRate,
      bbRate,
    });
  });

  return pitchers;
}

export async function scrapePlayers(clubIdx: string): Promise<Player[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/player?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const players: Player[] = [];

  $('.player-card, .player_wrap, [class*="player"]').each((_, el) => {
    const name = $(el).find('[class*="name"], .name').first().text().trim();
    const number = $(el).find('[class*="num"], .num').first().text().trim();
    const position = $(el).find('[class*="pos"], .pos').first().text().trim();
    if (name) {
      players.push({ name, number, position, throwSide: '', batSide: '', war: 0 });
    }
  });

  return players;
}

export async function scrapeSchedule(clubIdx: string): Promise<GameSchedule[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/schedule/table?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const schedules: GameSchedule[] = [];

  $('table tbody tr, .schedule-row, [class*="game-row"]').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return;

    const dateText = $(cells[0]).text().trim();
    const leagueText = $(cells[1]).text().trim();
    const stadiumText = $(cells[2]).text().trim();

    const opponentLink = $(row).find('a[href*="club_idx"]');
    const opponentHref = opponentLink.attr('href') || '';
    const opponentClubIdxMatch = opponentHref.match(/club_idx=(\d+)/);
    const opponentClubIdx = opponentClubIdxMatch ? opponentClubIdxMatch[1] : '';
    const opponentName = opponentLink.text().trim();

    const gameLink = $(row).find('a[href*="game_idx"]');
    const gameHref = gameLink.attr('href') || '';
    const gameIdxMatch = gameHref.match(/game_idx=(\d+)/);
    const gameIdx = gameIdxMatch ? gameIdxMatch[1] : '';

    const resultText = $(row).find('[class*="result"], .result').text().trim();
    const scoreText = $(row).find('[class*="score"], .score').text().trim();

    let status: 'upcoming' | 'completed' | 'pending' = 'pending';
    if (gameLink.text().includes('BOX')) status = 'completed';
    else if (gameLink.text().includes('대기')) status = 'upcoming';

    if (!dateText) return;

    const timeMatch = dateText.match(/(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';

    const league = leagueText.includes('마이너') || leagueText.includes('HS')
      ? 'HS리그'
      : leagueText.includes('노들') || leagueText.includes('동작') || leagueText.includes('리그B')
      ? '동작 노들리그'
      : leagueText;

    schedules.push({
      date: dateText.replace(timeMatch?.[0] || '', '').trim(),
      time,
      league,
      stadium: stadiumText,
      opponent: opponentName,
      opponentClubIdx,
      result: resultText,
      score: scoreText,
      gameIdx,
      status,
    });
  });

  return schedules;
}

export async function scrapeTeamName(clubIdx: string): Promise<string> {
  try {
    const html = await fetchPage(`${BASE_URL}/club/info/player?club_idx=${clubIdx}`);
    const $ = cheerio.load(html);
    return $('h1, .club-name, [class*="club_name"]').first().text().trim() || `팀 ${clubIdx}`;
  } catch {
    return `팀 ${clubIdx}`;
  }
}
