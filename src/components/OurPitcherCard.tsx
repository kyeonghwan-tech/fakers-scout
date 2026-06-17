'use client';

import { OurPitcherAnalysis } from '@/types/baseball';

interface Props {
  pitchers: OurPitcherAnalysis[];
}

const ROLE_LABEL: Record<OurPitcherAnalysis['role'], string> = {
  ace: '에이스',
  starter: '선발',
  reliever: '중계',
  closer: '마무리',
};

const ROLE_COLOR: Record<OurPitcherAnalysis['role'], string> = {
  ace: 'bg-yellow-600',
  starter: 'bg-blue-600',
  reliever: 'bg-purple-600',
  closer: 'bg-red-600',
};

export default function OurPitcherCard({ pitchers }: Props) {
  if (pitchers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">⚾</div>
        <p>출전 2경기 이상 투수 데이터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-4">⚡ 우리팀 투수 분석</h2>
      {pitchers.map((p) => (
        <div key={p.name} className="bg-gray-700 rounded-xl p-4 border border-gray-600">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{p.name}</span>
                {p.number && (
                  <span className="text-gray-400 text-sm">#{p.number}</span>
                )}
                {p.throwSide && (
                  <span className="text-xs text-gray-400">{p.throwSide}투</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-1">{p.roleNote}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white ${ROLE_COLOR[p.role]}`}>
              {ROLE_LABEL[p.role]}
            </span>
          </div>

          {/* 핵심 스탯 */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">ERA</div>
              <div className={`font-bold ${p.era <= 3.0 ? 'text-green-400' : p.era <= 5.0 ? 'text-yellow-400' : 'text-red-400'}`}>
                {p.era.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">WHIP</div>
              <div className={`font-bold ${p.whip <= 1.2 ? 'text-green-400' : p.whip <= 1.8 ? 'text-yellow-400' : 'text-red-400'}`}>
                {p.whip.toFixed(2)}
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">K%</div>
              <div className="font-bold text-white">{(p.kRate * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">이닝</div>
              <div className="font-bold text-white">{p.innings.toFixed(1)}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">승-패</div>
              <div className="font-bold text-white">{p.wins}-{p.losses}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">탈삼진</div>
              <div className="font-bold text-white">{p.strikeouts}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <div className="text-xs text-gray-400">{p.games}경기</div>
              <div className="font-bold text-white">BB {p.walks}</div>
            </div>
          </div>

          {/* 개선 팁 */}
          <div className="text-xs text-yellow-300 mb-3 bg-yellow-900/30 rounded px-2 py-1">
            💡 {p.improvementTip}
          </div>

          {/* 강점/약점 */}
          <div className="flex flex-wrap gap-1">
            {p.strengths.map((s, i) => (
              <span key={i} className="text-xs bg-green-900/50 text-green-300 border border-green-700 px-2 py-0.5 rounded-full">
                ✓ {s}
              </span>
            ))}
            {p.weaknesses.map((w, i) => (
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
