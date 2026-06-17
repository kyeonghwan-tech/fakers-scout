import * as cheerio from 'cheerio';
import { Agent } from 'undici';
import { HitterStats, PitcherStats, Player, GameSchedule } from '@/types/baseball';

const BASE_URL = 'https://www.gameone.kr';

// gameone.kr: DH 키가 작아 Node.js 기본 TLS가 거부 → DHE 제외 커스텀 Agent
const tlsAgent = new Agent({
  connect: {
    ciphers: 'DEFAULT:!DH:!DHE:!EDH:!EXPORT',
    honorCipherOrder: true,
  },
});

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
  'Referer': 'https://www.gameone.kr/',
};

// gameone.kr 로그인 후 세션 쿠키 반환 (랭킹 페이지 접근에 필요)
let _cachedCookie = '';
let _cookieExpiry = 0;

async function getLoginCookie(): Promise<string> {
  if (_cachedCookie && Date.now() < _cookieExpiry) return _cachedCookie;

  const userId = process.env.GAMEONE_USER_ID ?? '';
  const passwd = process.env.GAMEONE_PASSWD ?? '';
  if (!userId || !passwd) return '';

  // 1단계: 로그인 페이지에서 CSRF token 획득
  const loginPageRes = await fetch(`${BASE_URL}/member/login`, {
    // @ts-ignore
    dispatcher: tlsAgent,
    headers: BASE_HEADERS,
    signal: AbortSignal.timeout(15000),
  });
  const loginHtml = await loginPageRes.text();
  const tokenMatch = loginHtml.match(/name="login_token"\s+value="([^"]+)"/);
  const loginToken = tokenMatch?.[1] ?? '';
  const sessionCookie = loginPageRes.headers.get('set-cookie')?.match(/PHPSESSID=([^;]+)/)?.[1] ?? '';

  // 2단계: 로그인 POST
  const body = new URLSearchParams({
    login_token: loginToken,
    return_url: 'https%3A%2F%2Fwww.gameone.kr%2F',
    isPop: 'F',
    user_id: userId,
    passwd,
    save_id: '',
  });
  const loginRes = await fetch(`${BASE_URL}/member/exec/login`, {
    method: 'POST',
    // @ts-ignore
    dispatcher: tlsAgent,
    headers: {
      ...BASE_HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': sessionCookie ? `PHPSESSID=${sessionCookie}` : '',
      'Referer': `${BASE_URL}/member/login`,
    },
    body: body.toString(),
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
  });

  // Set-Cookie에서 새 세션 쿠키 추출
  const allCookies = loginRes.headers.getSetCookie?.() ?? [loginRes.headers.get('set-cookie') ?? ''];
  const phpSess = allCookies.join(';').match(/PHPSESSID=([^;,]+)/)?.[1] ?? sessionCookie;
  if (!phpSess) return '';

  _cachedCookie = `PHPSESSID=${phpSess}`;
  _cookieExpiry = Date.now() + 20 * 60 * 1000; // 20분 캐시
  return _cachedCookie;
}

