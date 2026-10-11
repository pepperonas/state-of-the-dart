import { useEffect } from 'react';
import { nextStamp, publishScoreboard, type ScoreboardData } from '../../utils/scoreboard';

/**
 * Publishes the game screen's state to the TV scoreboard (`/scoreboard`).
 * Renders nothing; publishes only when the content actually changed — a
 * re-render with the same data sends nothing.
 */
const ScoreboardPublisher: React.FC<{ data: ScoreboardData }> = ({ data }) => {
  const key = JSON.stringify(data);
  useEffect(() => {
    publishScoreboard({ v: 1, ...(JSON.parse(key) as ScoreboardData), updatedAt: nextStamp() });
  }, [key]);
  return null;
};

export default ScoreboardPublisher;
