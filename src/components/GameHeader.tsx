'use client';

import { GameSchedule } from '@/types/baseball';

interface Props {
  game: GameSchedule;
  ourTeamName: string;
  opponentName: string;
}

export default function GameHeader({ game, ourTeamName, opponentName }: Props) {
  const leagueBadge = game.league === 'HS리그'
    ? 'bg-blue-600'
    : game.league === '동작 노들리그'
    ? 'bg-green-600'
    : 'bg-gray-600';

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-750 rounded-2xl p-6 border border-gray-700 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-3 py-1 rounded-full text-white font-semibold ${leagueBadge}`}>
          {game.league}
        </span>
        <span className="text-gray-400 text-sm">{game.date} {game.time}</span>
        <span className="text-gray-500 text-xs">📍 {game.stadium}</span>
      </div>
      <div className="flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="text-2xl font-black text-blue-400">{ourTeamName}</div>
          <div className="text-gray-400 text-xs mt-1">홈팀</div>
        </div>
        <div className="text-4xl font-black text-gray-500">VS</div>
        <div className="text-center">
          <div className="text-2xl font-black text-red-400">{opponentName}</div>
          <div className="text-gray-400 text-xs mt-1">원정팀</div>
        </div>
      </div>
    </div>
  );
}
