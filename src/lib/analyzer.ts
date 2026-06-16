import {
  HitterStats,
  PitcherStats,
  GameSchedule,
  TeamData,
  BatterThreat,
  PitcherAnalysis,
  LineupRecommendation,
  DefensiveAlignment,
  GameAnalysis,
  SeasonRecord,
  LeagueRecord,
} from '@/types/baseball';

export function calculateSeasonRecord(schedule: GameSchedule[]): {
  overall: SeasonRecord;
  byLeague: LeagueRecord[];
} {
  const makeRecord = (games: GameSchedule[]): SeasonRecord => {
    const completed = games.filter(g => g.status === 'completed' && g.winResult);
    const wins   = completed.filter(g => g.winResult === 'win').length;
    const losses = completed.filter(g => g.winResult === 'loss').length;
    const draws  = completed.filter(g => g.winResult === 'draw').length;
    const gamesPlayed = wins + losses + draws;
    return {
      wins, losses, draws, gamesPlayed,
      winRate: gamesPlayed > 0 ? wins / gamesPlayed : 0,
    };
  };

  const leagues = [...new Set(schedule.map(g => g.league))];
  const byLeague: LeagueRecord[] = leagues
    .map(league => ({
      league,
      record: makeRecord(schedule.filter(g => g.league === league)),
    }))
    .filter(r => r.record.gamesPlayed > 0);

  return { overall: makeRecord(schedule), byLeague };
}

export function analyzeBatters(hitters: HitterStats[]): BatterThreat[] {
  return hitters
    .filter((h) => h.games >= 2)
    .map((h) => {
      const contactRate = h.atBats > 0 ? 1 - h.strikeouts / h.atBats : 0;
      const powerRating = h.homeRuns * 4 + h.doubles * 2 + h.triples * 3 + h.rbi;
      const iso = h.slg - h.avg; // isolated power

      let threatLevel: 'high' | 'medium' | 'low' = 'low';
      if (h.ops >= 0.9 || h.homeRuns >= 2 || (h.avg >= 0.35 && h.rbi >= 5)) {
        threatLevel = 'high';
      } else if (h.ops >= 0.7 || h.avg >= 0.28 || h.rbi >= 3) {
        threatLevel = 'medium';
      }

      const reasons: string[] = [];
      if (h.ops >= 0.9) reasons.push(`OPS ${h.ops.toFixed(3)} — 최상위 타자`);
      if (h.homeRuns >= 2) reasons.push(`홈런 ${h.homeRuns}개 — 장타력 주의`);
      if (h.avg >= 0.35) reasons.push(`타율 ${h.avg.toFixed(3)} — 안타 생산력 높음`);
      if (h.stolenBases >= 3) reasons.push(`도루 ${h.stolenBases}개 — 주루 위협`);
      if (h.walks >= 5) reasons.push(`볼넷 ${h.walks}개 — 선구안 좋음`);
      if (h.strikeouts <= 2 && h.atBats >= 10) reasons.push(`삼진 적음(${h.strikeouts}) — 컨택 능력 우수`);
      if (iso >= 0.15) reasons.push(`장타율 높음(ISO ${iso.toFixed(3)})`);

      let hitTendency = '중간 타구 다수';
      if (h.homeRuns >= 2 || iso >= 0.2) hitTendency = '외야 방면 강타 경향';
      else if (h.doubles >= 3) hitTendency = '갭 히터 — 좌우 폴 방향 타구';
      else if (contactRate >= 0.85) hitTendency = '내야 안타 및 단타 위주';

      let defensiveNote = '표준 수비 위치';
      if (h.homeRuns >= 2) defensiveNote = '외야수 깊게 배치';
      else if (h.stolenBases >= 3) defensiveNote = '주자 시 투수 퀵 모션 필수';
      else if (h.doubles >= 3) defensiveNote = '좌우 갭 수비 강화';

      return {
        name: h.name,
        number: h.number,
        threatLevel,
        ops: h.ops,
        avg: h.avg,
        hr: h.homeRuns,
        rbi: h.rbi,
        strikeouts: h.strikeouts,
        walks: h.walks,
        contactRate,
        powerRating,
        reasons: reasons.length > 0 ? reasons : ['평균 수준 타자'],
        defensiveNote,
        hitTendency,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.threatLevel] - order[b.threatLevel] || b.ops - a.ops;
    });
}

