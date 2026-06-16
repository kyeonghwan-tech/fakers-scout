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

export interface GameAnalysis {
  ourTeam: TeamData;
  opponent: TeamData;
  upcomingGame: GameSchedule;
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
}
