import * as cheerio from 'cheerio';
import { HitterStats, PitcherStats, Player, GameSchedule } from '@/types/baseball';

const BASE_URL = 'https://www.gameone.kr';

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.gameone.kr/',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Cache-Control': 'max-age=0',
      },
      signal: AbortSignal.timeout(20000),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} fetching ${url}`);
    return res.text();
  } catch (err) {
    const detail = err instanceof Error
      ? `${err.name}: ${err.message}${(err as NodeJS.ErrnoException).code ? ` (${(err as NodeJS.ErrnoException).code})` : ''}`
      : String(err);
    throw new Error(`fetch 실패 [${url}] → ${detail}`);
  }
}

function pf(val: string | undefined): number {
  const n = parseFloat((val ?? '').replace(/[^0-9.-]/g, '') || '0');
  return isNaN(n) ? 0 : n;
}

function pi(val: string | undefined): number {
  const n = parseInt((val ?? '').replace(/[^0-9-]/g, '') || '0', 10);
  return isNaN(n) ? 0 : n;
}

// "고영일(22)" → { name: "고영일", number: "22" }
function parseName(raw: string): { name: string; number: string } {
  const m = raw.match(/^(.+?)\((\d+)\)$/);
  if (m) return { name: m[1].trim(), number: m[2] };
  return { name: raw.trim(), number: '' };
}

/**
 * gameone.kr 타자 랭킹 페이지 구조 (td,th 기준 인덱스):
 * [0]=순위(th) [1]=이름(번호)(th) [2]=타율 [3]=게임수 [4]=타석 [5]=타수
 * [6]=득점 [7]=총안타 [8]=1루타 [9]=2루타 [10]=3루타 [11]=홈런
 * [12]=루타 [13]=타점 [14]=도루 [15]=도실 [16]=희타 [17]=희비
 * [18]=볼넷 [19]=고의4구 [20]=사구 [21]=삼진 [22]=병살
 * [23]=장타율 [24]=출루율 [25]=도루성공률 [26]=멀티히트
 * [27]=OPS [28]=BB/K [29]=장타/안타
 */
export async function scrapeHitters(clubIdx: string): Promise<HitterStats[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/ranking/hitter?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const hitters: HitterStats[] = [];

  // left_title 테이블에 이름+통계 전체 포함
  $('.left_title table tbody tr').each((_, row) => {
    const cells = $(row).find('td, th').toArray();
    if (cells.length < 10) return;

    const cell = (i: number) => $(cells[i]).text().trim();

    const { name, number } = parseName(cell(1));
    if (!name) return;

    const games = pi(cell(3));
    if (games === 0) return;

    const ab    = pi(cell(5));
    const hits  = pi(cell(7));
    const dbl   = pi(cell(9));
    const trpl  = pi(cell(10));
    const hr    = pi(cell(11));
    const tb    = pi(cell(12));
    const rbi   = pi(cell(13));
    const sb    = pi(cell(14));
    const sacH  = pi(cell(16));
    const sacF  = pi(cell(17));
    const bb    = pi(cell(18));
    const hbp   = pi(cell(20));
    const so    = pi(cell(21));
    const pa    = pi(cell(4));
    const runs  = pi(cell(6));

    // 사이트에서 직접 제공하는 값 사용
    const slg = pf(cell(23));
    const obp = pf(cell(24));
    const ops = pf(cell(27));

    hitters.push({
      name,
      number,
      position: '',
      batSide: '',
      games,
      atBats: ab,
      plateAppearances: pa,
      hits,
      singles: hits - dbl - trpl - hr,
      doubles: dbl,
      triples: trpl,
      homeRuns: hr,
      rbi,
      runs,
      walks: bb,
      strikeouts: so,
      hitByPitch: hbp,
      stolenBases: sb,
      avg: ab > 0 ? hits / ab : 0,
      obp,
      slg,
      ops,
      totalBases: tb,
      sacHits: sacH,
      sacFlies: sacF,
    });
  });

  return hitters;
}

/**
 * gameone.kr 투수 랭킹 페이지 구조 (td,th 기준 인덱스):
 * [0]=순위(th) [1]=이름(번호)(th) [2]=방어율 [3]=게임수 [4]=승 [5]=패
 * [6]=세 [7]=홀드 [8]=승률 [9]=타자(BF) [10]=타수 [11]=투구수
 * [12]=이닝 [13]=피안타 [14]=피홈런 [15]=희타 [16]=희비
 * [17]=볼넷 [18]=고의4구 [19]=사구 [20]=탈삼진 [21]=폭투 [22]=보크
 * [23]=실점 [24]=자책점 [25]=WHIP [26]=피안타율 [27]=탈삼진율(K/9)
 */
export async function scrapePitchers(clubIdx: string): Promise<PitcherStats[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/ranking/pitcher?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const pitchers: PitcherStats[] = [];

  $('.left_title table tbody tr').each((_, row) => {
    const cells = $(row).find('td, th').toArray();
    if (cells.length < 10) return;

    const cell = (i: number) => $(cells[i]).text().trim();

    const { name, number } = parseName(cell(1));
    if (!name) return;

    const games = pi(cell(3));
    if (games === 0) return;

    // 이닝: "17.2" → 17 + 2/3 이닝
    const inningStr = cell(12);
    const inningParts = inningStr.split('.');
    const innings = pi(inningParts[0]) + (pi(inningParts[1] || '0') / 3);

    const era  = pf(cell(2));
    const wins = pi(cell(4));
    const loss = pi(cell(5));
    const sv   = pi(cell(6));
    const bf   = pi(cell(9));
    const so   = pi(cell(20));
    const bb   = pi(cell(17));
    const hitA = pi(cell(13));
    const hrA  = pi(cell(14));
    const er   = pi(cell(24));
    const whip = pf(cell(25));
    const pitches = pi(cell(11));

    // K% = SO / BF (타자 기준), K/9 = site의 탈삼진율
    const kRate = bf > 0 ? so / bf : 0;
    const bbRate = bf > 0 ? bb / bf : 0;

    pitchers.push({
      name,
      number,
      throwSide: '',
      games,
      wins,
      losses: loss,
      saves: sv,
      innings,
      era,
      whip,
      strikeouts: so,
      walks: bb,
      hits: hitA,
      homeRuns: hrA,
      earnedRuns: er,
      pitches,
      battersFaced: bf,
      kRate,
      bbRate,
    });
  });

  return pitchers;
}

export async function scrapePlayers(clubIdx: string): Promise<Player[]> {
  try {
    const html = await fetchPage(`${BASE_URL}/club/info/player?club_idx=${clubIdx}`);
    const $ = cheerio.load(html);
    const players: Player[] = [];
    $('.player_list li, .player_item, [class*="player"]').each((_, el) => {
      const name = $(el).find('.name, [class*="name"]').first().text().trim();
      const number = $(el).find('.num, [class*="num"]').first().text().trim();
      const position = $(el).find('.pos, [class*="pos"]').first().text().trim();
      if (name) players.push({ name, number, position, throwSide: '', batSide: '', war: 0 });
    });
    return players;
  } catch {
    return [];
  }
}

/**
 * 일정 테이블 구조 (td 기준):
 * [0]=일시 [1]=분류(리그) [2]=구장 [3]=게임(팀A vs 팀B 텍스트) [4]=결과
 *
 * 예) 08월29일(토) 16:00 | 토요리그(B) | 동작구 노량진 야구장 | FAKERS The Born | 게임대기
 *     06월13일(토) 12:00 | 토요 마이너 | HS고촌구장 | 블루버즈 8 FAKERS 콜드승 20 | BOX SCORE
 */
export async function scrapeSchedule(clubIdx: string): Promise<GameSchedule[]> {
  const html = await fetchPage(`${BASE_URL}/club/info/schedule/table?club_idx=${clubIdx}`);
  const $ = cheerio.load(html);
  const schedules: GameSchedule[] = [];

  $('table tbody tr').each((_, row) => {
    const cells = $(row).find('td').toArray();
    if (cells.length < 4) return;

    const cell = (i: number) => $(cells[i]).text().trim().replace(/\s+/g, ' ');

    const rawDate    = cell(0);
    const leagueText = cell(1);
    const stadium    = cell(2);
    const gameText   = cell(3);
    const resultText = cell(4);

    // 헤더 행("일시", "분류" 등) 건너뛰기
    if (rawDate === '일시' || rawDate === '') return;

    // 날짜·시간 파싱: "08월29일(토) 16:00"
    const timeMatch = rawDate.match(/(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';
    const date = rawDate.replace(time, '').trim();

    // 리그 분류
    const league = leagueText.includes('마이너') || leagueText.includes('HS')
      ? 'HS리그'
      : leagueText.includes('리그B') || leagueText.includes('리그(B)') || leagueText.includes('노들') || leagueText.includes('동작')
      ? '동작 노들리그'
      : leagueText;

    // 상대팀 이름 추출: "FAKERS The Born" → "The Born"
    // "블루버즈 8 FAKERS 콜드승 20" → "블루버즈"
    const opponent = parseOpponentName(gameText);

    // 결과·상태
    const isCompleted = resultText.includes('BOX') || resultText.includes('점') || /\d+:\d+/.test(resultText);
    const isUpcoming = resultText.includes('대기') || resultText === '';
    const status: GameSchedule['status'] = isCompleted ? 'completed' : isUpcoming ? 'upcoming' : 'pending';

    // 점수 파싱 (완료된 경기): "FAKERS 2 데몬스B 콜드승 12"
    let score = '';
    if (isCompleted) {
      const scoreMatch = gameText.match(/(\d+)\s+\S+\s+(\d+)/);
      if (scoreMatch) score = `${scoreMatch[1]} : ${scoreMatch[2]}`;
    }

    // BOX SCORE 링크에서 game_idx 추출
    const boxLink = $(row).find('a').attr('href') || '';
    const gameIdxMatch = boxLink.match(/game_idx=(\d+)/);

    schedules.push({
      date,
      time,
      league,
      stadium,
      opponent,
      opponentClubIdx: '', // 일정 테이블에 club_idx 링크 없음 → 이름으로 검색 필요
      result: resultText,
      score,
      gameIdx: gameIdxMatch?.[1] || '',
      status,
    });
  });

  return schedules;
}

function parseOpponentName(gameText: string): string {
  // 숫자·콜드승/패·몰수승/패 제거 후 FAKERS 제거
  let text = gameText
    .replace(/콜드승|콜드패|몰수승|몰수패|BOX SCORE|게임대기/g, '')
    .replace(/\b\d+\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // FAKERS가 앞에 있으면 뒤가 상대팀, 뒤에 있으면 앞이 상대팀
  const parts = text.split('FAKERS').map(s => s.trim()).filter(Boolean);
  return parts[0] || text;
}

/** 팀 이름으로 club_idx 검색 */
export async function searchClubIdx(teamName: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(teamName);
    const html = await fetchPage(`${BASE_URL}/search?keyword=${encoded}&type=club`);
    const $ = cheerio.load(html);
    // 검색 결과에서 팀명과 club_idx 추출
    let found = '';
    $('a[href*="club_idx"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const linkText = $(el).text().trim();
      const m = href.match(/club_idx=(\d+)/);
      if (m && linkText.includes(teamName.slice(0, 3))) {
        found = m[1];
        return false; // break
      }
    });
    return found;
  } catch {
    return '';
  }
}

export async function scrapeTeamName(clubIdx: string): Promise<string> {
  try {
    const html = await fetchPage(`${BASE_URL}/club/info/player?club_idx=${clubIdx}`);
    const $ = cheerio.load(html);
    // 페이지 타이틀이나 클럽명 추출
    const title = $('title').text().trim();
    if (title && title !== 'GAMEONE') return title.split('|')[0].trim().split('-')[0].trim();
    return $('h1, .club_name, [class*="club_name"]').first().text().trim() || `팀 ${clubIdx}`;
  } catch {
    return `팀 ${clubIdx}`;
  }
}
