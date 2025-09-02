import React from 'react';

interface CircularProgressProps {
  points: number;
  maxPoints?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ points }) => {
  const hundreds = Math.floor(points / 100);
  const remainder = points % 100;

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = (remainder / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: '120px', height: '120px' }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#e6e6e6"
          strokeWidth="10"
          fill="transparent"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#007bff"
          strokeWidth="10"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: 'white',
        fontSize: '24px',
        fontWeight: 'bold'
      }}>
        {hundreds}
      </div>
    </div>
  );
};

export default CircularProgress;
