'use client';

import { OurBatterAnalysis } from '@/types/baseball';

interface Props {
  batters: OurBatterAnalysis[];
}

const ROLE_LABEL: Record<OurBatterAnalysis['battingOrderRole'], string> = {
  leadoff: '리드오프',
  second: '2번형',
  cleanup: '클린업',
  rbi: '중심타선',
  bottom: '하위타선',
};

const ROLE_COLOR: Record<OurBatterAnalysis['battingOrderRole'], string> = {
  leadoff: 'bg-green-600',
  second: 'bg-blue-600',
  cleanup: 'bg-red-600',
  rbi: 'bg-orange-600',
  bottom: 'bg-gray-600',
};

export default function OurBatterCard({ batters }: Props) {
  if (batters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">📊</div>
        <p>출전 3경기 이상 타자 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">🏏 우리팀 타자 분석</h2>
      {batters.map((b) => (
        <div key={b.name} className="bg-gray-700 rounded-xl p-4 border border-gray-600">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{b.name}</span>
                {b.number && (
                  <span className="text-gray-400 text-sm">#{b.number}</span>
                )}
                {b.position && (
                  <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">{b.position}</span>
                )}
                {b.batSide && (
                  <span className="text-xs text-gray-400">{b.batSide}타</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">{b.defenseNote}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white ${ROLE_COLOR[b.battingOrderRole]}`}>
              {ROLE_LABEL[b.battingOrderRole]}
            </span>
          </div>

          {/* 핵심 스탯 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">타율</div>
              <div className="font-bold text-white">{b.avg.toFixed(3)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">OPS</div>
              <div className={`font-bold ${b.ops >= 0.8 ? 'text-green-400' : b.ops >= 0.6 ? 'text-yellow-400' : 'text-gray-300'}`}>
                {b.ops.toFixed(3)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">도루</div>
              <div className="font-bold text-white">{b.stolenBases}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">타점</div>
              <div className="font-bold text-white">{b.rbi}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">출루율</div>
              <div className="font-bold text-white">{b.obp.toFixed(3)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">홈런</div>
              <div className="font-bold text-white">{b.homeRuns}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">{b.games}경기</div>
              <div className="font-bold text-white">{b.atBats}타수</div>
            </div>
          </div>

          {/* 타순 역할 노트 */}
          <div className="text-xs text-blue-300 mb-3 bg-blue-900/30 rounded px-2 py-1">
            ▸ {b.battingOrderNote}
          </div>

          {/* 강점/약점 */}
          <div className="flex flex-wrap gap-1">
            {b.strengths.map((s, i) => (
              <span key={i} className="text-xs bg-green-900/50 text-green-300 border border-green-700 px-2 py-0.5 rounded-full">
                ✓ {s}
              </span>
            ))}
            {b.weaknesses.map((w, i) => (
              <span key={i} className="text-xs bg-red-900/50 text-red-300 border border-red-700 px-2 py-0.5 rounded-full">
                △ {w}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
