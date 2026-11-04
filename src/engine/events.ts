import type { CareerSave } from './career';
import type { Role } from '../domain/types';
import { Rng } from './rng';
export interface EventChoice { label: string; skill?: string; gain?: number; health?: number; reputation?: number; promote?: boolean; }
export interface CareerEvent { id: string; title: string; description: string; role?: Role; choices: [EventChoice, EventChoice]; }
export interface EventRecord { id: string; year: number; choice: number; }
export const EVENTS: CareerEvent[] = [
  { id: 'sponsor', title: '첫 후원 제안', description: '지역 브랜드가 광고 촬영을 제안했습니다.', choices: [{ label: '촬영에 참여한다 · 명성 +4, 건강 -3', reputation: 4, health: -3 }, { label: '휴식한다 · 건강 +5', health: 5 }] },
  { id: 'swing', title: '타격폼 교정', role: 'HITTER', description: '코치가 짧은 스윙을 제안합니다.', choices: [{ label: '폼을 바꾼다 · 컨택 +2', skill: 'contact', gain: 2 }, { label: '내 스타일을 지킨다 · 파워 +2', skill: 'power', gain: 2 }] },
  { id: 'coach', title: '코치와의 대화', description: '훈련 방식에 대해 솔직한 이야기를 나눴습니다.', choices: [{ label: '조언을 듣는다 · 멘탈 +2', skill: 'mental', gain: 2 }, { label: '잠시 거리를 둔다 · 건강 +4', health: 4 }] },
  { id: 'pain', title: '가벼운 통증', description: '몸이 보내는 작은 신호를 느꼈습니다.', choices: [{ label: '회복에 집중한다 · 건강 +10', health: 10 }, { label: '팀 훈련에 참여한다 · 명성 +3, 건강 -5', reputation: 3, health: -5 }] },
  { id: 'starting', title: '새로운 출전 기회', description: '감독이 1군에서 더 많은 기회를 약속했습니다.', choices: [{ label: '기회를 잡는다 · 1군 승격, 멘탈 +1', skill: 'mental', gain: 1, promote: true }, { label: '기초를 다진다 · 건강 +7', health: 7 }] },
  { id: 'rival', title: '주전 경쟁', description: '경쟁자가 개인 훈련을 함께하자고 제안합니다.', choices: [{ label: '함께 훈련한다 · 멘탈 +2, 건강 -2', skill: 'mental', gain: 2, health: -2 }, { label: '내 페이스를 유지한다 · 건강 +4', health: 4 }] },
  { id: 'trust', title: '감독의 신뢰', description: '훈련에 임하는 자세가 눈에 띄었습니다.', choices: [{ label: '역할을 받아들인다 · 1군 승격, 명성 +2', promote: true, reputation: 2 }, { label: '차분히 준비한다 · 멘탈 +2', skill: 'mental', gain: 2 }] },
  { id: 'summer', title: '여름의 체력 관리', description: '더운 날씨에 체력 소모가 커졌습니다.', choices: [{ label: '충분히 쉰다 · 건강 +8', health: 8 }, { label: '팀 훈련을 이끈다 · 명성 +4, 건강 -4', reputation: 4, health: -4 }] },
  { id: 'fans', title: '팬과의 만남', description: '경기장 앞에서 어린 팬이 기다리고 있습니다.', choices: [{ label: '함께 사진을 찍는다 · 명성 +4', reputation: 4 }, { label: '다음 경기를 준비한다 · 멘탈 +1', skill: 'mental', gain: 1 }] },
  { id: 'pressure', title: '가을을 향한 압박', description: '순위 경쟁이 치열해지고 있습니다.', choices: [{ label: '압박을 받아들인다 · 멘탈 +2', skill: 'mental', gain: 2 }, { label: '팀 동료에게 의지한다 · 건강 +5', health: 5 }] },
  { id: 'velocity', title: '구속 향상 훈련', role: 'PITCHER', description: '트레이너가 새로운 투구 훈련을 준비했습니다.', choices: [{ label: '도전한다 · 구속 +2, 건강 -3', skill: 'velocity', gain: 2, health: -3 }, { label: '기본을 지킨다 · 제구 +2', skill: 'control', gain: 2 }] },
  { id: 'video', title: '상대 분석', description: '늦은 밤까지 분석실에 불이 켜져 있습니다.', choices: [{ label: '영상을 더 본다 · 멘탈 +2, 건강 -2', skill: 'mental', gain: 2, health: -2 }, { label: '일찍 잠든다 · 건강 +6', health: 6 }] },
];
export function maybeEvent(save: CareerSave, rng: Rng) {
  if (save.pendingEvent || save.eventsThisSeason >= 2 || save.league.round < (save.youth && !save.youth.graduated ? [5, 10] : [50, 100])[save.eventsThisSeason]) return;
  const eligible = EVENTS.filter(e => (!e.role || e.role === save.player.role) && !save.eventHistory.some(h => h.id === e.id && save.year - h.year < 2));
  if (eligible.length) save.pendingEvent = eligible[rng.int(0, eligible.length - 1)].id;
}
export function chooseEvent(original: CareerSave, id: string, choice: number): CareerSave {
  if (original.pendingEvent !== id || ![0, 1].includes(choice)) return original;
  const event = EVENTS.find(e => e.id === id); if (!event || (event.role && event.role !== original.player.role)) return original;
  const save = structuredClone(original); const effect = event.choices[choice];
  if (effect.skill && effect.skill in save.player.skills) save.player.skills[effect.skill] = Math.min(99, save.player.skills[effect.skill] + (effect.gain ?? 0));
  save.player.health = Math.max(0, Math.min(100, save.player.health + (effect.health ?? 0)));
  save.player.reputation = (save.player.reputation ?? 0) + (effect.reputation ?? 0);
  if (effect.promote) {
    if (save.youth && !save.youth.graduated) save.youth.trust = Math.min(100, save.youth.trust + 15);
    if (!['STARTER', 'INJURED'].includes(save.player.rosterStatus ?? '')) save.player.rosterStatus = save.youth && !save.youth.graduated ? save.youth.trust >= 55 ? 'STARTER' : 'BENCH' : save.player.role === 'HITTER' ? 'BENCH' : 'STARTER';
  }
  save.players = save.players.map(p => p.id === save.player.id ? save.player : p);
  save.eventHistory.push({ id, year: save.year, choice }); save.eventsThisSeason++; save.pendingEvent = null;
  return save;
}
