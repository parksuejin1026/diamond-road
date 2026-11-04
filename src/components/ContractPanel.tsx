import type { CareerSave } from '../engine/career';
import { faProgress, negotiateSalary, signContract, resolveTrade, type Contract } from '../engine/contracts';
import { isYouth, teamName } from '../engine/youth';
export function contractLabel(c: Contract, eligible=false) {
  return c.kind==='FA'?'FA 계약':c.kind==='EXTENSION'?'비FA 다년계약':c.kind==='RELEASE'?'방출 후 입단':c.kind==='TRADE'?'트레이드':c.kind==='DRAFT'?'프로 입단':c.kind==='RENEWAL'?eligible?'FA 유보 · 1년 재계약':'연봉 재계약':'기존 제안';
}
export default function ContractPanel({save,busy,update}:{save:CareerSave;busy:boolean;update:(save:CareerSave)=>void}) {
  if(isYouth(save)||save.phase==='DRAFT'||save.phase==='RETIRED')return null;
  const progress=faProgress(save), released=save.contractOffers.some(o=>o.kind==='RELEASE');
  const settled=save.contractSettlements?.find(s=>s.year===save.year);
  return <section className="notice" aria-label="선수 계약"><p className="eyebrow">CONTRACT · OFFSEASON</p><h3>{released?'방출 · 새로운 소속을 찾아서':save.contractOffers.length?progress.eligible?'FA · 잔류와 새로운 도전':'소속 구단과 연봉 재계약':'현재 계약'}</h3><p>{teamName(save.player.teamId)} · 연봉 {save.player.salaryCR.toLocaleString()} CR · {save.player.contractYearsLeft??1}시즌{save.phase==='SEASON_RESULT'?' (종료 시즌 포함)':' 잔여'}<br/>명성 {save.player.reputation??0} · FA 인정 기간 {progress.earned} / {progress.required}일</p><p className="footnote">등록 기간은 1군 활동 라운드를 환산한 게임 기준입니다.</p>
  {settled&&<details><summary>올해 계약 정산</summary><p>고정 연봉 {settled.salaryCR.toLocaleString()} CR · 계약금 {settled.signingBonusCR.toLocaleString()} CR · 옵션 {settled.optionBonusCR.toLocaleString()} CR ({settled.optionAchieved?'달성':'미달성 또는 옵션 없음'})</p></details>}
  {save.pendingTrade&&<div className="tradeCard"><h3>구단의 트레이드 제안</h3><p>{teamName(save.pendingTrade.teamId)}에서 새 시즌을 제안했습니다. 연봉과 남은 계약 기간은 유지됩니다.</p><div className="actions"><button disabled={busy} onClick={()=>update(resolveTrade(save,true))}>트레이드 수락</button><button disabled={busy} onClick={()=>update(resolveTrade(save,false))}>잔류 요청</button></div></div>}
  {save.contractOffers.length>0&&<><p>{released?'최근 출전과 성적으로 소속 구단의 보류 명단에서 제외됐습니다. 새 구단 제안을 선택해야 다음 시즌으로 갈 수 있습니다.':'미선택 시 소속 구단 제시 연봉으로 1년 재계약합니다. FA 권리는 사용하지 않습니다.'}</p>{save.contractOffers.map((o,i)=><div className="contractChoice" key={o.teamId+'-'+i}><button className="offer" disabled={busy} onClick={()=>update(signContract(save,i))}><strong>{teamName(o.teamId)} · {contractLabel(o,progress.eligible)}</strong><span>연봉 {o.salaryCR.toLocaleString()} CR × {o.years}년 · 계약금 {(o.signingBonusCR??0).toLocaleString()} CR</span><span>보장 총액 {(o.salaryCR*o.years+(o.signingBonusCR??0)).toLocaleString()} CR · {save.player.role==='PITCHER'?'보직은 등판 성적으로 결정':o.opportunity==='STARTER'?'주전 기회':'벤치 경쟁'}</span>{o.option&&<span>매 시즌 {o.option.metric==='HITS'?'안타':'탈삼진'} {o.option.target}개 달성 시 옵션 +{o.option.bonusCR.toLocaleString()} CR</span>}</button><button className="skip" disabled={busy||o.negotiated} onClick={()=>update(negotiateSalary(save,i))} aria-label={teamName(o.teamId)+' '+(o.kind==='FA'?'FA':'재계약')+' 연봉 협상'}>{o.negotiated?'협상 반영 완료':'명성으로 연봉 협상'}</button></div>)}</>}
  </section>;
}
