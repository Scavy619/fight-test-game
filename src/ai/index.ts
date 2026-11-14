// AI opponent: a controller over the sim state plus a headless match runner.
export {
  createAi, DIFFICULTIES, DIFFICULTY_DAMAGE, DIFFICULTY_ORDER, type AiController, type AiParams, type Difficulty,
} from './controller';
export { moveReach } from '../sim';
export { createRng, type Rng } from './rng';
export { runAiMatch, type AiMatchResult } from './simulate';
