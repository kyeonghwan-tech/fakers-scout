'use client';

import { LineupRecommendation, DefensiveAlignment } from '@/types/baseball';

interface Props {
  lineup: LineupRecommendation[];
  defense: DefensiveAlignment[];
}

const orderColors = ['text-yellow-400', 'text-blue-400', 'text-green-400', 'text-red-400'];

export default function LineupCard({ lineup, defense }: Props) {
  return (
    <div className="space-y-6">
      {/* 타순 추천 */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">📋 추천 라인업</h2>
        {lineup.length === 0 && <p className="text-gray-400 text-sm">라인업 데이터가 없습니다.</p>}
        <div className="space-y-2">
          {lineup.map((player) => (
            <div
              key={player.order}
              className="flex items-start gap-3 bg-gray-700/50 rounded-lg px-4 py-2"
            >
              <span className={`text-lg font-black w-6 text-center ${orderColors[(player.order - 1) % orderColors.length] || 'text-gray-300'}`}>
                {player.order}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{player.name}</span>
                  <span className="text-gray-400 text-xs bg-gray-600 px-1.5 py-0.5 rounded">
                    {player.position}
                  </span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{player.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 수비 위치 */}
      <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white mb-4">🛡️ 수비 배치 추천</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {defense.map((d) => (
            <div key={d.position} className="flex gap-3 bg-gray-700/50 rounded-lg px-3 py-2">
              <span className="text-blue-400 font-bold text-sm w-8 shrink-0">{d.position}</span>
              <div>
                <div className="text-white text-sm font-medium">{d.player}</div>
                <div className="text-gray-400 text-xs">{d.note}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