export function analyzePitchers(pitchers: PitcherStats[]): PitcherAnalysis[] {
  return pitchers
    .filter((p) => p.innings >= 1)
    .map((p) => {
      const kRate = p.kRate;
      let pitchPower: 'strong' | 'average' | 'weak' = 'average';
      if (kRate >= 0.25 || p.era <= 2.0) pitchPower = 'strong';
      else if (kRate <= 0.1 && p.era >= 5.0) pitchPower = 'weak';

      let threatLevel: 'high' | 'medium' | 'low' = 'low';
      if (p.era <= 2.5 && kRate >= 0.2) threatLevel = 'high';
      else if (p.era <= 4.0 || kRate >= 0.15) threatLevel = 'medium';

      const reasons: string[] = [];
      if (p.era <= 2.0) reasons.push(`방어율 ${p.era.toFixed(2)} — 최상위 투수`);
      if (kRate >= 0.25) reasons.push(`삼진률 ${(kRate * 100).toFixed(1)}% — 구위 강력`);
      if (p.strikeouts >= 10) reasons.push(`탈삼진 ${p.strikeouts}개 — 압도적 구위`);
      if (p.whip <= 1.0) reasons.push(`WHIP ${p.whip.toFixed(2)} — 주자 허용 거의 없음`);
      if (p.wins >= 3) reasons.push(`${p.wins}승 — 리그 상위 투수`);

      let strategy = '적극적 초구 공략 — 볼카운트 유리하게 이끌기';
      if (pitchPower === 'strong') strategy = '선구안 강화 — 볼넷 유도 후 주루로 압박';
      else if (pitchPower === 'weak') strategy = '초구부터 적극 공략 — 강타로 무너뜨리기';

      return {
        name: p.name,
        number: p.number,
        era: p.era,
        whip: p.whip,
        kRate,
        strikeouts: p.strikeouts,
        innings: p.innings,
        wins: p.wins,
        losses: p.losses,
        pitchPower,
        threatLevel,
        reasons: reasons.length > 0 ? reasons : ['평균 수준 투수'],
        strategy,
      };
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.threatLevel] - order[b.threatLevel] || a.era - b.era;
    });
}

export function recommendLineup(ourHitters: HitterStats[]): LineupRecommendation[] {
  if (ourHitters.length === 0) return [];

  const qualified = ourHitters.filter((h) => h.games >= 2);
  const scored = qualified.map((h) => ({
    hitter: h,
    score:
      h.ops * 40 +
      h.avg * 30 +
      (h.stolenBases * 2) / Math.max(h.games, 1) +
      h.rbi / Math.max(h.games, 1),
  }));
  scored.sort((a, b) => b.score - a.score);

  const lineup: LineupRecommendation[] = [];
  const used = new Set<string>();

  const addPlayer = (h: HitterStats, order: number, position: string, reason: string) => {
    if (!used.has(h.name)) {
      lineup.push({ order, name: h.name, position, reason });
      used.add(h.name);
    }
  };

  // 1번: 출루율 높은 선수
  const leadoff = [...scored].sort((a, b) => b.hitter.obp - a.hitter.obp)[0];
  if (leadoff) addPlayer(leadoff.hitter, 1, leadoff.hitter.position || 'CF', `출루율 ${leadoff.hitter.obp.toFixed(3)} — 리그 최상위`);

  // 2번: 컨택·번트 능력자
  const second = scored.filter((s) => !used.has(s.hitter.name))[0];
  if (second) addPlayer(second.hitter, 2, second.hitter.position || '2B', `컨택 능력 우수 (타율 ${second.hitter.avg.toFixed(3)})`);

  // 3번: 팀 최고 타자
  const third = scored.filter((s) => !used.has(s.hitter.name))[0];
  if (third) addPlayer(third.hitter, 3, third.hitter.position || '3B', `팀 최고 OPS ${third.hitter.ops.toFixed(3)}`);

  // 4번: 장타력 최고
  const cleanup = [...scored]
    .filter((s) => !used.has(s.hitter.name))
    .sort((a, b) => b.hitter.homeRuns * 3 + b.hitter.rbi - (a.hitter.homeRuns * 3 + a.hitter.rbi))[0];
  if (cleanup) addPlayer(cleanup.hitter, 4, cleanup.hitter.position || '1B', `장타력 최고 (HR ${cleanup.hitter.homeRuns}, RBI ${cleanup.hitter.rbi})`);

  // 5-9번: 나머지 순서대로
  let order = 5;
  for (const s of scored) {
    if (used.has(s.hitter.name)) continue;
    if (order > 9) break;
    addPlayer(s.hitter, order, s.hitter.position || 'OF', `종합 OPS ${s.hitter.ops.toFixed(3)}`);
    order++;
  }

  return lineup.slice(0, 9);
}

