'use client';

import { BatterThreat } from '@/types/baseball';

interface Props {
  batters: BatterThreat[];
  teamName: string;
}

const threatColors = {
  high: { bg: 'bg-red-900/40', border: 'border-red-500', badge: 'bg-red-500', label: '위험' },
  medium: { bg: 'bg-yellow-900/30', border: 'border-yellow-500', badge: 'bg-yellow-500', label: '주의' },
  low: { bg: 'bg-gray-800', border: 'border-gray-600', badge: 'bg-gray-500', label: '보통' },
};

export default function BatterThreatList({ batters, teamName }: Props) {
  const high = batters.filter((b) => b.threatLevel === 'high');
  const medium = batters.filter((b) => b.threatLevel === 'medium');
  const low = batters.filter((b) => b.threatLevel === 'low');

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">🔥 {teamName} 타자 위협 분석</h2>

      {batters.length === 0 && (
        <p className="text-gray-400 text-sm">타자 데이터를 불러올 수 없습니다.</p>
      )}

      {[
        { list: high, label: '위험 타자' },
        { list: medium, label: '주의 타자' },
        { list: low, label: '일반 타자' },
      ].map(({ list, label }) =>
        list.length > 0 ? (
          <div key={label} className="mb-6">
            <div className="text-sm text-gray-400 mb-2 font-semibold">{label} ({list.length}명)</div>
            <div className="space-y-3">
              {list.map((b) => {
                const c = threatColors[b.threatLevel];
                return (
                  <div key={b.name} className={`rounded-xl p-4 border ${c.bg} ${c.border}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full text-white font-bold ${c.badge}`}>
                        {c.label}
                      </span>
                      <span className="text-white font-bold">{b.name}</span>
                      <span className="text-gray-400 text-xs">#{b.number}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-center">
                      {[
                        { label: 'AVG', value: b.avg.toFixed(3) },
                        { label: 'OPS', value: b.ops.toFixed(3) },
                        { label: 'HR', value: b.hr },
                        { label: 'RBI', value: b.rbi },
                      ].map(({ label: l, value }) => (
                        <div key={l} className="bg-gray-900/50 rounded-lg py-1">
                          <div className="text-gray-400 text-xs">{l}</div>
                          <div className="text-white text-sm font-bold">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1">
                      {b.reasons.map((r, i) => (
                        <div key={i} className="text-xs text-gray-300 flex gap-1">
                          <span className="text-yellow-400">⚡</span>{r}
                        </div>
                      ))}
                      <div className="text-xs text-blue-300 flex gap-1 mt-1">
                        <span>🛡️</span>{b.defensiveNote}
                      </div>
                      <div className="text-xs text-gray-400 flex gap-1">
                        <span>📍</span>{b.hitTendency}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}
