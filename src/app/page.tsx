'use client';

import { useState, useEffect, useCallback } from 'react';
import { GameAnalysis, GameSchedule } from '@/types/baseball';
import GameHeader from '@/components/GameHeader';
import PredictionCard from '@/components/PredictionCard';
import BatterThreatList from '@/components/BatterThreatList';
import PitcherAnalysisList from '@/components/PitcherAnalysisList';
import LineupCard from '@/components/LineupCard';
import TeamStrengthCard from '@/components/TeamStrengthCard';
import SeasonRecordCard from '@/components/SeasonRecordCard';

export default function HomePage() {
  const [analysis, setAnalysis] = useState<GameAnalysis | null>(null);
  const [schedule, setSchedule] = useState<GameSchedule[]>([]);
  const [selectedGameIndex, setSelectedGameIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'batters' | 'pitchers' | 'lineup'>('overview');

  const fetchSchedule = useCallback(async () => {
    try {
      const res = await fetch('/api/schedule');
      if (res.ok) {
        const data = await res.json();
        setSchedule(Array.isArray(data) ? data : []);
      }
    } catch {
      // 일정 로드 실패 시 무시
    }
  }, []);

  const fetchAnalysis = useCallback(async (gameIndex: number = 0) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analyze?gameIndex=${gameIndex}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '분석 실패');
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
    fetchAnalysis(0);
  }, [fetchSchedule, fetchAnalysis]);

  const handleSelectGame = (index: number) => {
    setSelectedGameIndex(index);
    fetchAnalysis(index);
  };

  const tabs = [
    { id: 'overview' as const, label: '📊 개요' },
    { id: 'batters' as const, label: '🔥 타자 분석' },
    { id: 'pitchers' as const, label: '⚡ 투수 분석' },
    { id: 'lineup' as const, label: '📋 라인업' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚾</span>
            <div>
              <div className="font-black text-lg text-white">Fakers Scout</div>
              <div className="text-gray-400 text-xs">사회인야구 전력분석 시스템</div>
            </div>
          </div>
          <button
            onClick={() => fetchAnalysis(selectedGameIndex)}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            {loading ? '분석 중…' : '🔄 새로고침'}
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {schedule.length > 0 && (
          <div className="mb-6">
            <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">경기 선택</div>
            <div className="flex gap-2 flex-wrap">
              {schedule.slice(0, 10).map((game, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectGame(i)}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors text-left ${
                    selectedGameIndex === i
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-semibold">{game.opponent || '?팀'}</div>
                  <div className={`text-xs mt-0.5 ${selectedGameIndex === i ? 'text-blue-200' : 'text-gray-400'}`}>
                    {game.date} · {game.league}
                  </div>
                  <div className={`text-xs ${selectedGameIndex === i ? 'text-blue-300' : 'text-gray-500'}`}>
                    {game.status === 'completed' ? '✓ 완료' : game.status === 'upcoming' ? '⏰ 예정' : '📅 대기'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">gameone.kr에서 데이터를 수집하고 있습니다…</p>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-900/40 border border-red-500 rounded-xl p-6 text-center">
            <div className="text-red-400 text-lg mb-2">⚠️ 데이터 수집 실패</div>
            <p className="text-gray-300 text-sm">{error}</p>
            <button
              onClick={() => fetchAnalysis(selectedGameIndex)}
              className="mt-4 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm"
            >
              다시 시도
            </button>
          </div>
        )}

        {analysis && !loading && (
          <>
            <GameHeader
              game={analysis.upcomingGame}
              ourTeamName={analysis.ourTeam.name}
              opponentName={analysis.opponent.name}
            />

            <div className="flex gap-1 mb-6 bg-gray-800 p-1 rounded-xl border border-gray-700">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 text-sm py-2 px-3 rounded-lg transition-colors font-medium ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SeasonRecordCard
                  overall={analysis.seasonRecord.overall}
                  byLeague={analysis.seasonRecord.byLeague}
                />
                <PredictionCard
                  prediction={analysis.prediction}
                  opponentName={analysis.opponent.name}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TeamStrengthCard
                    teamName="Fakers"
                    strengths={analysis.ourTeamStrengths}
                    weaknesses={analysis.ourTeamWeaknesses}
                  />
                  <TeamStrengthCard
                    teamName={analysis.opponent.name}
                    strengths={analysis.opponentStrengths}
                    weaknesses={analysis.opponentWeaknesses}
                  />
                </div>
                {analysis.defensiveNotes.length > 0 && (
                  <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">🛡️ 수비 유의사항</h2>
                    <ul className="space-y-2">
                      {analysis.defensiveNotes.map((note, i) => (
                        <li key={i} className="text-gray-300 text-sm flex gap-2">
                          <span className="text-blue-400 shrink-0">▸</span>{note}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'batters' && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <BatterThreatList
                  batters={analysis.batterThreats}
                  teamName={analysis.opponent.name}
                />
              </div>
            )}

            {activeTab === 'pitchers' && (
              <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <PitcherAnalysisList
                  pitchers={analysis.pitcherAnalysis}
                  teamName={analysis.opponent.name}
                />
              </div>
            )}

            {activeTab === 'lineup' && (
              <LineupCard
                lineup={analysis.lineupRecommendation}
                defense={analysis.defensiveAlignment}
              />
            )}
          </>
        )}

        {!analysis && !loading && !error && (
          <div className="text-center py-24 text-gray-500">
            <div className="text-5xl mb-4">⚾</div>
            <p>위에서 경기를 선택하거나 새로고침을 눌러 분석을 시작하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