export function recommendDefense(lineup: LineupRecommendation[], opponentBatters: BatterThreat[]): DefensiveAlignment[] {
  const highThreatRight = opponentBatters.filter(
    (b) => b.threatLevel === 'high' && (b.hitTendency.includes('외야') || b.hitTendency.includes('갭'))
  ).length;

  const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];
  const notes: Record<string, string> = {
    C: '빠른 송구 준비 — 도루 저지 집중',
    '1B': '베이스 커버 및 우측 라인 수비',
    '2B': '2루 커버 및 병살 플레이 준비',
    '3B': highThreatRight >= 2 ? '좌측 라인 강화 배치' : '정규 위치',
    SS: '중심 수비 — 병살 및 2루 커버',
    LF: highThreatRight >= 2 ? '깊게 배치 (갭 대비)' : '정규 위치',
    CF: '외야 커버 — 중앙 자리 지키기',
    RF: opponentBatters.some((b) => b.threatLevel === 'high') ? '깊게 배치' : '정규 위치',
    P: '퀵 모션 필수 — 도루 억제',
  };

  return positions.map((pos, i) => ({
    position: pos,
    player: lineup[i]?.name || '미정',
    note: notes[pos] || '정규 위치',
  }));
}

export function predictGame(ourTeam: TeamData, opponent: TeamData): GameAnalysis['prediction'] {
  const ourOpsAvg =
    ourTeam.hitters.length > 0
      ? ourTeam.hitters.reduce((s, h) => s + h.ops, 0) / ourTeam.hitters.length
      : 0.5;
  const oppOpsAvg =
    opponent.hitters.length > 0
      ? opponent.hitters.reduce((s, h) => s + h.ops, 0) / opponent.hitters.length
      : 0.5;

  const ourEraAvg =
    ourTeam.pitchers.length > 0
      ? ourTeam.pitchers.reduce((s, p) => s + p.era, 0) / ourTeam.pitchers.length
      : 5.0;
  const oppEraAvg =
    opponent.pitchers.length > 0
      ? opponent.pitchers.reduce((s, p) => s + p.era, 0) / opponent.pitchers.length
      : 5.0;

  // 타격력 점수 (0~100)
  const ourOffense = Math.min(100, ourOpsAvg * 100);
  const oppOffense = Math.min(100, oppOpsAvg * 100);

  // 투수력 점수 (ERA 낮을수록 좋음)
  const ourPitching = Math.max(0, 100 - ourEraAvg * 12);
  const oppPitching = Math.max(0, 100 - oppEraAvg * 12);

  // 승리 기댓값
  const ourScore = ourOffense * 0.5 + ourPitching * 0.5;
  const oppScore = oppOffense * 0.5 + oppPitching * 0.5;
  const total = ourScore + oppScore;

  let winProb = total > 0 ? (ourScore / total) * 0.9 : 0.45;
  // 무승부 가능성 10%
  const drawProb = 0.08;
  winProb = Math.max(0.1, Math.min(0.82, winProb));
  const lossProb = Math.max(0.1, 1 - winProb - drawProb);

  let verdict: 'win' | 'loss' | 'draw' = 'draw';
  if (winProb > lossProb + 0.1) verdict = 'win';
  else if (lossProb > winProb + 0.1) verdict = 'loss';

  let confidence: 'high' | 'medium' | 'low' = 'medium';
  const diff = Math.abs(winProb - lossProb);
  if (diff >= 0.2) confidence = 'high';
  else if (diff <= 0.08) confidence = 'low';

  const keyFactors: string[] = [];
  if (ourOpsAvg > oppOpsAvg + 0.05) keyFactors.push(`우리팀 타선 우위 (OPS ${ourOpsAvg.toFixed(3)} vs ${oppOpsAvg.toFixed(3)})`);
  if (oppOpsAvg > ourOpsAvg + 0.05) keyFactors.push(`상대 타선 주의 (OPS ${oppOpsAvg.toFixed(3)} vs ${ourOpsAvg.toFixed(3)})`);
  if (ourEraAvg < oppEraAvg - 0.5) keyFactors.push(`우리팀 투수진 안정적 (ERA ${ourEraAvg.toFixed(2)})`);
  if (oppEraAvg < ourEraAvg - 0.5) keyFactors.push(`상대 투수 주의 (ERA ${oppEraAvg.toFixed(2)})`);
  if (keyFactors.length === 0) keyFactors.push('전력 박빙 — 실책·주루가 승부 가른다');

  const summary =
    verdict === 'win'
      ? `우리팀 ${(winProb * 100).toFixed(0)}% 승률 예측 — 타선과 투수력 모두 우위`
      : verdict === 'loss'
      ? `상대팀 우세 — 수비 집중과 적시타 생산이 열쇠`
      : `초접전 예상 — 선취점과 중반 흐름이 결정적`;

  return {
    winProbability: Math.round(winProb * 100),
    lossProbability: Math.round(lossProb * 100),
    drawProbability: Math.round(drawProb * 100),
    verdict,
    confidence,
    summary,
    keyFactors,
  };
}

