import Game from './onboarding/Game.jsx';
import { useState } from 'react';
import GuidedLab from './learning/GuidedLab.jsx';
import MissionLab from './missions/MissionLab.jsx';
import './learning/lab.css';
export default function App(){const [view,setView]=useState('game');return <><nav className="mission-switch" aria-label="Learning workspace"><button aria-pressed={view==='game'} onClick={()=>setView('game')}>Onboarding game</button><button aria-pressed={view==='missions'} onClick={()=>setView('missions')}>Legacy Week 6 work</button><button aria-pressed={view==='lab'} onClick={()=>setView('lab')}>Explore & Flight Test Lab</button></nav>{view==='game'?<Game/>:view==='missions'?<MissionLab/>:<GuidedLab/>}</>;}
