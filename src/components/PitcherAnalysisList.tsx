'use client';

import { PitcherAnalysis } from '@/types/baseball';

interface Props {
  pitchers: PitcherAnalysis[];
  teamName: string;
}

const powerColors = {
  strong: 'text-red-400',
  average: 'text-yellow-400',
  weak: 'text-green-400',
};

const powerLabels = { strong: '강력', average: '평균', weak: '약함' };

export default function PitcherAnalysisList({ pitchers, teamName }: Props) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">⚡ {teamName} 투수 분석</h2>
      {pitchers.length === 0 && <p className="text-gray-400 text-sm">투수 데이터가 없습니다.</p>}
      <div className="space-y-3">
        {pitchers.map((p) => (
          <div
            key={p.name}
            className="bg-gray-800 border border-gray-700 rounded-xl p-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gray-700 ${powerColors[p.pitchPower]}`}>
                구위 {powerLabels[p.pitchPower]}
              </span>
              <span className="text-white font-bold">{p.name}</span>
              <span className="text-gray-400 text-xs">#{p.number}</span>
              <span className="ml-auto text-gray-400 text-xs">{p.wins}승 {p.losses}패</span>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3 text-center">
              {[
                { label: 'ERA', value: p.era.toFixed(2) },
                { label: 'WHIP', value: p.whip.toFixed(2) },
                { label: 'K%', value: `${(p.kRate * 100).toFixed(1)}%` },
                { label: '삼진', value: p.strikeouts },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900/60 rounded-lg py-1">
                  <div className="text-gray-400 text-xs">{label}</div>
                  <div className="text-white text-sm font-bold">{value}</div>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              {p.reasons.map((r, i) => (
                <div key={i} className="text-xs text-gray-300 flex gap-1">
                  <span className="text-orange-400">▸</span>{r}
                </div>
              ))}
              <div className="text-xs text-cyan-300 flex gap-1 mt-2 bg-gray-700 rounded px-2 py-1">
                <span>💡</span>{p.strategy}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
