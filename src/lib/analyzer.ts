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
  OurBatterAnalysis,
  OurPitcherAnalysis,
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

  const maxGames = Math.max(...ourHitters.map(h => h.games), 1);
  const minGames = Math.max(5, Math.floor(maxGames * 0.3));
  const qualified = ourHitters.filter((h) => h.games >= minGames && h.atBats >= 30);
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

  const FIELD_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];
  const assigned = new Map<string, string>(); // position → player name
  const usedPlayers = new Set<string>();

  // 1단계: 등록 포지션과 일치하는 선수를 우선 배치 (타순 높을수록 우선)
  for (const entry of lineup) {
    const pos = entry.position;
    if (FIELD_POSITIONS.includes(pos) && !assigned.has(pos) && !usedPlayers.has(entry.name)) {
      assigned.set(pos, entry.name);
      usedPlayers.add(entry.name);
    }
  }

  // 2단계: 남은 포지션에 미배치 선수를 타순 순서대로 채움
  const remaining = lineup.filter(e => !usedPlayers.has(e.name));
  let ri = 0;
  for (const pos of FIELD_POSITIONS) {
    if (!assigned.has(pos)) {
      while (ri < remaining.length && usedPlayers.has(remaining[ri].name)) ri++;
      if (ri < remaining.length) {
        assigned.set(pos, remaining[ri].name);
        usedPlayers.add(remaining[ri].name);
        ri++;
      }
    }
  }

  return FIELD_POSITIONS.map((pos) => ({
    position: pos,
    player: assigned.get(pos) || '미정',
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

export function analyzeOurBatters(hitters: HitterStats[]): OurBatterAnalysis[] {
  const maxGames = Math.max(...hitters.map(h => h.games), 1);
  const minGames = Math.max(5, Math.floor(maxGames * 0.3));
  const qualified = hitters.filter(h => h.games >= minGames && h.atBats >= 30);

  return qualified.map(h => {
    const pa = Math.max(h.plateAppearances || h.atBats, 1);

    // ── 세이버메트릭스 계산 ──────────────────────────────────
    // wOBA (가중 출루율): 각 결과에 MLB 가중치 적용
    const woba = (0.69 * h.walks + 0.72 * h.hitByPitch +
      0.89 * h.singles + 1.27 * h.doubles +
      1.62 * h.triples + 2.10 * h.homeRuns) / pa;

    // ISO (순수 장타력): SLG - AVG
    const iso = h.slg - h.avg;

    // BABIP (인플레이 타율): 운 지수, 리그 평균 ~0.300
    const babipDenom = h.atBats - h.strikeouts - h.homeRuns + (h.sacFlies || 0);
    const babip = babipDenom > 0 ? (h.hits - h.homeRuns) / babipDenom : 0;

    // BB%, K%
    const bbPct = h.walks / pa;
    const kPct = h.strikeouts / pa;

    const sbPerGame = h.stolenBases / h.games;
    const rbiPerGame = h.rbi / h.games;
    const soRate = h.atBats > 0 ? h.strikeouts / h.atBats : 0;

    // ── 타자 유형 분류 ────────────────────────────────────────
    let batterType: OurBatterAnalysis['batterType'];
    let batterTypeLabel: string;
    if (iso >= 0.15 && h.homeRuns >= 2) {
      batterType = 'power'; batterTypeLabel = '💪 장타형';
    } else if (sbPerGame >= 0.6 && h.obp >= 0.40) {
      batterType = 'speed'; batterTypeLabel = '⚡ 주루형';
    } else if (h.avg >= 0.340 && soRate <= 0.18) {
      batterType = 'contact'; batterTypeLabel = '🎯 컨택형';
    } else if (h.obp >= 0.420 && bbPct >= 0.12) {
      batterType = 'obp'; batterTypeLabel = '👁️ 출루형';
    } else {
      batterType = 'balanced'; batterTypeLabel = '⚖️ 균형형';
    }

    // ── 타순 역할 ────────────────────────────────────────────
    let battingOrderRole: OurBatterAnalysis['battingOrderRole'];
    let battingOrderNote: string;
    if (h.obp >= 0.45 && sbPerGame >= 0.5) {
      battingOrderRole = 'leadoff';
      battingOrderNote = `1번 최적 — OBP ${h.obp.toFixed(3)} (출루형 리드오프), 경기당 도루 ${sbPerGame.toFixed(2)}개로 득점 기회 창출`;
    } else if (h.homeRuns >= 2 || rbiPerGame >= 1.0) {
      battingOrderRole = 'cleanup';
      battingOrderNote = `3~4번 최적 — HR ${h.homeRuns}개·경기당 타점 ${rbiPerGame.toFixed(2)}개, wOBA ${woba.toFixed(3)}로 클린업 역할`;
    } else if (h.avg >= 0.35 && soRate <= 0.20) {
      battingOrderRole = 'second';
      battingOrderNote = `2번 최적 — 타율 ${h.avg.toFixed(3)}·삼진율 ${(kPct * 100).toFixed(0)}%로 번트·진루 상황 관리`;
    } else if (rbiPerGame >= 0.7) {
      battingOrderRole = 'rbi';
      battingOrderNote = `5~6번 최적 — 경기당 타점 ${rbiPerGame.toFixed(2)}개, 주자 있을 때 강함`;
    } else {
      battingOrderRole = 'bottom';
      battingOrderNote = `하위 타선 — OPS ${h.ops.toFixed(3)}, BB% ${(bbPct * 100).toFixed(0)}%로 볼넷 출루 기여 가능`;
    }

    // ── 수비 코멘트 ──────────────────────────────────────────
    const posMap: Record<string, string> = {
      C: '포수', '1B': '1루수', '2B': '2루수', '3B': '3루수',
      SS: '유격수', LF: '좌익수', CF: '중견수', RF: '우익수', P: '투수',
    };
    const posDefNote: Record<string, string> = {
      C:  '배터리 리더십·도루 저지 — 포수 경험이 투수 운용의 핵심',
      '1B': '1루 커버·우측 라인 수비 — 장타자 배치 적합',
      '2B': '병살 플레이·2루 커버 — 내야 핵심 연결 포지션',
      '3B': '좌측 라인 수비·핫코너 — 강한 어깨 필요',
      SS:  '내야 컨트롤 타워 — 수비 범위와 송구 정확도 최우선',
      LF:  '좌익 수비 — 도루 견제 시 좌익수 백업 필수',
      CF:  '외야 중앙 커버 — 수비 범위가 가장 넓은 포지션',
      RF:  '우익 수비 — 강한 어깨로 3루 자살 저지',
      P:   '투수 등록 — 타자로도 기여, 퀵 모션 자가 관리 중요',
    };
    const defenseNote = h.position
      ? `${posMap[h.position] || h.position} 등록 — ${posDefNote[h.position] || '정규 포지션 담당'}`
      : '포지션 미등록 — 수비 유연성으로 팀 상황 대응';

    // ── 강점 / 약점 ──────────────────────────────────────────
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (woba >= 0.370) strengths.push(`wOBA ${woba.toFixed(3)} — MLB 우수 수준의 득점 기여`);
    else if (woba >= 0.320) strengths.push(`wOBA ${woba.toFixed(3)} — 평균 이상 공격력`);
    if (h.obp >= 0.430) strengths.push(`OBP ${h.obp.toFixed(3)} — 리그 최상위 출루율`);
    else if (h.obp >= 0.370) strengths.push(`OBP ${h.obp.toFixed(3)} — 우수한 출루 능력`);
    if (iso >= 0.15) strengths.push(`ISO ${iso.toFixed(3)} — 강한 순수 장타력`);
    if (sbPerGame >= 0.7) strengths.push(`경기당 도루 ${sbPerGame.toFixed(2)}개 — 상위권 주루 위협`);
    if (bbPct >= 0.15) strengths.push(`BB% ${(bbPct * 100).toFixed(0)}% — 뛰어난 선구안`);
    if (h.avg >= 0.360) strengths.push(`타율 ${h.avg.toFixed(3)} — 높은 컨택 능력`);
    if (babip >= 0.380) strengths.push(`BABIP ${babip.toFixed(3)} — 인플레이 타구 처리 능력 우수`);
    if (strengths.length === 0) strengths.push('꾸준한 출전으로 팀 기여 중');

    if (kPct >= 0.28) weaknesses.push(`K% ${(kPct * 100).toFixed(0)}% — 높은 삼진율, 초구 공략 패턴 개선 필요`);
    else if (kPct >= 0.22) weaknesses.push(`K% ${(kPct * 100).toFixed(0)}% — 삼진 다소 많음`);
    if (iso < 0.06 && h.atBats >= 40) weaknesses.push(`ISO ${iso.toFixed(3)} — 장타력 부족, 당겨치기 훈련 권장`);
    if (bbPct < 0.07 && h.atBats >= 40) weaknesses.push(`BB% ${(bbPct * 100).toFixed(0)}% — 볼 선구안 개선 필요`);
    if (babip < 0.250 && h.atBats >= 40) weaknesses.push(`BABIP ${babip.toFixed(3)} — 인플레이 타구 운 나쁨, 타구 질 개선 여지`);
    if (h.avg < 0.220 && h.atBats >= 40) weaknesses.push(`타율 ${h.avg.toFixed(3)} — 컨택률 향상 필요`);
    if (weaknesses.length === 0) weaknesses.push('현재 수준 유지 — 꾸준함이 강점');

    return {
      name: h.name,
      number: h.number,
      position: h.position,
      batSide: h.batSide,
      seasons: 1,
      games: h.games,
      atBats: h.atBats,
      avg: h.avg,
      obp: h.obp,
      slg: h.slg,
      ops: h.ops,
      stolenBases: h.stolenBases,
      homeRuns: h.homeRuns,
      rbi: h.rbi,
      strikeouts: h.strikeouts,
      walks: h.walks,
      woba,
      iso,
      babip,
      bbPct,
      kPct,
      batterType,
      batterTypeLabel,
      battingOrderRole,
      battingOrderNote,
      defenseNote,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
    };
  }).sort((a, b) => b.woba - a.woba);
}

export function analyzeOurPitchers(pitchers: PitcherStats[]): OurPitcherAnalysis[] {
  const maxGames = Math.max(...pitchers.map(p => p.games), 1);
  const minGames = Math.max(3, Math.floor(maxGames * 0.25));
  const qualified = pitchers.filter(p => p.games >= minGames && p.innings >= 5);
  if (qualified.length === 0) return [];

  const maxInnings = Math.max(...qualified.map(p => p.innings));

  return qualified.map(p => {
    const ip = Math.max(p.innings, 0.1);

    // ── 세이버메트릭스 계산 ──────────────────────────────────
    // FIP (수비 무관 방어율): 투수 순수 능력 지표
    // 상수 3.20은 사회인야구 리그 수준 조정값
    const fip = (13 * p.homeRuns + 3 * (p.walks + (p.battersFaced > 0 ? 0 : 0)) - 2 * p.strikeouts) / ip + 3.20;

    // K/9, BB/9
    const k9 = (p.strikeouts * 9) / ip;
    const bb9 = (p.walks * 9) / ip;

    // K/BB (제구+구위 종합)
    const kbb = p.walks > 0 ? p.strikeouts / p.walks : p.strikeouts;

    // ERA - FIP: 양수 = 수비 도움 받음(운), 음수 = 실제 능력이 ERA보다 좋음
    const eraMinusFip = p.era - fip;

    // ── 역할 판단 ────────────────────────────────────────────
    let role: OurPitcherAnalysis['role'];
    let roleNote: string;
    const ipPerGame = ip / p.games;

    if (p.saves >= 1) {
      role = 'closer';
      roleNote = `마무리 — 세이브 ${p.saves}개, 경기 마무리 전담`;
    } else if (p.innings >= maxInnings * 0.85) {
      role = 'ace';
      roleNote = `에이스 — 팀 최다 ${ip.toFixed(1)}이닝·경기당 ${ipPerGame.toFixed(1)}이닝 소화`;
    } else if (ipPerGame >= 3.0) {
      role = 'starter';
      roleNote = `선발 — 경기당 평균 ${ipPerGame.toFixed(1)}이닝 투구`;
    } else {
      role = 'reliever';
      roleNote = `불펜 — 경기당 ${ipPerGame.toFixed(1)}이닝, 중간계투 역할`;
    }

    // ── 강점 / 약점 ──────────────────────────────────────────
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    if (fip <= 4.0) strengths.push(`FIP ${fip.toFixed(2)} — 수비 무관 순수 투구 능력 우수`);
    if (k9 >= 8.0) strengths.push(`K/9 ${k9.toFixed(1)} — 탈삼진 능력 뛰어남`);
    else if (k9 >= 5.5) strengths.push(`K/9 ${k9.toFixed(1)} — 평균 이상 탈삼진`);
    if (kbb >= 2.5) strengths.push(`K/BB ${kbb.toFixed(2)} — 제구와 구위 모두 안정적`);
    if (p.whip <= 1.5) strengths.push(`WHIP ${p.whip.toFixed(2)} — 주자 허용 적음`);
    if (eraMinusFip < -1.0) strengths.push(`ERA-FIP ${eraMinusFip.toFixed(2)} — 실력이 ERA보다 좋음 (수비 불운)`);
    if (p.wins >= 3) strengths.push(`${p.wins}승 — 팀 승리에 직접 기여`);
    if (strengths.length === 0) strengths.push('팀 마운드 구성원으로 꾸준히 역할 수행 중');

    if (bb9 >= 5.0) weaknesses.push(`BB/9 ${bb9.toFixed(1)} — 볼넷 과다, 제구력 집중 훈련 필요`);
    else if (bb9 >= 3.5) weaknesses.push(`BB/9 ${bb9.toFixed(1)} — 볼넷 다소 많음, 초구 스트라이크 강화`);
    if (k9 < 4.0) weaknesses.push(`K/9 ${k9.toFixed(1)} — 탈삼진 부족, 결정구 배구 강화 필요`);
    if (eraMinusFip >= 1.5) weaknesses.push(`ERA-FIP +${eraMinusFip.toFixed(2)} — ERA가 FIP보다 높음, 수비 도움 필요`);
    if (p.era >= 7.0) weaknesses.push(`ERA ${p.era.toFixed(2)} — 실점 억제 개선 시급`);
    else if (p.era >= 5.0) weaknesses.push(`ERA ${p.era.toFixed(2)} — 실점 줄이기 과제`);
    if (weaknesses.length === 0) weaknesses.push('현재 수준 유지 — 체력 관리가 핵심');

    // ── 개선 팁 ──────────────────────────────────────────────
    let improvementTip: string;
    if (bb9 >= 5.0) {
      improvementTip = `BB/9 ${bb9.toFixed(1)} — 볼넷이 최대 약점. 초구 스트라이크 비율을 높이고 카운트 유리 상황에서 승부구 직결`;
    } else if (k9 < 4.0 && kbb < 1.5) {
      improvementTip = `K/9 ${k9.toFixed(1)}·K/BB ${kbb.toFixed(2)} — 탈삼진도 제구도 부족. 직구 구위 향상 또는 변화구 결정구 개발 권장`;
    } else if (eraMinusFip >= 2.0) {
      improvementTip = `ERA-FIP +${eraMinusFip.toFixed(2)} — FIP 대비 ERA가 높아 수비 지원이 필요. 땅볼 유도 투구로 수비 부담 분산`;
    } else if (p.era >= 5.0 && kbb >= 2.0) {
      improvementTip = `제구(K/BB ${kbb.toFixed(2)})는 양호하나 ERA ${p.era.toFixed(2)} — 피안타 줄이기 위해 배구 다양화 및 타자 데이터 활용`;
    } else {
      improvementTip = `전반적으로 안정적 (FIP ${fip.toFixed(2)}·K/BB ${kbb.toFixed(2)}). 체력 관리와 등판 간격 조절로 시즌 후반 컨디션 유지`;
    }

    return {
      name: p.name,
      number: p.number,
      throwSide: p.throwSide,
      seasons: 1,
      games: p.games,
      wins: p.wins,
      losses: p.losses,
      innings: p.innings,
      era: p.era,
      whip: p.whip,
      strikeouts: p.strikeouts,
      walks: p.walks,
      kRate: p.kRate,
      bbRate: p.bbRate,
      fip,
      k9,
      bb9,
      kbb,
      eraMinusFip,
      role,
      roleNote,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      improvementTip,
    };
  }).sort((a, b) => {
    const roleOrder = { ace: 0, starter: 1, closer: 2, reliever: 3 };
    return roleOrder[a.role] - roleOrder[b.role] || a.era - b.era;
  });
}
