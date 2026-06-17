'use client';

import { OurBatterAnalysis } from '@/types/baseball';

interface Props { batters: OurBatterAnalysis[]; }

const ROLE_LABEL: Record<OurBatterAnalysis['battingOrderRole'], string> = {
  leadoff: '1번형', second: '2번형', cleanup: '클린업', rbi: '중심타선', bottom: '하위타선',
};
const ROLE_COLOR: Record<OurBatterAnalysis['battingOrderRole'], string> = {
  leadoff: 'bg-green-600', second: 'bg-blue-600', cleanup: 'bg-red-600',
  rbi: 'bg-orange-600', bottom: 'bg-gray-600',
};

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-2 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-bold text-sm ${color ?? 'text-white'}`}>{value}</div>
    </div>
  );
}

function wobaColor(v: number) {
  return v >= 0.370 ? 'text-green-400' : v >= 0.320 ? 'text-yellow-400' : 'text-red-400';
}
function babipColor(v: number) {
  return v >= 0.350 ? 'text-green-400' : v >= 0.260 ? 'text-gray-300' : 'text-red-400';
}

export default function OurBatterCard({ batters }: Props) {
  if (batters.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">📊</div>
        <p>충분한 출전 데이터가 있는 타자가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white mb-1">🏏 우리팀 타자 분석</h2>
      <p className="text-xs text-gray-500 -mt-3">wOBA·ISO·BABIP 등 세이버메트릭스 지표 포함 · 3시즌 누적</p>

      {batters.map((b) => (
        <div key={b.name} className="bg-gray-700 rounded-xl p-4 border border-gray-600">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-lg">{b.name}</span>
                {b.number && <span className="text-gray-400 text-sm">#{b.number}</span>}
                {b.position && <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">{b.position}</span>}
                {b.batSide && <span className="text-xs text-gray-400">{b.batSide}타</span>}
                <span className="text-xs font-semibold text-yellow-300">{b.batterTypeLabel}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{b.defenseNote}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white shrink-0 ml-2 ${ROLE_COLOR[b.battingOrderRole]}`}>
              {ROLE_LABEL[b.battingOrderRole]}
            </span>
          </div>

          {/* 기본 스탯 */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <StatBox label="타율" value={b.avg.toFixed(3)}
              color={b.avg >= 0.350 ? 'text-green-400' : b.avg >= 0.280 ? 'text-yellow-400' : 'text-red-400'} />
            <StatBox label="출루율" value={b.obp.toFixed(3)}
              color={b.obp >= 0.400 ? 'text-green-400' : b.obp >= 0.330 ? 'text-yellow-400' : 'text-red-400'} />
            <StatBox label="장타율" value={b.slg.toFixed(3)}
              color={b.slg >= 0.450 ? 'text-green-400' : b.slg >= 0.350 ? 'text-yellow-400' : 'text-red-400'} />
            <StatBox label="OPS" value={b.ops.toFixed(3)}
              color={b.ops >= 0.850 ? 'text-green-400' : b.ops >= 0.700 ? 'text-yellow-400' : 'text-red-400'} />
          </div>

          {/* 세이버메트릭스 */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <StatBox label="wOBA" value={b.woba.toFixed(3)} color={wobaColor(b.woba)} />
            <StatBox label="ISO" value={b.iso.toFixed(3)}
              color={b.iso >= 0.150 ? 'text-green-400' : b.iso >= 0.080 ? 'text-yellow-400' : 'text-gray-400'} />
            <StatBox label="BABIP" value={b.babip.toFixed(3)} color={babipColor(b.babip)} />
            <StatBox label="BB%/K%" value={`${(b.bbPct * 100).toFixed(0)}/${(b.kPct * 100).toFixed(0)}`}
              color={b.bbPct >= 0.12 ? 'text-green-400' : 'text-gray-300'} />
          </div>

          {/* 경기 정보 */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <StatBox label={`${b.games}경기`} value={`${b.atBats}타수`} />
            <StatBox label="도루" value={String(b.stolenBases)} />
            <StatBox label="홈런/타점" value={`${b.homeRuns}/${b.rbi}`} />
          </div>

          {/* 타순 노트 */}
          <div className="text-xs text-blue-300 mb-3 bg-blue-900/30 rounded px-3 py-1.5 leading-relaxed">
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

      {/* 범례 */}
      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-xs text-gray-400 space-y-1">
        <div className="font-semibold text-gray-300 mb-1">📖 지표 설명</div>
        <div><span className="text-gray-200">wOBA</span> — 가중 출루율. 볼넷·단타·2루타·홈런 등 각 결과에 득점 기여도 가중치 적용. 0.370↑ 우수</div>
        <div><span className="text-gray-200">ISO</span> — 순수 장타력 (장타율-타율). 0.150↑ 장타자</div>
        <div><span className="text-gray-200">BABIP</span> — 인플레이 타구 안타율. 0.300 전후가 평균, 너무 높으면 운이 좋은 것</div>
        <div><span className="text-gray-200">BB%/K%</span> — 볼넷률/삼진률. BB% 높고 K% 낮을수록 선구안 좋음</div>
      </div>
    </div>
  );
}
