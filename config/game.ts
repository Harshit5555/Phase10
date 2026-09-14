import type {Requirement} from '../lib/game/types';
export const BRAND = {name:'Tenfold',tagline:'Good cards. Great company.'};
export const AVATARS = ['🐸','🦊','🐼','🐙','🐯','🦁'];
export const SCORING = {low:5,high:10,wild:25,highStartsAt:10};
export const DECK = {colors:['pink','mint','peach','lavender'] as const,min:1,max:12,copies:2,wilds:8};
export const PHASES: {name:string;groups:Requirement[]}[] = [
{name:'Two sets of 3',groups:[{kind:'set',count:3},{kind:'set',count:3}]},
{name:'A set of 3 + a run of 4',groups:[{kind:'set',count:3},{kind:'run',count:4}]},
{name:'A set of 4 + a run of 4',groups:[{kind:'set',count:4},{kind:'run',count:4}]},
{name:'A run of 7',groups:[{kind:'run',count:7}]},
{name:'A run of 8',groups:[{kind:'run',count:8}]},
{name:'A run of 9',groups:[{kind:'run',count:9}]},
{name:'Two sets of 4',groups:[{kind:'set',count:4},{kind:'set',count:4}]},
{name:'7 cards of one color',groups:[{kind:'color',count:7}]},
{name:'A set of 5 + a set of 2',groups:[{kind:'set',count:5},{kind:'set',count:2}]},
{name:'A set of 5 + a set of 3',groups:[{kind:'set',count:5},{kind:'set',count:3}]},
];
export const REACTIONS = ['😂','🔥','😭','👏','😮','Nice!','No way 😭','Your turn!','GG'];
