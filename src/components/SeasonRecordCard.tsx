'use client';

import { SeasonRecord, LeagueRecord } from '@/types/baseball';

interface Props {
  overall: SeasonRecord;
  byLeague: LeagueRecord[];
}

function RecordBadge({ record }: { record: SeasonRecord }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-green-400 font-bold text-lg">{record.wins}승</span>
      <span className="text-gray-400 text-sm">·</span>
      <span className="text-gray-300 font-bold text-lg">{record.draws}무</span>
      <span className="text-gray-400 text-sm">·</span>
      <span className="text-red-400 font-bold text-lg">{record.losses}패</span>
      {record.gamesPlayed > 0 && (
        <span className="text-gray-500 text-sm ml-1">
          ({(record.winRate * 100).toFixed(0)}%)
        </span>
      )}
    </div>
  );
}

function WinBar({ record }: { record: SeasonRecord }) {
  const total = record.gamesPlayed;
  if (total === 0) return null;
  const winPct  = (record.wins / total) * 100;
  const drawPct = (record.draws / total) * 100;
  const lossPct = (record.losses / total) * 100;
  return (
    <div className="flex h-2 rounded-full overflow-hidden mt-2">
      <div className="bg-green-500 transition-all" style={{ width: `${winPct}%` }} />
      <div className="bg-gray-500 transition-all" style={{ width: `${drawPct}%` }} />
      <div className="bg-red-500 transition-all" style={{ width: `${lossPct}%` }} />
    </div>
  );
}

export default function SeasonRecordCard({ overall, byLeague }: Props) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4">🏆 이번 시즌 전적</h2>

      {/* 통합 전적 */}
      <div className="mb-4">
        <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">전체</div>
        <RecordBadge record={overall} />
        <WinBar record={overall} />
        {overall.gamesPlayed === 0 && (
          <p className="text-gray-500 text-sm mt-1">완료된 경기가 없습니다.</p>
        )}
      </div>

      {/* 리그별 전적 */}
      {byLeague.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-700">
          <div className="text-gray-400 text-xs uppercase tracking-wide">리그별</div>
          {byLeague.map((lr) => (
            <div key={lr.league}>
              <div className="text-gray-300 text-sm font-medium mb-1">{lr.league}</div>
              <RecordBadge record={lr.record} />
              <WinBar record={lr.record} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