export function analyzeTeamStrengths(hitters: HitterStats[], pitchers: PitcherStats[]): { strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (hitters.length === 0) return { strengths: ['데이터 없음'], weaknesses: ['데이터 없음'] };

  const avgOps = hitters.reduce((s, h) => s + h.ops, 0) / hitters.length;
  const avgAvg = hitters.reduce((s, h) => s + h.avg, 0) / hitters.length;
  const totalHR = hitters.reduce((s, h) => s + h.homeRuns, 0);
  const totalSB = hitters.reduce((s, h) => s + h.stolenBases, 0);
  const avgEra = pitchers.length > 0 ? pitchers.reduce((s, p) => s + p.era, 0) / pitchers.length : 99;
  const totalK = pitchers.reduce((s, p) => s + p.strikeouts, 0);

  if (avgOps >= 0.75) strengths.push(`팀 평균 OPS ${avgOps.toFixed(3)} — 리그 상위권 타선`);
  else weaknesses.push(`팀 평균 OPS ${avgOps.toFixed(3)} — 타선 강화 필요`);

  if (avgAvg >= 0.3) strengths.push(`팀 타율 ${avgAvg.toFixed(3)} — 높은 안타 생산력`);
  else if (avgAvg < 0.22) weaknesses.push(`팀 타율 ${avgAvg.toFixed(3)} — 장타 의존도 높임 필요`);

  if (totalHR >= 5) strengths.push(`팀 홈런 ${totalHR}개 — 장타력 보유`);
  if (totalSB >= 8) strengths.push(`도루 ${totalSB}개 — 기동력 우수`);

  if (avgEra <= 3.5) strengths.push(`투수진 평균 ERA ${avgEra.toFixed(2)} — 안정적 마운드`);
  else if (avgEra >= 6.0) weaknesses.push(`투수진 평균 ERA ${avgEra.toFixed(2)} — 실점 억제 필요`);

  if (totalK >= 20) strengths.push(`탈삼진 ${totalK}개 — 투수 구위 양호`);

  const highKHitters = hitters.filter((h) => h.atBats > 5 && h.strikeouts / h.atBats >= 0.3);
  if (highKHitters.length >= 3) weaknesses.push(`삼진 많은 타자 ${highKHitters.length}명 — 초구 공략 훈련 필요`);

  return { strengths, weaknesses };
}
