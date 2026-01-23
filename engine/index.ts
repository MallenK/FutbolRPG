// engine/index.ts
import { Player, Logger, LogType } from './types';
import { runNextMatch, runRestOfSeason, runCareerDuration } from './career';

// Facades para el App.tsx
export const simMatch = async (logger: Logger, player: Player): Promise<Player> => {
  return await runNextMatch(logger, player);
};

export const simSeason = async (logger: Logger, player: Player): Promise<Player> => {
  return await runRestOfSeason(logger, player);
};

export const simCareer = async (logger: Logger, player: Player, years: number): Promise<Player> => {
  return await runCareerDuration(logger, player, years);
};