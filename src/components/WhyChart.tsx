import React from 'react';

interface WhyChartProps {
  width: number;
  height: number;
}

/**
 * 와이파이(Why-Why) 차트 배경 컴포넌트
 * 5 Whys 기법 기반의 근본 원인 분석 다이어그램
 * 중앙의 "문제"에서 가지가 뻗어나가는 어골도(Fishbone) 스타일
 */
export const WhyChart: React.FC<WhyChartProps> = ({ width, height }) => {
  const centerX = width / 2;
  const centerY = height / 2;

  // 메인 척추 (가로 중심선)
  const spineStartX = width * 0.08;
  const spineEndX = width * 0.82;

  // 문제 박스 위치 (오른쪽 끝)
  const problemBoxX = width * 0.82;
  const problemBoxY = centerY;
  const problemBoxW = width * 0.15;
  const problemBoxH = height * 0.08;

  // 가지(Branch) 설정 - 6개의 주요 원인 카테고리
  const categories = [
    { label: 'Why 1', side: 'top', position: 0.18 },
    { label: 'Why 2', side: 'top', position: 0.38 },
    { label: 'Why 3', side: 'top', position: 0.58 },
    { label: 'Why 4', side: 'bottom', position: 0.18 },
    { label: 'Why 5', side: 'bottom', position: 0.38 },
    { label: 'Why 6', side: 'bottom', position: 0.58 },
  ];

  const branchLength = height * 0.3;
  const subBranchLength = width * 0.08;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
    >
      {/* 배경 그라데이션 */}
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0f9ff" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#f0fdf4" />
        </linearGradient>
        <linearGradient id="spineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        {/* 그림자 필터 */}
        <filter id="boxShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="#00000020" />
        </filter>
        <filter id="labelShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0.5" dy="0.5" stdDeviation="1" floodColor="#00000015" />
        </filter>
      </defs>

      {/* 배경 */}
      <rect width={width} height={height} fill="url(#bgGradient)" />

      {/* 격자 패턴 (은은한 도트) */}
      {Array.from({ length: Math.floor(width / 40) }).map((_, i) =>
        Array.from({ length: Math.floor(height / 40) }).map((_, j) => (
          <circle
            key={`dot-${i}-${j}`}
            cx={i * 40 + 20}
            cy={j * 40 + 20}
            r={0.8}
            fill="#cbd5e1"
            opacity={0.4}
          />
        ))
      )}

      {/* 메인 척추선 (화살표 포함) */}
      <line
        x1={spineStartX}
        y1={centerY}
        x2={spineEndX}
        y2={centerY}
        stroke="url(#spineGradient)"
        strokeWidth={3}
        markerEnd="url(#arrowhead)"
      />

      {/* 화살표 마커 */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
        </marker>
      </defs>

      {/* 문제 박스 */}
      <rect
        x={problemBoxX}
        y={problemBoxY - problemBoxH / 2}
        width={problemBoxW}
        height={problemBoxH}
        rx={8}
        ry={8}
        fill="#ef4444"
        filter="url(#boxShadow)"
      />
      <text
        x={problemBoxX + problemBoxW / 2}
        y={problemBoxY - 4}
        textAnchor="middle"
        fill="white"
        fontSize={Math.max(14, width * 0.014)}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        문제
      </text>
      <text
        x={problemBoxX + problemBoxW / 2}
        y={problemBoxY + 14}
        textAnchor="middle"
        fill="white"
        fontSize={Math.max(10, width * 0.009)}
        fontFamily="system-ui, -apple-system, sans-serif"
        opacity={0.9}
      >
        (Problem)
      </text>

      {/* 카테고리 가지들 */}
      {categories.map((cat, index) => {
        const branchX = spineStartX + (spineEndX - spineStartX) * cat.position;
        const direction = cat.side === 'top' ? -1 : 1;
        const branchEndY = centerY + direction * branchLength;

        // 카테고리 라벨 박스 색상
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ec4899'];
        const color = colors[index % colors.length];
        const lightColors = ['#eff6ff', '#f5f3ff', '#ecfeff', '#fffbeb', '#ecfdf5', '#fdf2f8'];
        const lightColor = lightColors[index % lightColors.length];

        const labelBoxW = width * 0.1;
        const labelBoxH = height * 0.05;

        return (
          <g key={`branch-${index}`}>
            {/* 주요 가지 */}
            <line
              x1={branchX}
              y1={centerY}
              x2={branchX}
              y2={branchEndY}
              stroke={color}
              strokeWidth={2}
              opacity={0.7}
            />

            {/* 카테고리 라벨 박스 */}
            <rect
              x={branchX - labelBoxW / 2}
              y={cat.side === 'top' ? branchEndY - labelBoxH - 4 : branchEndY + 4}
              width={labelBoxW}
              height={labelBoxH}
              rx={6}
              ry={6}
              fill={lightColor}
              stroke={color}
              strokeWidth={1.5}
              filter="url(#labelShadow)"
            />
            <text
              x={branchX}
              y={cat.side === 'top' ? branchEndY - labelBoxH / 2 + 1 : branchEndY + labelBoxH / 2 + 9}
              textAnchor="middle"
              fill={color}
              fontSize={Math.max(11, width * 0.011)}
              fontWeight="600"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {cat.label}
            </text>

            {/* 보조 가지들 (원인 상세) */}
            {[0.3, 0.55, 0.8].map((ratio, subIndex) => {
              const subY = centerY + direction * branchLength * ratio;
              const subDirection = index % 2 === 0 ? 1 : -1;

              return (
                <g key={`sub-${index}-${subIndex}`}>
                  <line
                    x1={branchX}
                    y1={subY}
                    x2={branchX + subDirection * subBranchLength}
                    y2={subY - direction * height * 0.03}
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.4}
                    strokeDasharray="4,3"
                  />
                  {/* 보조 가지 끝의 작은 원 (핀 배치 가이드) */}
                  <circle
                    cx={branchX + subDirection * subBranchLength}
                    cy={subY - direction * height * 0.03}
                    r={3}
                    fill={color}
                    opacity={0.25}
                  />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 제목 영역 */}
      <text
        x={centerX}
        y={height * 0.04}
        textAnchor="middle"
        fill="#334155"
        fontSize={Math.max(16, width * 0.016)}
        fontWeight="bold"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Why-Why Chart (와이와이 차트)
      </text>
      <text
        x={centerX}
        y={height * 0.04 + 18}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize={Math.max(10, width * 0.009)}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        핀을 추가하여 문제의 원인을 분석하세요
      </text>

      {/* 하단 안내 */}
      <text
        x={centerX}
        y={height * 0.97}
        textAnchor="middle"
        fill="#cbd5e1"
        fontSize={Math.max(9, width * 0.008)}
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        클릭하여 핀을 배치하고 원인을 기록하세요
      </text>
    </svg>
  );
};
