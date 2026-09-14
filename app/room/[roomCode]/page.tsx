import GameRoom from '@/components/game/GameRoom';
export default async function Room({params}:{params:Promise<{roomCode:string}>}){const {roomCode}=await params;return <GameRoom code={roomCode.toUpperCase()}/>;}