async function fetchPage(url: string, cookie?: string): Promise<string> {
  try {
    const res = await fetch(url, {
      // @ts-ignore
      dispatcher: tlsAgent,
      headers: {
        ...BASE_HEADERS,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      signal: AbortSignal.timeout(20000),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    return res.text();
  } catch (err) {
    const cause = (err as { cause?: { code?: string; message?: string } }).cause;
    const causeInfo = cause ? ` | cause: ${cause.code ?? cause.message ?? String(cause)}` : '';
    const detail = err instanceof Error ? `${err.name}: ${err.message}${causeInfo}` : String(err);
    throw new Error(`fetch 실패 [${url}] → ${detail}`);
  }
}

export { getLoginCookie };

// 로그인 쿠키로 랭킹 페이지 접근
async function fetchRankingPage(path: string, clubIdx: string, cookie: string, season?: number): Promise<string> {
  const url = season
    ? `${BASE_URL}${path}?club_idx=${clubIdx}&season=${season}`
    : `${BASE_URL}${path}?club_idx=${clubIdx}`;
  return fetchPage(url, cookie);
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
async function scrapeHittersSingleSeason(clubIdx: string, cookie: string, season?: number): Promise<HitterStats[]> {
  const html = await fetchRankingPage('/club/info/ranking/hitter', clubIdx, cookie, season);
  const $ = cheerio.load(html);
  const hitters: HitterStats[] = [];

  $('table.ranking_table tbody tr').each((_, row) => {
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

function mergeHitterSeasons(allSeasons: HitterStats[][]): HitterStats[] {
  const map = new Map<string, HitterStats>();
  for (const season of allSeasons) {
    for (const h of season) {
      const existing = map.get(h.name);
      if (!existing) {
        map.set(h.name, { ...h });
      } else {
        // 카운팅 스탯 합산
        existing.games       += h.games;
        existing.atBats      += h.atBats;
        existing.plateAppearances += h.plateAppearances;
        existing.hits        += h.hits;
        existing.singles     += h.singles;
        existing.doubles     += h.doubles;
        existing.triples     += h.triples;
        existing.homeRuns    += h.homeRuns;
        existing.rbi         += h.rbi;
        existing.runs        += h.runs;
        existing.walks       += h.walks;
        existing.strikeouts  += h.strikeouts;
        existing.hitByPitch  += h.hitByPitch;
        existing.stolenBases += h.stolenBases;
        existing.totalBases  += h.totalBases;
        existing.sacHits     += h.sacHits;
        existing.sacFlies    += h.sacFlies;
        // 비율 스탯 재계산
        existing.avg = existing.atBats > 0 ? existing.hits / existing.atBats : 0;
        const pa = existing.atBats + existing.walks + existing.hitByPitch + existing.sacFlies;
        existing.obp = pa > 0 ? (existing.hits + existing.walks + existing.hitByPitch) / pa : 0;
        existing.slg = existing.atBats > 0 ? existing.totalBases / existing.atBats : 0;
        existing.ops = existing.obp + existing.slg;
      }
    }
  }
  return Array.from(map.values());
}

export async function scrapeHitters(clubIdx: string, cookie: string, seasons?: number[]): Promise<HitterStats[]> {
  const targetSeasons = seasons ?? [2024, 2025, 2026];
  const results = await Promise.all(
    targetSeasons.map(s => scrapeHittersSingleSeason(clubIdx, cookie, s).catch(() => [] as HitterStats[]))
  );
  return mergeHitterSeasons(results);
}

/**
 * gameone.kr 투수 랭킹 페이지 구조 (td,th 기준 인덱스):
 * [0]=순위(th) [1]=이름(번호)(th) [2]=방어율 [3]=게임수 [4]=승 [5]=패
 * [6]=세 [7]=홀드 [8]=승률 [9]=타자(BF) [10]=타수 [11]=투구수
 * [12]=이닝 [13]=피안타 [14]=피홈런 [15]=희타 [16]=희비
 * [17]=볼넷 [18]=고의4구 [19]=사구 [20]=탈삼진 [21]=폭투 [22]=보크
 * [23]=실점 [24]=자책점 [25]=WHIP [26]=피안타율 [27]=탈삼진율(K/9)
 */
async function scrapePitchersSingleSeason(clubIdx: string, cookie: string, season?: number): Promise<PitcherStats[]> {
  const html = await fetchRankingPage('/club/info/ranking/pitcher', clubIdx, cookie, season);
  const $ = cheerio.load(html);
  const pitchers: PitcherStats[] = [];

  $('table.ranking_table tbody tr').each((_, row) => {
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

function mergePitcherSeasons(allSeasons: PitcherStats[][]): PitcherStats[] {
  const map = new Map<string, PitcherStats>();
  for (const season of allSeasons) {
    for (const p of season) {
      const existing = map.get(p.name);
      if (!existing) {
        map.set(p.name, { ...p });
      } else {
        existing.games       += p.games;
        existing.wins        += p.wins;
        existing.losses      += p.losses;
        existing.saves       += p.saves;
        existing.innings     += p.innings;
        existing.strikeouts  += p.strikeouts;
        existing.walks       += p.walks;
        existing.hits        += p.hits;
        existing.homeRuns    += p.homeRuns;
        existing.earnedRuns  += p.earnedRuns;
        existing.pitches     += p.pitches;
        existing.battersFaced += p.battersFaced;
        // 비율 스탯 재계산
        existing.era  = existing.innings > 0 ? (existing.earnedRuns / existing.innings) * 9 : 0;
        existing.whip = existing.innings > 0 ? (existing.walks + existing.hits) / existing.innings : 0;
        existing.kRate  = existing.battersFaced > 0 ? existing.strikeouts / existing.battersFaced : 0;
        existing.bbRate = existing.battersFaced > 0 ? existing.walks / existing.battersFaced : 0;
      }
    }
  }
  return Array.from(map.values());
}

export async function scrapePitchers(clubIdx: string, cookie: string, seasons?: number[]): Promise<PitcherStats[]> {
  const targetSeasons = seasons ?? [2024, 2025, 2026];
  const results = await Promise.all(
    targetSeasons.map(s => scrapePitchersSingleSeason(clubIdx, cookie, s).catch(() => [] as PitcherStats[]))
  );
  return mergePitcherSeasons(results);
}

const POS_KR: Record<string, string> = {
  '투수': 'P', '포수': 'C',
  '一루수': '1B', '1루수': '1B',
  '二루수': '2B', '2루수': '2B',
  '三루수': '3B', '3루수': '3B',
  '유격수': 'SS',
  '좌익수': 'LF', '중견수': 'CF', '우익수': 'RF',
};

export async function scrapePlayerPositions(clubIdx: string): Promise<Map<string, { position: string; throwSide: string; batSide: string }>> {
  const map = new Map<string, { position: string; throwSide: string; batSide: string }>();
  try {
    const html = await fetchPage(`${BASE_URL}/club/info/player?club_idx=${clubIdx}`);
    const $ = cheerio.load(html);
    $('dl').each((_, dl) => {
      const dtText = $(dl).find('dt').first().text().trim(); // "22.고영일"
      const ddText = $(dl).find('dd').first().text().trim(); // "포수 | 우투우타"
      const nameMatch = dtText.match(/^\d+\.(.+)$/);
      if (!nameMatch) return;
      const name = nameMatch[1].trim();
      const parts = ddText.split('|').map(s => s.trim());
      const posKr = parts[0] || '';
      const sides = parts[1] || '';
      const throwSide = sides.includes('좌투') ? '좌' : '우';
      const batSide = sides.includes('좌타') ? '좌' : '우';
      const position = POS_KR[posKr] || posKr;
      if (name) map.set(name, { position, throwSide, batSide });
    });
  } catch { /* 포지션 없으면 그냥 빈 맵 */ }
  return map;
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

    // 상대팀 club_idx: Fakers(clubIdx)가 아닌 팀의 링크에서 추출
    let opponentClubIdx = '';
    $(cells[3]).find('a[href*="club_idx"]').each((_, a) => {
      const href = $(a).attr('href') || '';
      const m = href.match(/club_idx=(\d+)/);
      if (m && m[1] !== clubIdx) { opponentClubIdx = m[1]; return false; }
    });

    // BOX SCORE 링크에서 game_idx 추출
    const boxLink = $(row).find('a[href*="game_idx"]').attr('href') || '';
    const gameIdxMatch = boxLink.match(/game_idx=(\d+)/);

    // 승/무/패 및 점수 파싱
    let score = '';
    let winResult: GameSchedule['winResult'];
    let fakersScore: number | undefined;
    let opponentScore: number | undefined;

    if (isCompleted) {
      const parsed = parseGameResult(gameText);
      if (parsed) {
        fakersScore = parsed.fakersScore;
        opponentScore = parsed.oppScore;
        winResult = parsed.winResult;
        score = `${fakersScore} : ${opponentScore}`;
      }
    }

    schedules.push({
      date,
      time,
      league,
      stadium,
      opponent,
      opponentClubIdx,
      result: resultText,
      score,
      gameIdx: gameIdxMatch?.[1] || '',
      status,
      winResult,
      fakersScore,
      opponentScore,
    });
  });

  return schedules;
}

function parseGameResult(gameText: string): {
  fakersScore: number; oppScore: number; winResult: 'win' | 'loss' | 'draw';
} | null {
  // 명시적 패배
  if (/콜드패|몰수패/.test(gameText)) {
    const nums = [...gameText.matchAll(/\d+/g)].map(m => parseInt(m[0]));
    if (nums.length < 2) return null;
    const fakersScore = Math.min(nums[0], nums[nums.length - 1]);
    const oppScore = Math.max(nums[0], nums[nums.length - 1]);
    return { fakersScore, oppScore, winResult: 'loss' };
  }

  const matches = [...gameText.matchAll(/\d+/g)];
  if (matches.length < 2) return null;

  const first = { val: parseInt(matches[0][0]), idx: matches[0].index! };
  const last  = { val: parseInt(matches[matches.length - 1][0]), idx: matches[matches.length - 1].index! };

  const fakersPos = gameText.indexOf('FAKERS');
  // FAKERS가 첫 번째 숫자보다 앞에 있으면 FAKERS 점수가 먼저
  const fakersFirst = fakersPos >= 0 && fakersPos < first.idx;

  const fakersScore = fakersFirst ? first.val : last.val;
  const oppScore    = fakersFirst ? last.val  : first.val;

  const winResult: 'win' | 'loss' | 'draw' =
    fakersScore > oppScore ? 'win' :
    fakersScore < oppScore ? 'loss' : 'draw';

  return { fakersScore, oppScore, winResult };
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
