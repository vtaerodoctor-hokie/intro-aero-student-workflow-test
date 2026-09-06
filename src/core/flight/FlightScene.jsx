import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { bodyAttitudeToScene } from '../visualization/aircraftFrame.js';
function dispose(object){object.traverse(o=>{o.geometry?.dispose();(Array.isArray(o.material)?o.material:[o.material]).filter(Boolean).forEach(m=>m.dispose());});}
function plane(a,color=0xf0633e){
 const root=new T.Group(),mat=new T.MeshStandardMaterial({color,roughness:.7});
 for(const [size,position] of [[[1.3,.12,.12],[0,0,0]],[[a.meanChordM,a.wingSpanM,.025],[.05,0,0]],[[.18,.55,.02],[-.48,0,0]],[[.2,.02,.2],[-.5,0,.1]]]){const mesh=new T.Mesh(new T.BoxGeometry(...size),mat);mesh.position.set(...position);root.add(mesh);}return root;
}
export default function FlightScene({frame,baseline,history,aircraft,metadata,view,overlays,reduced,presentation="airborne"}){
 const host=useRef(),latest=useRef({frame,baseline,history,view,overlays,metadata,reduced});latest.current={frame,baseline,history,view,overlays,metadata,reduced};
 const [failed,setFailed]=useState(false);
 useEffect(()=>{
  if(reduced)return;
  const element=host.current;let renderer;
  try{renderer=new T.WebGLRenderer({antialias:true});}catch{setFailed(true);return;}
  const scene=new T.Scene();scene.background=new T.Color('#bcd9e4');scene.fog=new T.Fog('#bcd9e4',180,1100);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#bcd9e4');element.appendChild(renderer.domElement);
  const camera=new T.PerspectiveCamera(52,1,.05,1800);camera.up.set(0,0,1);
  scene.add(new T.HemisphereLight(0xffffff,0x55624e,2.3));const sun=new T.DirectionalLight(0xfff4dd,2);sun.position.set(20,-40,80);scene.add(sun);
  const ground=new T.Mesh(new T.PlaneGeometry(12000,12000),new T.MeshStandardMaterial({color:0x8da078,roughness:1}));scene.add(ground);
  if(presentation==='authority'){const runway=new T.Mesh(new T.PlaneGeometry(100,2),new T.MeshStandardMaterial({color:0x626c69,roughness:1}));runway.position.z=.015;scene.add(runway);}
  const grid=new T.GridHelper(1600,80,0x59715c,0x77916c);grid.rotation.x=Math.PI/2;grid.position.z=.02;scene.add(grid);
  const root=new T.Group();const fallback=plane(aircraft);root.add(fallback);scene.add(root);
  const ghost=plane(aircraft,0x4584af);ghost.traverse(o=>{if(o.material){o.material.transparent=true;o.material.opacity=.32;}});scene.add(ghost);
  const markerGroup=new T.Group();root.add(markerGroup);
  const cg=new T.Mesh(new T.SphereGeometry(.045),new T.MeshBasicMaterial({color:0xef6d26,depthTest:false}));
  const np=new T.Mesh(new T.OctahedronGeometry(.06),new T.MeshBasicMaterial({color:0x7359a5,depthTest:false}));cg.renderOrder=np.renderOrder=100;markerGroup.add(cg,np);
  const wind=new T.ArrowHelper(new T.Vector3(-1,0,0),new T.Vector3(.7,0,.22),.8,0x127d97,.12,.08);markerGroup.add(wind);
  const lift=new T.ArrowHelper(new T.Vector3(0,0,1),new T.Vector3(),.6,0x208251,.1,.06);markerGroup.add(lift);
  const moment=new T.ArrowHelper(new T.Vector3(0,-1,0),new T.Vector3(0,0,.1),.5,0x9257ad,.1,.06);markerGroup.add(moment);
  const trail=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xef683c}));scene.add(trail);
  let closed=false,raf,oldHistory=null;const elevators=[];
  new GLTFLoader().load(`${import.meta.env.BASE_URL}models/course-aircraft.glb`,g=>{if(closed){dispose(g.scene);return;}g.scene.rotation.x=Math.PI/2;g.scene.traverse(o=>{if(!o.isMesh)return; if(/^Elevator_/.test(o.name))elevators.push({mesh:o,rest:o.rotation.z});
    if(/^(Wing|Aileron)_/.test(o.name)){o.scale.x*=aircraft.meanChordM/.32;o.scale.z*=aircraft.wingSpanM/1.6;}
    if(/^(HorizontalTail|Elevator)_/.test(o.name)){const scale=Math.sqrt(Math.max(0,aircraft.tailAreaM2)/.09);o.geometry.computeBoundingBox();const center=o.geometry.boundingBox.getCenter(new T.Vector3());o.scale.x*=scale;o.scale.z*=scale;o.position.x=(aircraft.tailPositionM??-.48)-center.x*scale;}
   });root.remove(fallback);dispose(fallback);root.add(g.scene);},undefined,()=>{});
  const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();});resize.observe(element);
  const contextLost=e=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
  function update(){
   if(closed)return;const data=latest.current,f=data.frame||{xM:0,yM:0,altitudeM:80,pitchRad:0,rollRad:0,yawRad:0,alphaDeg:0,betaDeg:0,liftN:0};
   if(f){
    for(const {mesh,rest} of elevators)mesh.rotation.z=rest-(f.elevatorDeg||0)*Math.PI/180;
    root.position.set(f.xM,f.yM,f.altitudeM);const a=bodyAttitudeToScene(f);root.rotation.set(a.rollRad,a.pitchRad,a.yawRad,'ZYX');
    if(data.baseline){const b=data.baseline,ba=bodyAttitudeToScene(b);ghost.visible=true;ghost.position.set(b.xM,b.yM,b.altitudeM);ghost.rotation.set(ba.rollRad,ba.pitchRad,ba.yawRad,'ZYX');}else ghost.visible=false;
    markerGroup.visible=data.overlays;cg.position.set(data.metadata?.resolved.cgM||0,0,.14);np.position.set(data.metadata?.resolved.neutralPointM||0,0,.28);
    const alpha=f.alphaDeg*Math.PI/180,beta=f.betaDeg*Math.PI/180;wind.setDirection(new T.Vector3(-Math.cos(alpha)*Math.cos(beta),-Math.sin(beta),Math.sin(alpha)*Math.cos(beta)).normalize());
    moment.visible=Math.abs(f.pitchMomentNm||0)>.001;moment.setDirection(new T.Vector3(0,-Math.sign(f.pitchMomentNm||1),0));moment.setLength(Math.min(.8,Math.abs(f.pitchMomentNm||0)/(f.overlayMomentScaleNm||1))+.15);
    lift.setDirection(new T.Vector3(0,0,f.liftN>=0?1:-1));lift.setLength(Math.min(1.5,Math.abs(f.liftN)/(f.overlayForceScaleN||30))+.1);
    const offset=data.view==='side'?new T.Vector3(0,presentation==='authority'?-2.5:-5,presentation==='authority'?.4:1):data.view==='front'?new T.Vector3(5,0,1):new T.Vector3(-3.1,-1.6,1.1);
    if(data.view==='chase')offset.applyAxisAngle(new T.Vector3(0,0,1),f.yawRad);
    camera.position.copy(root.position).add(offset);camera.lookAt(root.position.clone().add(new T.Vector3(0,0,-.1)));
    if(oldHistory!==data.history){oldHistory=data.history;const points=(data.history||[]).filter((_,i)=>i%5===0).map(s=>new T.Vector3(s.xM,s.yM,s.altitudeM));trail.geometry.dispose();trail.geometry=new T.BufferGeometry().setFromPoints(points);}
   }
   renderer.render(scene,camera);raf=requestAnimationFrame(update);
  }
  update();return()=>{closed=true;cancelAnimationFrame(raf);resize.disconnect();renderer.domElement.removeEventListener('webglcontextlost',contextLost);dispose(scene);renderer.dispose();renderer.domElement.remove();};
 },[aircraft.wingSpanM,aircraft.meanChordM,aircraft.tailAreaM2,aircraft.tailPositionM,reduced,presentation]);
 const f=frame;
 if(reduced||failed)return <div className="flight-fallback" role="img" aria-label="Aircraft attitude diagram"><p>{failed?'3D is unavailable.':'Motion-reduced diagram.'} Live graphs and numeric flight data remain available.</p><svg viewBox="0 0 600 240"><path d="M20 180H580" stroke="#819888" strokeDasharray="6 6"/><g transform={`translate(300 115) rotate(${-(f?.pitchDeg||0)})`}><path d="M-115 0H120L88 -12M-60 0L-90 -35" stroke="#ec6744" fill="none" strokeWidth="8"/><path d="M0 0L-80 30" stroke="#246b88" strokeWidth="4"/></g><text x="25" y="215">Pitch {f?.pitchDeg.toFixed(1)||'0'}° · α {f?.alphaDeg.toFixed(1)||'0'}° · bank {f?.rollDeg.toFixed(1)||'0'}°</text></svg></div>;
 return <div ref={host} className="flight-scene" role="img" tabIndex={0} aria-label={presentation==='authority'?'Schematic initial pitch response above a runway; no ground trajectory is simulated.':'Aircraft flying above a ground grid. Orange trail is the current flight; a blue aircraft shows the baseline.'}/>;
}
