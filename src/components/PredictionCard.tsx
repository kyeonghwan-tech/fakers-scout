'use client';

import { GameAnalysis } from '@/types/baseball';

interface Props {
  prediction: GameAnalysis['prediction'];
  opponentName: string;
}

export default function PredictionCard({ prediction, opponentName }: Props) {
  const verdictColor = {
    win: 'text-green-400',
    loss: 'text-red-400',
    draw: 'text-yellow-400',
  }[prediction.verdict];

  const verdictText = { win: '승리 예측', loss: '패배 예측', draw: '무승부 예측' }[prediction.verdict];

  const confidenceLabel = { high: '높음', medium: '보통', low: '낮음' }[prediction.confidence];

  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4">⚾ 경기 예측</h2>

      <div className="text-center mb-6">
        <div className={`text-4xl font-black mb-1 ${verdictColor}`}>{verdictText}</div>
        <div className="text-gray-400 text-sm">신뢰도: {confidenceLabel}</div>
      </div>

      {/* 확률 바 */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-400 mb-1">
          <span>Fakers 승 {prediction.winProbability}%</span>
          <span>무 {prediction.drawProbability}%</span>
          <span>{opponentName} 승 {prediction.lossProbability}%</span>
        </div>
        <div className="flex h-4 rounded-full overflow-hidden">
          <div
            className="bg-blue-500 transition-all"
            style={{ width: `${prediction.winProbability}%` }}
          />
          <div
            className="bg-yellow-500 transition-all"
            style={{ width: `${prediction.drawProbability}%` }}
          />
          <div
            className="bg-red-500 transition-all"
            style={{ width: `${prediction.lossProbability}%` }}
          />
        </div>
      </div>

      <p className="text-gray-300 text-sm mb-4 bg-gray-700 rounded-lg p-3">{prediction.summary}</p>

      <div>
        <div className="text-gray-400 text-xs mb-2 uppercase tracking-wide">핵심 요인</div>
        <ul className="space-y-1">
          {prediction.keyFactors.map((f, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
