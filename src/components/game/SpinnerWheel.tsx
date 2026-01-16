import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../../types';
import { audioSystem } from '../../utils/audio';

interface SpinnerWheelProps {
  players: Player[];
  onComplete: (startingPlayerIndex: number) => void;
}

const WHEEL_COLORS = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const INTRO_SOUNDS = [
  '/sounds/who-throws-first/spin-the-wheel/time_to_spin_the_wheel.mp3',
  '/sounds/who-throws-first/spin-the-wheel/spinning_the_wheel_now.mp3',
  '/sounds/who-throws-first/spin-the-wheel/who_gets_lucky_today.mp3',
  '/sounds/who-throws-first/spin-the-wheel/may_odds_spin_in_your_favor.mp3',
  '/sounds/who-throws-first/spin-the-wheel/luck_as_your_coffee.mp3',
];

export const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ players, onComplete }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState<Player | null>(null);
  const [showResult, setShowResult] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasStarted = useRef(false);

  const segmentAngle = 360 / players.length;

  // Draw the wheel
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    players.forEach((player, index) => {
      const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
      const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = WHEEL_COLORS[index % WHEEL_COLORS.length];
      ctx.fill();
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw player name/avatar
      const midAngle = (startAngle + endAngle) / 2;
      const textRadius = radius * 0.65;
      const textX = centerX + Math.cos(midAngle) * textRadius;
      const textY = centerY + Math.sin(midAngle) * textRadius;

      ctx.save();
      ctx.translate(textX, textY);
      ctx.rotate(midAngle + Math.PI / 2);

      // Avatar emoji
      ctx.font = 'bold 28px sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(player.avatar || '🎯', 0, -15);

      // Player name (truncated)
      ctx.font = 'bold 14px sans-serif';
      const displayName = player.name.length > 10 ? player.name.slice(0, 10) + '...' : player.name;
      ctx.fillText(displayName, 0, 15);

      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.fillStyle = '#1f2937';
    ctx.fill();
    ctx.strokeStyle = '#f0e130';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center text
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#f0e130';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', centerX, centerY);

  }, [players, segmentAngle]);

  // Auto-start spin after component mounts
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      // Play intro sound
      const introSound = INTRO_SOUNDS[Math.floor(Math.random() * INTRO_SOUNDS.length)];
      audioSystem.playSound(introSound, true);

      // Start spinning after intro
      setTimeout(() => {
        startSpin();
      }, 1500);
    }
  }, []);

  const startSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);
    setWinner(null);
    setShowResult(false);

    // Play spinner sound
    audioSystem.playSound('/sounds/games/bullseye-summit/spinner.mp3', false);

    // Calculate random winner and rotation
    const winnerIndex = Math.floor(Math.random() * players.length);

    // Calculate final rotation to land on winner
    // The pointer is at the top (0 degrees), so we need to position the winner segment there
    const winnerSegmentCenter = winnerIndex * segmentAngle + segmentAngle / 2;
    const spins = 5 + Math.random() * 3; // 5-8 full rotations
    const finalRotation = spins * 360 + (360 - winnerSegmentCenter);

    setRotation(finalRotation);

    // Show result after spin completes
    setTimeout(() => {
      setIsSpinning(false);
      setWinner(players[winnerIndex]);
      setShowResult(true);

      // Play winner announcement after a short delay
      setTimeout(() => {
        // Could add a winner sound here
        audioSystem.playSound('/sounds/effects/accepted_invite.mp3', true);
      }, 300);

      // Proceed to game after showing result
      setTimeout(() => {
        onComplete(winnerIndex);
      }, 2500);
    }, 4000); // Spin duration
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-6 p-8">
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center">
          Wer wirft zuerst?
        </h2>

        {/* Wheel Container */}
        <div className="relative">
          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div
              className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[30px] border-l-transparent border-r-transparent border-t-yellow-400"
              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            />
          </div>

          {/* Spinning Wheel */}
          <div
            className="transition-transform ease-out"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: isSpinning ? '4s' : '0s',
              transitionTimingFunction: 'cubic-bezier(0.17, 0.67, 0.12, 0.99)',
            }}
          >
            <canvas
              ref={canvasRef}
              width={300}
              height={300}
              className="rounded-full shadow-2xl"
              style={{
                boxShadow: '0 0 40px rgba(240, 225, 48, 0.3), inset 0 0 20px rgba(0,0,0,0.3)'
              }}
            />
          </div>

          {/* Glow effect when spinning */}
          {isSpinning && (
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                boxShadow: '0 0 60px rgba(240, 225, 48, 0.5)',
              }}
            />
          )}
        </div>

        {/* Result */}
        {showResult && winner && (
          <div className="animate-bounce-in text-center">
            <div className="text-5xl mb-2">{winner.avatar || '🎯'}</div>
            <div className="text-2xl font-bold text-yellow-400">
              {winner.name}
            </div>
            <div className="text-lg text-gray-300 mt-1">
              wirft zuerst!
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isSpinning && (
          <div className="text-gray-400 animate-pulse">
            Das Rad dreht sich...
          </div>
        )}
      </div>
    </div>
  );
};

export default SpinnerWheel;
