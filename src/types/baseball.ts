export interface HitterStats {
  name: string;
  number: string;
  position: string;
  batSide: string;
  games: number;
  atBats: number;
  plateAppearances: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  stolenBases: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  totalBases: number;
  sacHits: number;
  sacFlies: number;
}

export interface PitcherStats {
  name: string;
  number: string;
  throwSide: string;
  games: number;
  wins: number;
  losses: number;
  saves: number;
  innings: number;
  era: number;
  whip: number;
  strikeouts: number;
  walks: number;
  hits: number;
  homeRuns: number;
  earnedRuns: number;
  pitches: number;
  battersFaced: number;
  kRate: number; // strikeout rate
  bbRate: number;
}

export interface Player {
  name: string;
  number: string;
  position: string;
  throwSide: string;
  batSide: string;
  war: number;
}

export interface GameSchedule {
  date: string;
  time: string;
  league: string;
  stadium: string;
  opponent: string;
  opponentClubIdx: string;
  result?: string;
  score?: string;
  gameIdx?: string;
  status: 'upcoming' | 'completed' | 'pending';
  winResult?: 'win' | 'loss' | 'draw';
  fakersScore?: number;
  opponentScore?: number;
}

export interface SeasonRecord {
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: number;
}

export interface LeagueRecord {
  league: string;
  record: SeasonRecord;
}

export interface TeamData {
  clubIdx: string;
  name: string;
  players: Player[];
  hitters: HitterStats[];
  pitchers: PitcherStats[];
  schedule: GameSchedule[];
}

export interface BatterThreat {
  name: string;
  number: string;
  threatLevel: 'high' | 'medium' | 'low';
  ops: number;
  avg: number;
  hr: number;
  rbi: number;
  strikeouts: number;
  walks: number;
  contactRate: number;
  powerRating: number;
  reasons: string[];
  defensiveNote: string;
  hitTendency: string;
}

export interface PitcherAnalysis {
  name: string;
  number: string;
  era: number;
  whip: number;
  kRate: number;
  strikeouts: number;
  innings: number;
  wins: number;
  losses: number;
  pitchPower: 'strong' | 'average' | 'weak';
  threatLevel: 'high' | 'medium' | 'low';
  reasons: string[];
  strategy: string;
}

export interface LineupRecommendation {
  order: number;
  name: string;
  position: string;
  reason: string;
}

export interface DefensiveAlignment {
  position: string;
  player: string;
  note: string;
}

export interface OurBatterAnalysis {
  name: string;
  number: string;
  position: string;
  batSide: string;
  seasons: number;
  games: number;
  atBats: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  stolenBases: number;
  homeRuns: number;
  rbi: number;
  strikeouts: number;
  walks: number;
  // 세이버메트릭스
  woba: number;          // 가중 출루율
  iso: number;           // 순수 장타력 (SLG - AVG)
  babip: number;         // 인플레이 타율 (운 지수)
  bbPct: number;         // 볼넷률
  kPct: number;          // 삼진률
  batterType: 'contact' | 'power' | 'speed' | 'obp' | 'balanced'; // 타자 유형
  batterTypeLabel: string;
  battingOrderRole: 'leadoff' | 'second' | 'cleanup' | 'rbi' | 'bottom';
  battingOrderNote: string;
  defenseNote: string;
  strengths: string[];
  weaknesses: string[];
}

export interface OurPitcherAnalysis {
  name: string;
  number: string;
  throwSide: string;
  seasons: number;
  games: number;
  wins: number;
  losses: number;
  innings: number;
  era: number;
  whip: number;
  strikeouts: number;
  walks: number;
  kRate: number;
  bbRate: number;
  // 세이버메트릭스
  fip: number;           // 수비 무관 방어율
  k9: number;            // 9이닝당 탈삼진
  bb9: number;           // 9이닝당 볼넷
  kbb: number;           // K/BB 비율
  eraMinusFip: number;   // ERA - FIP (양수=운 좋음, 음수=실력이 ERA보다 좋음)
  role: 'ace' | 'starter' | 'reliever' | 'closer';
  roleNote: string;
  strengths: string[];
  weaknesses: string[];
  improvementTip: string;
}

export interface GameAnalysis {
  ourTeam: TeamData;
  opponent: TeamData;
  upcomingGame: GameSchedule;
  seasonRecord: { overall: SeasonRecord; byLeague: LeagueRecord[] };
  opponentSeasonRecord: { overall: SeasonRecord; byLeague: LeagueRecord[] };
  batterThreats: BatterThreat[];
  pitcherAnalysis: PitcherAnalysis[];
  lineupRecommendation: LineupRecommendation[];
  defensiveAlignment: DefensiveAlignment[];
  ourTeamStrengths: string[];
  ourTeamWeaknesses: string[];
  opponentStrengths: string[];
  opponentWeaknesses: string[];
  defensiveNotes: string[];
  prediction: {
    winProbability: number;
    lossProbability: number;
    drawProbability: number;
    verdict: 'win' | 'loss' | 'draw';
    confidence: 'high' | 'medium' | 'low';
    summary: string;
    keyFactors: string[];
  };
  ourBatterAnalysis: OurBatterAnalysis[];
  ourPitcherAnalysis: OurPitcherAnalysis[];
}
