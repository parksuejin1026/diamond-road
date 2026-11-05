import {expect,it} from 'vitest';
import {createCareer} from '../engine/career';
import {SHOP_ITEMS,shopState,buyShopItem} from '../engine/shop';
import {life,credit} from '../engine/life';
import {youthCupAwards} from '../engine/youthAwards';
import {finishSchoolYear} from '../engine/youth';
import {Rng} from '../engine/rng';
import {SCHOOLS} from '../engine/schools';
const make=()=>createCareer({name:'새 커리어',role:'HITTER',teamId:'lg',hand:'RIGHT'},9);
it('역할별 상품 3개를 추첨하고 재접속·RNG 소비로 바뀌지 않는다',()=>{
 for(const role of ['HITTER','PITCHER'] as const){const save=createCareer({name:'상점',role,teamId:'lg',hand:'RIGHT'},9);const stock=shopState(save);save.rngState+=1000;expect(shopState(save)).toEqual(stock);expect(stock.stock).toHaveLength(3);for(const id of stock.stock){const item=SHOP_ITEMS.find(i=>i.id===id)!;expect(!item.role||item.role===role).toBe(true);expect(Object.keys(item.effects).every(k=>k in save.player.skills)).toBe(true);}}
});
it('입고하지 않은 상품과 잔액 부족 구매를 막고 상한을 넘기지 않는다',()=>{
 const save=make(),stock=shopState(save),item=SHOP_ITEMS.find(i=>i.id===stock.stock[0])!;expect(life(save).cash).toBe(0);expect(buyShopItem(save,item.id)).toBe(save);credit(save,'earned',20000000,'경기 성과');
 const unavailable=SHOP_ITEMS.find(i=>!stock.stock.includes(i.id))!;expect(buyShopItem(save,unavailable.id)).toBe(save);
 for(const k of Object.keys(item.effects))save.player.skills[k]=98;const next=buyShopItem(save,item.id);expect(next.shop?.history).toHaveLength(1);expect(Object.keys(item.effects).every(k=>next.player.skills[k]<=99)).toBe(true);expect(buyShopItem(next,stock.stock[1])).toBe(next);
});
it('고교 대회 MVP는 실제 출전한 우승팀 선수에게만 주고 개인상을 분리한다',()=>{
 const save=make(),champion='lg';Object.assign(save.league.hitters.user,{g:5,pa:24,ab:20,h:15,hr:5,rbi:16});
 const awards=youthCupAwards(save.league,save.players,champion);expect(awards.find(a=>a.title==='대회 MVP')?.playerId).toBe('user');expect(awards.some(a=>a.title==='타격상'&&a.playerId==='user')).toBe(true);
 const other=youthCupAwards(save.league,save.players,'kia');expect(other.some(a=>a.title==='대회 MVP'&&a.playerId==='user')).toBe(false);
});
it('고교 우승과 개인상을 커리어에 보관하고 성과가 없는 학생에게 지원금을 주지 않는다',()=>{
 const save=createCareer({name:'유스',role:'HITTER',schoolId:SCHOOLS[0].id,teamId:'lg',hand:'RIGHT'},3),rng=new Rng(3);
 finishSchoolYear(save,rng,[]);expect(save.youth?.history[0].awards).toEqual([]);expect(life(save).cash).toBe(0);
 const winner=createCareer({name:'대회 주인공',role:'HITTER',schoolId:SCHOOLS[0].id,teamId:'lg',hand:'RIGHT'},4);
 finishSchoolYear(winner,new Rng(4),[{name:'황금사자기',champion:winner.player.teamId,games:[],hitter:{...winner.league.hitters.user,h:8,hr:2},pitcher:null,awards:[{title:'대회 MVP',playerId:'user'}]}]);
 expect(winner.youth?.history[0].awards).toEqual(['황금사자기 우승','황금사자기 대회 MVP']);expect(life(winner).cash).toBe(850000);expect(winner.youth?.history[0].hitter?.hr).toBe(2);
 finishSchoolYear(winner,new Rng(4),[]);expect(winner.youth?.history).toHaveLength(1);expect(life(winner).cash).toBe(850000);
});
