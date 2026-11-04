export type Role = 'HITTER' | 'PITCHER';
export type PAResult = 'WALK' | 'STRIKEOUT' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'HOME_RUN' | 'BALL_IN_PLAY_OUT';
export type Skills = Record<string, number>;
export interface MinorProgress { minorGames?: number; }
export interface Player extends MinorProgress { id: string; name: string; role: Role; age: number; teamId: string; hand: 'LEFT' | 'RIGHT'; skills: Skills; potential: number; health: number; fatigue: number; salaryCR: number; reputation?: number; contractYearsLeft?: number; rosterStatus?: 'STARTER' | 'BENCH' | 'MINORS' | 'INJURED'; injuredUntil?: number; }
export interface ScheduleGame { id: string; round: number; homeTeamId: string; awayTeamId: string; }
export interface HitterStats { g: number; pa: number; ab: number; h: number; doubles: number; triples: number; hr: number; bb: number; so: number; rbi: number; runs: number; gidp?: number; }
export interface PitcherStats { g: number; gs: number; outs: number; hits: number; hr: number; bb: number; so: number; er: number; wins: number; losses: number; }
export interface GameState { inning: number; half: 'TOP' | 'BOTTOM'; outs: number; bases: (string | null)[]; score: { home: number; away: number }; appliedPaIds: string[]; status: 'RUNNING' | 'FINAL'; }
export interface PAOutcome { paId: string; batterId: string; result: PAResult; }
