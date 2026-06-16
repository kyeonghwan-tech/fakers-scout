import { NextRequest, NextResponse } from 'next/server';
import { scrapeHitters, scrapePitchers, scrapeSchedule, scrapeTeamName } from '@/lib/scraper';
import {
  analyzeBatters,
  analyzePitchers,
  recommendLineup,
  recommendDefense,
  predictGame,
  analyzeTeamStrengths,
} from '@/lib/analyzer';
import { TeamData, GameAnalysis } from '@/types/baseball';

const FAKERS_CLUB_IDX = '13588';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const opponentClubIdx = searchParams.get('opponent') || '';

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

    // 다음 경기 상대 파악
    const upcomingGames = fakersSchedule.filter(
      (g) => g.status === 'upcoming' || g.status === 'pending'
    );
    const targetGame = opponentClubIdx
      ? fakersSchedule.find((g) => g.opponentClubIdx === opponentClubIdx)
      : upcomingGames[0];

    if (!targetGame) {
      return NextResponse.json({ error: '예정된 경기가 없습니다.' }, { status: 404 });
    }

    const oppIdx = opponentClubIdx || targetGame.opponentClubIdx;

    // 상대팀 데이터 수집
    const [oppHitters, oppPitchers, oppName] = await Promise.all([
      oppIdx ? scrapeHitters(oppIdx) : Promise.resolve([]),
      oppIdx ? scrapePitchers(oppIdx) : Promise.resolve([]),
      oppIdx ? scrapeTeamName(oppIdx) : Promise.resolve(targetGame.opponent || '상대팀'),
    ]);

    const opponentTeam: TeamData = {
      clubIdx: oppIdx,
      name: oppName || targetGame.opponent,
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
    const { strengths: ourStrengths, weaknesses: ourWeaknesses } = analyzeTeamStrengths(
      fakersHitters,
      fakersPitchers
    );
    const { strengths: oppStrengths, weaknesses: oppWeaknesses } = analyzeTeamStrengths(
      oppHitters,
      oppPitchers
    );

    const defensiveNotes: string[] = [];
    const highThreats = batterThreats.filter((b) => b.threatLevel === 'high');
    if (highThreats.length > 0) {
      defensiveNotes.push(`위험 타자 ${highThreats.length}명 집중 마크 필요`);
      highThreats.forEach((b) => defensiveNotes.push(`${b.name}: ${b.defensiveNote}`));
    }
    const fastRunners = batterThreats.filter((b) => b.reasons.some((r) => r.includes('도루')));
    if (fastRunners.length > 0) {
      defensiveNotes.push('도루 위협 있음 — 투수 퀵 모션 및 포수 빠른 송구 필수');
    }

    const prediction = predictGame(fakersTeam, opponentTeam);

    const analysis: GameAnalysis = {
      ourTeam: fakersTeam,
      opponent: opponentTeam,
      upcomingGame: targetGame,
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
    console.error('분석 오류:', err);
    return NextResponse.json(
      { error: '데이터 수집 중 오류가 발생했습니다. gameone.kr 접근을 확인해 주세요.' },
      { status: 500 }
    );
  }
}
