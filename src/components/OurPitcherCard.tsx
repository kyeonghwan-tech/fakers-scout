'use client';

import { OurPitcherAnalysis } from '@/types/baseball';

interface Props { pitchers: OurPitcherAnalysis[]; }

const ROLE_LABEL: Record<OurPitcherAnalysis['role'], string> = {
  ace: '에이스', starter: '선발', reliever: '불펜', closer: '마무리',
};
const ROLE_COLOR: Record<OurPitcherAnalysis['role'], string> = {
  ace: 'bg-yellow-600', starter: 'bg-blue-600', reliever: 'bg-purple-600', closer: 'bg-red-600',
};

function StatBox({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-2 text-center">
      <div className="text-xs text-gray-400">{label}</div>
      <div className={`font-bold text-sm ${color ?? 'text-white'}`}>{value}</div>
    </div>
  );
}

function eraColor(v: number)  { return v <= 3.5 ? 'text-green-400' : v <= 5.5 ? 'text-yellow-400' : 'text-red-400'; }
function fipColor(v: number)  { return v <= 4.0 ? 'text-green-400' : v <= 5.5 ? 'text-yellow-400' : 'text-red-400'; }
function gapColor(v: number)  { return v < -1.0 ? 'text-green-400' : v > 1.5 ? 'text-red-400' : 'text-gray-300'; }
function k9Color(v: number)   { return v >= 8.0 ? 'text-green-400' : v >= 5.0 ? 'text-yellow-400' : 'text-red-400'; }
function bb9Color(v: number)  { return v <= 3.0 ? 'text-green-400' : v <= 5.0 ? 'text-yellow-400' : 'text-red-400'; }
function kbbColor(v: number)  { return v >= 2.5 ? 'text-green-400' : v >= 1.5 ? 'text-yellow-400' : 'text-red-400'; }

export default function OurPitcherCard({ pitchers }: Props) {
  if (pitchers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <div className="text-3xl mb-2">⚾</div>
        <p>충분한 출전 데이터가 있는 투수가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-white mb-1">⚡ 우리팀 투수 분석</h2>
      <p className="text-xs text-gray-500 -mt-3">FIP·K/9·BB/9·K/BB 세이버메트릭스 지표 포함 · 3시즌 누적</p>

      {pitchers.map((p) => (
        <div key={p.name} className="bg-gray-700 rounded-xl p-4 border border-gray-600">
          {/* 헤더 */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{p.name}</span>
                {p.number && <span className="text-gray-400 text-sm">#{p.number}</span>}
                {p.throwSide && <span className="text-xs text-gray-400">{p.throwSide}투</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">{p.roleNote}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full text-white shrink-0 ml-2 ${ROLE_COLOR[p.role]}`}>
              {ROLE_LABEL[p.role]}
            </span>
          </div>

          {/* 기본 스탯 */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <StatBox label="ERA" value={p.era.toFixed(2)} color={eraColor(p.era)} />
            <StatBox label="WHIP" value={p.whip.toFixed(2)}
              color={p.whip <= 1.5 ? 'text-green-400' : p.whip <= 2.0 ? 'text-yellow-400' : 'text-red-400'} />
            <StatBox label="승-패" value={`${p.wins}-${p.losses}`} />
            <StatBox label={`${p.games}경기`} value={`${p.innings.toFixed(1)}이닝`} />
          </div>

          {/* 세이버메트릭스 */}
          <div className="grid grid-cols-4 gap-1.5 mb-2">
            <StatBox label="FIP" value={p.fip.toFixed(2)} color={fipColor(p.fip)} />
            <StatBox label="K/9" value={p.k9.toFixed(1)} color={k9Color(p.k9)} />
            <StatBox label="BB/9" value={p.bb9.toFixed(1)} color={bb9Color(p.bb9)} />
            <StatBox label="K/BB" value={p.kbb.toFixed(2)} color={kbbColor(p.kbb)} />
          </div>

          {/* ERA-FIP 갭 */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            <StatBox label="ERA-FIP 갭" value={(p.eraMinusFip >= 0 ? '+' : '') + p.eraMinusFip.toFixed(2)}
              color={gapColor(p.eraMinusFip)} />
            <StatBox label="K% / BB%" value={`${(p.kRate * 100).toFixed(0)}% / ${(p.bbRate * 100).toFixed(0)}%`} />
          </div>

          {/* ERA-FIP 해석 */}
          {Math.abs(p.eraMinusFip) >= 1.0 && (
            <div className={`text-xs mb-3 rounded px-3 py-1.5 leading-relaxed ${
              p.eraMinusFip < -1.0
                ? 'text-green-300 bg-green-900/30'
                : 'text-orange-300 bg-orange-900/30'
            }`}>
              {p.eraMinusFip < -1.0
                ? `▸ FIP이 ERA보다 ${Math.abs(p.eraMinusFip).toFixed(2)} 낮음 — 실제 투구 능력이 ERA보다 좋음. 수비 불운이 ERA를 높이는 중`
                : `▸ ERA가 FIP보다 ${p.eraMinusFip.toFixed(2)} 높음 — 수비 도움을 받고 있는 상황. 자력 실점 억제력 강화 필요`
              }
            </div>
          )}

          {/* 개선 팁 */}
          <div className="text-xs text-yellow-300 mb-3 bg-yellow-900/30 rounded px-3 py-1.5 leading-relaxed">
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

      {/* 범례 */}
      <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700 text-xs text-gray-400 space-y-1">
        <div className="font-semibold text-gray-300 mb-1">📖 지표 설명</div>
        <div><span className="text-gray-200">FIP</span> — 수비 무관 방어율. 홈런·볼넷·삼진만으로 계산한 투수 순수 능력. ERA보다 미래 성적 예측력 높음</div>
        <div><span className="text-gray-200">K/9</span> — 9이닝당 탈삼진. 8↑ 구위 강함, 5↓ 구위 약함</div>
        <div><span className="text-gray-200">BB/9</span> — 9이닝당 볼넷. 3↓ 제구 좋음, 5↑ 제구 불안정</div>
        <div><span className="text-gray-200">K/BB</span> — 탈삼진/볼넷 비율. 2.5↑ 제구+구위 모두 안정적</div>
        <div><span className="text-gray-200">ERA-FIP 갭</span> — 음수면 실력이 ERA보다 좋음(불운), 양수면 수비 도움을 받는 중</div>
      </div>
    </div>
  );
}
