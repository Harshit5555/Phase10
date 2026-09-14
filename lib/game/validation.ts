import {PHASES} from '../../config/game';
import type {Card,Combination,Requirement} from './types';
const real=(cards:Card[])=>cards.filter(c=>c.color!=='wild');
const unique=(cards:Card[])=>new Set(cards.map(c=>c.id)).size===cards.length;
export function validateSet(cards:Card[],count=3){return cards.length>=count&&unique(cards)&&new Set(real(cards).map(c=>c.value)).size<=1;}
export function validateColorGroup(cards:Card[],count=7){return cards.length>=count&&unique(cards)&&new Set(real(cards).map(c=>c.color)).size<=1;}
export function runStart(cards:Card[]):number|null{if(!unique(cards)||cards.length>12||!cards.length)return null;const values=real(cards).map(c=>c.value);if(new Set(values).size!==values.length)return null;for(let start=1;start<=13-cards.length;start++){if(values.every(v=>v>=start&&v<start+cards.length))return start;}return null;}
export function validateRun(cards:Card[],count=4){return cards.length>=count&&runStart(cards)!==null;}
export function validateGroup(cards:Card[],r:Requirement){return cards.length===r.count&&(r.kind==='set'?validateSet(cards,r.count):r.kind==='run'?validateRun(cards,r.count):validateColorGroup(cards,r.count));}
export function validatePhase(groups:Card[][],phase:number){const req=PHASES[phase]?.groups;return !!req&&groups.length===req.length&&unique(groups.flat())&&groups.every((g,i)=>validateGroup(g,req[i]));}
export function explainGroup(cards:Card[],r:Requirement){if(cards.length<r.count)return `Your ${r.kind} needs ${r.count-cards.length} more card${r.count-cards.length===1?'':'s'}.`;if(cards.length>r.count)return `Choose exactly ${r.count} cards for this ${r.kind}.`;return validateGroup(cards,r)?'Ready to play':r.kind==='set'?"These cards need the same number (wilds can help).":r.kind==='run'?"Use consecutive numbers with no repeats. Wilds fill gaps.":"These cards need the same color (wilds can help).";}
export function makeCombination(cards:Card[],r:Requirement,ownerId:string):Combination{let ordered=[...cards],values=cards.map(c=>c.value);if(r.kind==='run'){const start=runStart(cards);if(start===null)throw new Error('Your cards do not form a run.');const wilds=cards.filter(c=>c.color==='wild');values=Array.from({length:cards.length},(_,i)=>start+i);ordered=values.map(v=>cards.find(c=>c.color!=='wild'&&c.value===v)??wilds.shift()!);}return {id:crypto.randomUUID(),ownerId,kind:r.kind,cards:ordered,values};}
export function canHitOnCombination(card:Card,group:Combination,side:'start'|'end'='end'){if(group.cards.some(c=>c.id===card.id))return false;if(group.kind==='set')return validateSet([...group.cards,card],1);if(group.kind==='color')return validateColorGroup([...group.cards,card],1);const next=side==='start'?group.values[0]-1:group.values[group.values.length-1]+1;return next>=1&&next<=12&&(card.color==='wild'||card.value===next);}
function subsets<T>(items:T[],size:number):T[][]{const out:T[][]=[];function walk(at:number,arr:T[]){if(arr.length===size){out.push(arr);return;}for(let i=at;i<=items.length-(size-arr.length);i++)walk(i+1,[...arr,items[i]]);}walk(0,[]);return out;}
export function findPhase(hand:Card[],phase:number):Card[][]|null{const req=PHASES[phase]?.groups;if(!req)return null;function search(rest:Card[],index:number):Card[][]|null{if(index===req.length)return [];for(const choice of subsets(rest,req[index].count)){if(!validateGroup(choice,req[index]))continue;const ids=new Set(choice.map(c=>c.id));const tail=search(rest.filter(c=>!ids.has(c.id)),index+1);if(tail)return [choice,...tail];}return null;}return search(hand,0);}
// Count the most cards that can contribute to disjoint objective groups.
// Bots use this to retain consecutive values for runs instead of hoarding pairs.
export function phaseProgress(hand:Card[],phase:number):number{
 const requirements=PHASES[phase]?.groups;if(!requirements)return 0;
 function search(rest:Card[],index:number):number{
  if(index===requirements.length)return 0;
  const r=requirements[index],wilds=rest.filter(c=>c.color==='wild');
  const choices:Card[][]=[];
  if(r.kind==='set')for(let value=1;value<=12;value++)choices.push(rest.filter(c=>c.color!=='wild'&&c.value===value).slice(0,r.count));
  if(r.kind==='color')for(const color of ['pink','mint','peach','lavender'])choices.push(rest.filter(c=>c.color===color).slice(0,r.count));
  if(r.kind==='run')for(let start=1;start<=13-r.count;start++){const seen=new Set<number>();choices.push(rest.filter(c=>{if(c.color==='wild'||c.value<start||c.value>=start+r.count||seen.has(c.value))return false;seen.add(c.value);return true;}));}
  let best=0;
  for(const natural of choices)for(let n=0;n<=Math.min(wilds.length,r.count-natural.length);n++){
   const used=[...natural,...wilds.slice(0,n)],ids=new Set(used.map(c=>c.id));
   best=Math.max(best,used.length+search(rest.filter(c=>!ids.has(c.id)),index+1));
  }
  return best;
 }
 return search(hand,0);
}
