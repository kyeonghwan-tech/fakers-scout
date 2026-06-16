'use client';

interface Props {
  teamName: string;
  strengths: string[];
  weaknesses: string[];
}

export default function TeamStrengthCard({ teamName, strengths, weaknesses }: Props) {
  return (
    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
      <h2 className="text-lg font-bold text-white mb-4">📊 {teamName} 전력 분석</h2>
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
            <span className="text-green-400 text-sm font-semibold">강점</span>
          </div>
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2">
                <span className="text-green-400 shrink-0">✓</span>{s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-red-400 text-sm font-semibold">약점</span>
          </div>
          <ul className="space-y-1">
            {weaknesses.map((w, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2">
                <span className="text-red-400 shrink-0">✗</span>{w}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
