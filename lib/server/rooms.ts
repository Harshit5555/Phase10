import {env} from 'cloudflare:workers';
import {applyAction,advanceAutomaticTurn,automaticTurnDue,log,makePlayer,newGame,publicView} from '../game/engine';
import type {Action,Game} from '../game/types';
import {AVATARS} from '../../config/game';
export class GameError extends Error {constructor(message:string,public status=400){super(message);}}
function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('Database binding missing');return db;}
export async function identity(request:Request){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)tenfold_session=([a-f0-9]{64})(?:;|$)/)?.[1];const raw=token??Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));return {session:Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join(''),cookie:token?null:`tenfold_session=${raw}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${new URL(request.url).protocol==='https:'?'; Secure':''}`};}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new GameError('Please make this move from your game tab.',403);if(request.headers.get('sec-fetch-site')==='cross-site')throw new GameError('Please open the game directly.',403);}
export async function readRoom(code:string){if(!/^[A-Z2-9]{5}$/.test(code))throw new GameError('That room code does not look right. Check the five characters.',404);const row=await database().prepare('SELECT state FROM rooms WHERE code = ?').bind(code).first<{state:string}>();if(!row)throw new GameError('We couldn’t find that room. Check the link or create a new game.',404);return JSON.parse(row.state) as Game;}
export async function updateRoom(code:string,edit:(g:Game)=>Game){for(let i=0;i<6;i++){const current=await readRoom(code);const expectedVersion=current.version;const next=edit(current);next.version=expectedVersion+1;next.updatedAt=Date.now();const result=await database().prepare('UPDATE rooms SET state = ?, version = ?, updated_at = ? WHERE code = ? AND version = ?').bind(JSON.stringify(next),next.version,next.updatedAt,code,expectedVersion).run();if(result.meta.changes===1)return next;}throw new GameError('The table is busy. Try that move once more.',409);}
export async function createRoom(name:string,session:string,avatar:string,demo:boolean){const recent=await database().prepare('SELECT count(*) AS count FROM rooms WHERE updated_at > ? AND json_extract(state,\'$.players[0].session\') = ?').bind(Date.now()-3600000,session).first<{count:number}>();if((recent?.count??0)>=20)throw new GameError('You’ve made plenty of rooms. Try one of your existing links or come back in an hour.',429);for(let i=0;i<5;i++){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const code=Array.from(crypto.getRandomValues(new Uint8Array(5)),n=>alphabet[n%alphabet.length]).join('');let g=newGame(code,makePlayer(name,session,avatar),demo);if(demo){g=applyAction(g,g.hostId,{type:'add-bot'});g=applyAction(g,g.hostId,{type:'add-bot'});g=applyAction(g,g.hostId,{type:'start'});}const result=await database().prepare('INSERT OR IGNORE INTO rooms (code,state,version,updated_at) VALUES (?,?,?,?)').bind(code,JSON.stringify(g),g.version,g.updatedAt).run();if(result.meta.changes===1)return g;}throw new GameError('We couldn’t reserve a room. Please try again.',503);}
export async function joinRoom(code:string,name:string,session:string,avatar:string){return updateRoom(code,g=>{const me=g.players.find(p=>p.session===session);if(me){me.lastSeen=Date.now();return g;}if(g.status!=='lobby')throw new GameError('This game has already started. Ask your friends to create a new room.');if(g.players.length>=6)throw new GameError('All six seats are taken.');if(g.players.some(p=>p.name.toLowerCase()===name.toLowerCase()))throw new GameError('Someone is already using that name. Pick another one.');g.players.push(makePlayer(name,session,avatar));log(g,`${name} joined the table.`);return g;});}
export async function move(code:string,session:string,action:Action){return updateRoom(code,g=>{const me=g.players.find(p=>p.session===session);if(!me)throw new GameError('Join the room before playing.',403);try{return applyAction(g,me.id,action);}catch(e){throw new GameError(e instanceof Error?e.message:'That move is not available.');}});}
export async function tick(code:string,session:string){
 let g=await readRoom(code);
 const me=g.players.find(p=>p.session===session);if(!me)return g;
 const now=Date.now(),host=g.players.find(p=>p.id===g.hostId)!;
 if(now-me.lastSeen>15000||(!host.bot&&now-host.lastSeen>60000)||automaticTurnDue(g,now)){
  g=await updateRoom(code,state=>{
   const member=state.players.find(p=>p.session===session)!;member.lastSeen=Date.now();
   const h=state.players.find(p=>p.id===state.hostId)!;
   if(!h.bot&&Date.now()-h.lastSeen>60000){state.hostId=member.id;log(state,`${member.name} is now the host.`);}
   return advanceAutomaticTurn(state);
  });
 }
 return g;
}
export function responseError(error:unknown){if(error instanceof GameError)return Response.json({error:error.message},{status:error.status});console.error('Tenfold room error',error);return Response.json({error:'The table is temporarily unavailable. Please try again in a moment.'},{status:503});}
export {publicView,AVATARS};
