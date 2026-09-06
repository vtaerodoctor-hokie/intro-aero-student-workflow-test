import { useState } from 'react';
import GuidedLab from './learning/GuidedLab.jsx';
import MissionLab from './missions/MissionLab.jsx';
import './learning/lab.css';
export default function App(){const [view,setView]=useState('missions');return <><nav className="mission-switch" aria-label="Learning workspace"><button aria-pressed={view==='missions'} onClick={()=>setView('missions')}>Weekly missions</button><button aria-pressed={view==='lab'} onClick={()=>setView('lab')}>Explore & Flight Test Lab</button></nav>{view==='missions'?<MissionLab/>:<GuidedLab/>}</>;}
