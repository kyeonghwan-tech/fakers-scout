import { NextRequest, NextResponse } from 'next/server';
import { scrapeHitters, scrapePitchers, scrapeSchedule, scrapeTeamName, searchClubIdx } from '@/lib/scraper';

export const preferredRegion = ['icn1', 'sin1', 'hnd1'];
export const maxDuration = 60; // Vercel Pro: 최대 60초
import {
  analyzeBatters,
  analyzePitchers,
  recommendLineup,
  recommendDefense,
  predictGame,
  analyzeTeamStrengths,
  calculateSeasonRecord,
} from '@/lib/analyzer';
import { TeamData, GameAnalysis } from '@/types/baseball';

const FAKERS_CLUB_IDX = '13588';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const gameIndexParam = sp.get('gameIndex');
  const gameIndex = gameIndexParam !== null ? parseInt(gameIndexParam, 10) : 0;

  try {
    // Fakers 데이터 병렬 수집
    const [fakersHitters, fakersPitchers, fakersSchedule] = await Promise.all([
      scrapeHitters(FAKERS_CLUB_IDX),
      scrapePitchers(FAKERS_CLUB_IDX),
      scrapeSchedule(FAKERS_CLUB_IDX),
    ]);

    const fakersTeam: TeamData = {
      clubIdx: FAKERS_CLUB_IDX,
      name: 'Fakers',
      players: [],
      hitters: fakersHitters,
      pitchers: fakersPitchers,
      schedule: fakersSchedule,
    };

    if (fakersSchedule.length === 0) {
      return NextResponse.json({ error: '경기 일정을 불러올 수 없습니다.' }, { status: 404 });
    }

    const targetGame = fakersSchedule[Math.min(gameIndex, fakersSchedule.length - 1)];

    // 상대팀 club_idx 확보: 이름 검색
    let oppIdx = targetGame.opponentClubIdx;
    if (!oppIdx && targetGame.opponent) {
      oppIdx = await searchClubIdx(targetGame.opponent);
    }

    // 상대팀 데이터 수집 (club_idx 없으면 빈 배열)
    const [oppHitters, oppPitchers, oppName] = await Promise.all([
      oppIdx ? scrapeHitters(oppIdx).catch(() => []) : Promise.resolve([]),
      oppIdx ? scrapePitchers(oppIdx).catch(() => []) : Promise.resolve([]),
      oppIdx ? scrapeTeamName(oppIdx).catch(() => targetGame.opponent) : Promise.resolve(targetGame.opponent || '상대팀'),
    ]);

    const opponentTeam: TeamData = {
      clubIdx: oppIdx,
      name: (oppName || targetGame.opponent) ?? '상대팀',
      players: [],
      hitters: oppHitters,
      pitchers: oppPitchers,
      schedule: [],
    };

    // 분석
    const batterThreats = analyzeBatters(oppHitters);
    const pitcherAnalysis = analyzePitchers(oppPitchers);
    const lineupRecommendation = recommendLineup(fakersHitters);
    const defensiveAlignment = recommendDefense(lineupRecommendation, batterThreats);
    const { strengths: ourStrengths, weaknesses: ourWeaknesses } = analyzeTeamStrengths(fakersHitters, fakersPitchers);
    const { strengths: oppStrengths, weaknesses: oppWeaknesses } = analyzeTeamStrengths(oppHitters, oppPitchers);

    const defensiveNotes: string[] = [];
    const highThreats = batterThreats.filter((b) => b.threatLevel === 'high');
    if (highThreats.length > 0) {
      defensiveNotes.push(`위험 타자 ${highThreats.length}명 집중 마크 필요`);
      highThreats.forEach((b) => defensiveNotes.push(`${b.name}: ${b.defensiveNote}`));
    }
    if (batterThreats.some((b) => b.reasons.some((r) => r.includes('도루')))) {
      defensiveNotes.push('도루 위협 있음 — 투수 퀵 모션 및 포수 빠른 송구 필수');
    }
    if (oppHitters.length === 0) {
      defensiveNotes.push('상대팀 통계 데이터를 찾을 수 없어 분석이 제한됩니다.');
    }

    const prediction = predictGame(fakersTeam, opponentTeam);

    const analysis: GameAnalysis = {
      ourTeam: fakersTeam,
      opponent: opponentTeam,
      upcomingGame: targetGame,
      seasonRecord: calculateSeasonRecord(fakersSchedule),
      batterThreats,
      pitcherAnalysis,
      lineupRecommendation,
      defensiveAlignment,
      ourTeamStrengths: ourStrengths,
      ourTeamWeaknesses: ourWeaknesses,
      opponentStrengths: oppStrengths,
      opponentWeaknesses: oppWeaknesses,
      defensiveNotes,
      prediction,
    };

    return NextResponse.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('분석 오류:', msg);
    return NextResponse.json(
      { error: `데이터 수집 오류: ${msg}` },
      { status: 500 }
    );
  }
}
