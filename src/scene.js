import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {PARTS,FABRICS,COLORS,progress} from './rules.js';

const TAU=Math.PI*2;
const sphere=new THREE.SphereGeometry(1,40,28),smallSphere=new THREE.SphereGeometry(1,18,12);
const clothSphere=sphere.clone();
const vertices=clothSphere.attributes.position;
for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),y=vertices.getY(i),z=vertices.getZ(i);const pinch=1+.005*Math.sin(y*23+Math.atan2(z,x)*8)+.003*Math.cos(x*17-z*12);vertices.setXYZ(i,x*pinch,y*pinch,z*pinch);}
clothSphere.computeVertexNormals();
const mat=(color,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
function mesh(parent,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function ell(parent,material,x,y,z,sx,sy,sz){const m=mesh(parent,sphere,material,x,y,z);m.scale.set(sx,sy,sz);return m;}
function box(parent,material,x,y,z,w,h,d){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z);}
function cyl(parent,material,x,y,z,r,h){return mesh(parent,new THREE.CylinderGeometry(r,r,h,24),material,x,y,z);}
function line(parent,points,color='#715942',r=.008){return mesh(parent,new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(12,points.length*3),r,5,false),mat(color));}
function texture(kind,angle=0,offset=0){
 const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.fillStyle=kind==='wood'?'#ac7950':'#f4f0e9';x.fillRect(0,0,256,256);
 let seed=1927;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 if(kind==='wood'){
  for(let i=0;i<420;i++){const y=rnd()*256;x.strokeStyle=`rgba(${rnd()>.5?'76,38,20':'238,198,144'},${.05+rnd()*.2})`;x.lineWidth=rnd()*2+.4;x.beginPath();x.moveTo(0,y);for(let j=0;j<9;j++)x.lineTo(j*32,y+Math.sin(j*.9+i)*3);x.stroke();}
 }else{
  for(let i=0;i<256;i+=kind==='plush'?2:4){x.strokeStyle='rgba(99,81,62,.12)';x.lineWidth=1;x.beginPath();x.moveTo(i,0);x.lineTo(i,256);x.moveTo(0,i);x.lineTo(256,i);x.stroke();x.strokeStyle='rgba(255,255,255,.5)';x.beginPath();x.moveTo(i+1,0);x.lineTo(i+1,256);x.stroke();}
  if(kind==='linen'){for(let k=0;k<256;k+=64){x.fillStyle='rgba(59,74,48,.18)';x.fillRect(k,0,14,256);x.fillRect(0,k,256,14);x.fillStyle='rgba(255,255,255,.3)';x.fillRect(k+23,0,5,256);x.fillRect(0,k+23,256,5);}}
  for(let i=0;i<(kind==='plush'?13000:1800);i++){const px=rnd()*256,py=rnd()*256;x.strokeStyle=`rgba(${rnd()>.45?'255,253,248':'96,83,63'},${.06+rnd()*.14})`;x.lineWidth=kind==='plush'?.7:.6;x.beginPath();x.moveTo(px,py);x.lineTo(px+(rnd()-.5)*3,py+(kind==='plush'?3+rnd()*4:1));x.stroke();}
 }
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(kind==='wood'?3:kind==='linen'?2:4,kind==='wood'?2:kind==='linen'?2:4);t.center.set(.5,.5);t.rotation=angle;t.offset.set(offset,offset*.5);t.anisotropy=4;return t;
}
function label(parent,title,subtitle,w,h,x,y,z){const c=document.createElement('canvas');c.width=768;c.height=384;const ctx=c.getContext('2d');ctx.fillStyle='#eadbc5';ctx.fillRect(0,0,768,384);ctx.strokeStyle='#8a765d';ctx.lineWidth=3;ctx.strokeRect(24,24,720,336);ctx.textAlign='center';ctx.fillStyle='#52634b';ctx.font='bold 82px "Microsoft YaHei",sans-serif';ctx.fillText(title,384,183);ctx.font='30px Georgia';ctx.fillText(subtitle,384,270);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mesh(parent,new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}),x,y,z);}
const PART_LAYOUT={body:[0,1.18,0,.68,.83,.49],head:[0,2.25,0,.68,.59,.52],earL:[-.55,2.75,-.01,.28,.3,.17],earR:[.55,2.75,-.01,.28,.3,.17],armL:[-.8,1.35,0,.29,.57,.28],armR:[.8,1.35,0,.29,.57,.28],legL:[-.43,.42,.19,.36,.42,.4],legR:[.43,.42,.19,.36,.42,.4]};
export class WorkshopScene{
 constructor(container,getState,onWorld){
  this.getState=getState;this.onWorld=onWorld;this.container=container;this.materials=new Map();this.lastKey='';this.time=0;this.press=0;this.samples=[];this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#d3c7b6');this.scene.fog=new THREE.Fog('#d3c7b6',11,23);
  this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.9;container.appendChild(this.renderer.domElement);
  this.camera=new THREE.PerspectiveCamera(38,1,.1,70);this.camera.position.set(4,3.25,6.8);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.3,0);this.controls.enableDamping=true;this.controls.enablePan=false;this.controls.minDistance=3.1;this.controls.maxDistance=11;this.controls.minPolarAngle=.35;this.controls.maxPolarAngle=Math.PI*.53;this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};this.controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};
  const pmrem=new THREE.PMREMGenerator(this.renderer);const env=new RoomEnvironment();this.env=pmrem.fromScene(env,.04);this.scene.environment=this.env.texture;env.dispose();pmrem.dispose();
  this.scene.environmentIntensity=.7;this.scene.add(new THREE.HemisphereLight('#ffedcc','#b9b5a5',.9));const sun=new THREE.DirectionalLight('#ffefd7',2.4);sun.position.set(-3.5,6,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-6;sun.shadow.camera.right=6;sun.shadow.camera.top=6;sun.shadow.camera.bottom=-5;sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;this.scene.add(sun);this.sun=sun;const fill=new THREE.DirectionalLight('#d9e9ec',.65);fill.position.set(4,3,-1);this.scene.add(fill);
  this.room();this.workGroup=new THREE.Group();this.scene.add(this.workGroup);this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.setTool('view');
  this.renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());let down=null;
  this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};if(this.tool==='press'){this.press=1;this.pick(e,'press');}});
  this.renderer.domElement.addEventListener('pointerup',e=>{if(down&&Math.hypot(down.x-e.clientX,down.y-e.clientY)<8&&this.tool!=='view')this.pick(e,this.tool);down=null;});
  for(const event of ['pointercancel','lostpointercapture'])this.renderer.domElement.addEventListener(event,()=>{down=null;this.press=0;});window.addEventListener('blur',()=>{down=null;this.press=0;});document.addEventListener('visibilitychange',()=>{if(document.hidden){down=null;this.press=0;}});
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.onWorld('contextlost');});this.renderer.domElement.addEventListener('webglcontextrestored',()=>{this.lost=false;this.onWorld('contextrestored');});
  this.renderer.setAnimationLoop(t=>this.frame(t));
 }
 fabric(p){const key=JSON.stringify(p&&[p.fabric,p.color,p.angle,p.offset]);if(!this.materials.has(key)){const t=texture(p.fabric,p.angle,p.offset),m=new THREE.MeshPhysicalMaterial({color:COLORS.find(c=>c[0]===p.color)[2],map:t,bumpMap:t,bumpScale:p.fabric==='plush'?.042:p.fabric==='linen'?.02:.01,roughness:FABRICS[p.fabric].roughness,sheen:p.fabric==='plush'?1:.5,sheenColor:new THREE.Color('#e7d1b2'),sheenRoughness:.8});this.materials.set(key,m);}return this.materials.get(key);}
 room(){
  const world=this.scene,wood=mat('#d3ae86',.82);wood.map=texture('wood');wood.bumpMap=wood.map;wood.bumpScale=.022;const dark=mat('#6c5942'),cream=mat('#e9e0cd'),sage=mat('#728269'),metal=new THREE.MeshStandardMaterial({color:'#b0b9b5',metalness:.8,roughness:.26});
  box(world,mat('#dfd5c3'),0,-1.25,0,24,.15,24);box(world,mat('#ddd4c2'),0,3,-4.5,15,9,.2);box(world,mat('#c9cbb9'),-6,3,0,.2,9,12);
  const slab=box(world,wood,0,-.16,.35,8.6,.35,5.3);for(const x of [-3.6,3.6])for(const z of [-1.75,2.35])box(world,dark,x,-.78,z,.22,1.2,.22);
  for(const x of [-4.4,-2.5])box(world,cream,x,3,-4.32,.13,3.1,.2);for(const y of [1.47,3,4.55])box(world,cream,-3.45,y,-4.31,2.2,.12,.2);box(world,new THREE.MeshBasicMaterial({color:'#e8efda'}),-3.45,3,-4.4,2.02,3,.1);for(let i=0;i<6;i++)box(world,mat('#cddbb8'),-4.4+i*.38,1.6,-4.27,.02,.4+Math.sin(i)*.2,.02);
  label(world,'布偶小铺','PLUSH LITTLE SHOP · MADE WITH CARE',2.8,1.4,.5,3.55,-4.3);
  for(const y of [1.3,2.6]){box(world,wood,3.6,y,-4,.9,.12,1);for(let i=0;i<3;i++){const m=mat(['#b9957d','#92a384','#d4c9a4'][i]);const jar=cyl(world,m,3.35+i*.27,y+.25,-4,.11,.36);cyl(world,dark,jar.position.x,y+.46,-4,.13,.06);}}
  const tray=box(world,sage,-2.65,.02,-.45,1.48,.13,1.12);for(let i=0;i<4;i++){const p={fabric:['cotton','linen','plush'][i%3],color:['rose','sage','cream','blue'][i],angle:0,offset:0};const folded=box(world,this.fabric(p),-2.65,.12+i*.075,-.5,1.22,.075,.82);folded.rotation.y=.03*i;}
  const spool=(x,z,color)=>{cyl(world,cream,x,.2,z,.16,.37);cyl(world,this.fabric({fabric:'cotton',color,angle:0,offset:0}),x,.2,z,.145,.27);cyl(world,wood,x,.02,z,.2,.06);cyl(world,wood,x,.39,z,.2,.05);};spool(2.5,-.65,'rose');spool(2.98,-.7,'sage');spool(3.4,-.55,'cream');
  const scissors=new THREE.Group();scissors.position.set(2.7,.02,1.7);scissors.rotation.y=-.4;world.add(scissors);for(const s of [-1,1]){const tor=mesh(scissors,new THREE.TorusGeometry(.17,.045,10,32),sage,s*.18,.08,.35);tor.rotation.x=Math.PI/2;const blade=box(scissors,metal,s*.1,.07,-.12,.055,.035,.7);blade.rotation.y=s*.19;}ell(scissors,metal,0,.1,.12,.06,.025,.06);
  const pad=ell(world,this.fabric({fabric:'plush',color:'rose',angle:0,offset:0}),2.1,.15,.8,.37,.15,.31);for(let i=0;i<7;i++){const x=2.1+Math.cos(i)*.21,z=.8+Math.sin(i)*.2;line(world,[[x,.2,z],[x+.025,.48,z-.05]],'#b9b3a0',.006);ell(world,mat(i%2?'#e2c561':'#d5998b'),x+.025,.49,z-.05,.035,.035,.035);}
  const basket=box(world,mat('#b8a27b'),-2.9,.25,1.5,.95,.48,.83);for(let i=0;i<28;i++){const x=-3.3+(i%7)*.13;line(world,[[x,.02,1.92],[x,.5,1.92]],'#857658',.01);}for(let i=0;i<17;i++){const x=-3.18+(i%4)*.19,z=1.23+Math.floor(i/4)*.13;ell(world,mat('#f1ece3'),x,.44+(i%3)*.04,z,.2,.12,.16);}
  const plant=new THREE.Group();world.add(plant);cyl(plant,mat('#c18866'),-3.7,.32,-1.75,.24,.6);for(let i=0;i<8;i++){const a=i*2.4,x=-3.7+Math.cos(a)*.3,z=-1.75+Math.sin(a)*.25,y=.65+i*.065;line(plant,[[-3.7,.4,-1.75],[x,y,z]],'#546341',.014);const leaf=ell(plant,mat('#71845b'),x,y,z,.18,.055,.28);leaf.rotation.z=Math.sin(a)*.4;}
  label(world,'一针一线','every stitch has a story',1.5,.7,0,.04,2.95).rotation.x=-Math.PI/2;
  this.contact=new THREE.Group();world.add(this.contact);const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d'),g=cx.createRadialGradient(64,64,5,64,64,64);g.addColorStop(0,'rgba(60,38,21,.35)');g.addColorStop(1,'rgba(60,38,21,0)');cx.fillStyle=g;cx.fillRect(0,0,128,128);const shadow=mesh(this.contact,new THREE.PlaneGeometry(2.9,2.5),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}),0,.027,.1);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
 }
 buildBear(w,parent,offset=0,mini=false){
  const root=new THREE.Group();root.position.x=offset;parent.add(root);if(mini)root.scale.setScalar(.75);const stage=w.stage,flat=stage==='cut';const sewn=stage==='sew';const fullness=stage==='design'?.94:.42+w.fill*.58;
  const bodyGroup=new THREE.Group();root.add(bodyGroup);const partMeshes={};
  for(const [id] of PARTS){const p=w.parts[id],cfg=PART_LAYOUT[id],g=new THREE.Group();root.add(g);g.userData.part=id;
   let [x,y,z,sx,sy,sz]=cfg;
   if(flat){x=(PARTS.findIndex(a=>a[0]===id)%4-1.5)*.92;y=.07;z=Math.floor(PARTS.findIndex(a=>a[0]===id)/4)*1.05-.4;sx*=.64;sy*=.64;sz=.028;g.rotation.x=-Math.PI/2;if(stage==='cut'&&progress(p.cut)===1)y=.1;}
   else if(sewn&&progress(w.seams[id].bits)<1){x=id==='body'?0:x*2.7;y=.2;z=id==='body'?0:(id.startsWith('ear')?-1.1:id.startsWith('arm')?.4:1.25);g.rotation.x=-Math.PI/2;sz=.05;}
   else if(!flat){const localFill=w.repair&&id!=='body'?.87:w.fill;sz*=w.repair&&id!=='body'?.42+.87*.58:fullness;sx*=.85+localFill*.15;sy*=.96+localFill*.04;}
   const m=mesh(g,clothSphere,this.fabric(p));m.scale.set(sx,sy,sz);g.position.set(x,y,z);partMeshes[id]=g;if(id==='earL'||id==='earR'){g.rotation.z=(id==='earL'?1:-1)*w.earAngle;const inner=ell(g,this.fabric({...p,color:p.color==='rose'?'cream':'rose'}),0,-.015,sz*.88,sx*.58,sy*.65,.028);}
   if(!flat&&!(sewn&&progress(w.seams[id].bits)<1)){
    if(id.startsWith('leg'))ell(g,this.fabric({...p,color:'cream'}),0,-.05,sz*.9,sx*.65,sy*.55,.06);
    const seam=w.seams[id],points=[];for(let i=0;i<64;i++){const a=i/64*TAU;const visible=(id!=='body'||i<57||progress(w.closed)===1)&&(!w.repair||id!=='body'||i<19||i>25||progress(w.repair.bits)===1);if(visible){const xx=Math.sin(a)*sx*.99,yy=Math.cos(a)*sy*.99;points.push(new THREE.Vector3(xx,yy,0),new THREE.Vector3(Math.sin(a+.018)*sx*.997,Math.cos(a+.018)*sy*.997,.015));}}
    const seamLines=new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#6f5641'}));g.add(seamLines);
   }
  }
  if(!flat){
   const connected=!(sewn&&progress(w.seams.head.bits)<1),face=new THREE.Group();partMeshes.head.add(face);face.position.set(w.faceX,w.faceY,.52*(w.repair?.42+.87*.58:fullness));
   if(connected){ell(face,this.fabric({fabric:'cotton',color:'cream',angle:0,offset:0}),0,-.19,.002,.34,.23,.09);const eyeMat=new THREE.MeshPhysicalMaterial({color:'#362c27',roughness:.2,clearcoat:1});
    for(const s of [-1,1]){
     if(w.eyes==='sleepy')line(face,[[s*.25-.1,.035,.015],[s*.25,.075,.035],[s*.25+.1,.035,.015]],'#493b32',.016);
     else{ell(face,eyeMat,s*.245,.065,.025,w.eyes==='glass'?.07:.08,.08,.035);if(w.eyes==='button'){for(const v of [-1,1])ell(face,mat('#c8a985'),s*.245+v*.022,.065,.061,.011,.015,.004);line(face,[[s*.245-.021,.066,.064],[s*.245+.021,.066,.064]],'#735b44',.004);}else ell(face,mat('#f9ead5'),s*.245-.019,.094,.056,.018,.02,.006);}
     ell(face,new THREE.MeshStandardMaterial({color:'#ce8d83',transparent:true,opacity:.38}),s*.37,-.095,-.006,.09,.047,.012);
    }
    ell(face,eyeMat,0,-.15,.105,.071,.046,.031);line(face,[[0,-.18,.102],[0,-.235,.107]],'#514235',.01);
    if(w.mouth==='smile')line(face,[[-.12,-.245,.097],[-.06,-.285,.103],[0,-.26,.109],[.06,-.285,.103],[.12,-.245,.097]],'#514235',.008);
    if(w.mouth==='tiny')line(face,[[-.065,-.265,.103],[0,-.28,.109],[.065,-.265,.103]],'#514235',.009);
    if(w.mouth==='wonder')ell(face,eyeMat,0,-.29,.105,.03,.045,.008);
   }
   if(!sewn){const b=partMeshes.body;for(const d of w.decorations){const group=this.decoration(d,w);b.add(group);}}
   if((stage==='fill'||stage==='close')&&progress(w.closed)<1){this.opening(root,w,0,1.3,-.48*fullness,'fill');}
   if(w.repair&&progress(w.repair.bits)<1){this.opening(root,w,.59,.88,.25,'repair');}
   if(w.repair&&progress(w.repair.bits)>0){const pts=[];for(let i=0;i<24;i++)if(w.repair.bits[i]){const y=.67+i*.018;pts.push(new THREE.Vector3(.60,y,.25),new THREE.Vector3(.56,y+.012,.29));}root.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:w.repair.visible?'#ca8a79':'#8d6753'})));}
  }
  root.userData.parts=partMeshes;return root;
 }
 opening(root,w,x,y,z,type){const g=new THREE.Group();root.add(g);g.userData.damage=type==='repair';g.position.set(x,y,z);if(type==='fill')g.rotation.y=Math.PI;else g.rotation.y=Math.PI*.35;ell(g,mat('#49362c'),0,0,0,.12,.23,.032);for(let i=0;i<5;i++)ell(g,mat('#eee6d8'),(i%2-.5)*.065,(i-2)*.065,.022,.067,.045,.04);const target=mesh(g,new THREE.TorusGeometry(.24,.012,6,48),new THREE.MeshBasicMaterial({color:'#d7a24f'}),0,0,.03);target.scale.x=.7;target.userData.damage=type==='repair';target.userData.type=type;if(type==='repair'){const hit=mesh(g,new THREE.CircleGeometry(.24,32),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}),0,0,.06);hit.scale.x=.7;hit.userData.damage=true;}}
 decoration(d,w){
  const g=new THREE.Group();const f=.42+w.fill*.58,x=d.x,y=d.y,z=.49*f*Math.sqrt(Math.max(.05,1-(x/(.68*(.85+w.fill*.15)))**2-(y/.83)**2));g.position.set(x,y,z+.018);g.rotation.set(-y*.42,x*.66,d.rotation);g.scale.setScalar(d.scale);g.userData.decoration=d.id;
  const pink=this.fabric({fabric:'cotton',color:'rose',angle:0,offset:0}),green=this.fabric({fabric:'linen',color:'sage',angle:0,offset:0});
  if(d.type==='bow'){for(const s of [-1,1]){const wing=ell(g,pink,s*.16,0,0,.19,.12,.075);wing.rotation.z=s*.3;const tail=ell(g,pink,s*.11,-.15,-.025,.06,.15,.023);tail.rotation.z=s*.2;}ell(g,pink,0,0,.06,.06,.08,.04);}
  if(d.type==='patch'){box(g,green,0,0,0,.33,.28,.035);for(let i=0;i<10;i++){const x=-.14+i*.03;line(g,[[x,-.125,.028],[x+.013,-.11,.03]],'#ead7b5',.0035);line(g,[[x,.12,.028],[x+.013,.105,.03]],'#ead7b5',.0035);}}
  if(d.type==='heart'){const shape=new THREE.Shape();shape.moveTo(0,-.15);shape.bezierCurveTo(-.4,.08,-.08,.31,0,.13);shape.bezierCurveTo(.08,.31,.4,.08,0,-.15);const m=mesh(g,new THREE.ExtrudeGeometry(shape,{depth:.022,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.006,bevelThickness:.008}),pink);m.userData.original=d.original;for(let i=0;i<7;i++){const a=i/7*TAU;ell(g,mat('#f0d4a6'),Math.cos(a)*.105,Math.sin(a)*.09,.044,.012,.006,.005);}}
  if(d.type==='flower'){for(let i=0;i<5;i++){const a=i/5*TAU,petal=ell(g,this.fabric({fabric:'cotton',color:'cream',angle:0,offset:0}),Math.sin(a)*.09,Math.cos(a)*.09,0,.065,.083,.022);petal.rotation.z=-a;}ell(g,this.fabric({fabric:'cotton',color:'honey',angle:0,offset:0}),0,0,.03,.06,.06,.03);}
  return g;
 }
 disposeWork(){this.workGroup.traverse(o=>{if(o.geometry&&o.geometry!==sphere&&o.geometry!==smallSphere&&o.geometry!==clothSphere)o.geometry.dispose();if(o.material&&!Array.from(this.materials.values()).includes(o.material))o.material.dispose();});this.workGroup.clear();}
 sync(force=false){const w=this.getState().work,key=JSON.stringify(w);if(!force&&key===this.lastKey)return;const previous={};if(this.bear&&!this.compare&&this.workId===w.id)for(const [id,g] of Object.entries(this.bear.userData.parts))previous[id]={pos:g.position.clone(),rot:g.quaternion.clone(),scale:g.children[0].scale.clone()};this.lastKey=key;this.workId=w.id;this.disposeWork();if(this.compare&&w.repair){this.before=this.buildBear(w.repair.before,this.workGroup,-1.15,true);this.bear=this.buildBear(w,this.workGroup,1.15,true);}else{this.bear=this.buildBear(w,this.workGroup);}this.transitions=[];if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const [id,old] of Object.entries(previous)){const g=this.bear.userData.parts[id];this.transitions.push({g,from:old,to:{pos:g.position.clone(),rot:g.quaternion.clone(),scale:g.children[0].scale.clone()},elapsed:0});g.position.copy(old.pos);g.quaternion.copy(old.rot);g.children[0].scale.copy(old.scale);}this.setQuality(this.getState().quality);}
 setQuality(q){const low=q==='low';this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.5));this.sun.shadow.mapSize.set(low?1024:2048,low?1024:2048);if(this.quality!==q){this.quality=q;this.sun.shadow.map?.dispose();this.sun.shadow.map=null;this.resize();}}
 setTool(tool){this.tool=tool;this.controls.enabled=tool==='view';this.renderer.domElement.style.cursor=tool==='view'?'grab':tool==='press'?'pointer':'crosshair';}
 view(name){const target=new THREE.Vector3(0,name==='detail'?2.08:1.3,0),p={front:[0,2.5,6.4],side:[6,2.5,1.6],back:[0,2.5,-6.4],detail:[.8,2.6,3.4],room:[4,3.25,6.8]}[name]||[0,2.5,6.4];this.camera.position.set(...p);this.controls.target.copy(target);this.controls.update();for(const object of this.scene.children)if(object.position.z<-3.5)object.visible=this.camera.position.z>-3;}
 pick(e,tool){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.raycaster.setFromCamera(this.pointer,this.camera);const hits=this.raycaster.intersectObjects(this.workGroup.children,true);if(!hits.length)return;if(tool==='repair'){const region=hits.some(h=>{let node=h.object;while(node){if(node.userData.damage)return true;node=node.parent;}return false;});if(region){this.onWorld('damage');return;}}let p=hits[0].object,id=null,damage=false;while(p){if(p.userData.decoration)id=p.userData.decoration;if(p.userData.damage)damage=true;p=p.parent;}if(tool==='press'){this.press=1;this.onWorld('press');return;}if(tool==='repair'&&damage){this.onWorld('damage');return;}if(tool==='decorate'){
  if(id){this.onWorld('selectDecoration',id);return;}
  const pos=hits[0].point.clone();this.bear.worldToLocal(pos);this.onWorld('placeDecoration',{x:Math.max(-.52,Math.min(.52,pos.x)),y:Math.max(-.62,Math.min(.62,pos.y-1.18))});
 }else if(tool==='repair')this.onWorld('missDamage');}
 resize(){const {width,height}=this.container.getBoundingClientRect();if(!width||!height)return;this.camera.aspect=width/height;this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);}
 frame(t){if(this.lost||document.hidden)return;const dt=this.time?Math.min(100,t-this.time):16;this.time=t;this.samples.push(dt);if(this.samples.length>180)this.samples.shift();for(const a of this.transitions||[]){a.elapsed+=dt;const p=Math.min(1,a.elapsed/380),ease=p*p*(3-2*p);a.g.position.lerpVectors(a.from.pos,a.to.pos,ease);a.g.quaternion.slerpQuaternions(a.from.rot,a.to.rot,ease);a.g.children[0].scale.lerpVectors(a.from.scale,a.to.scale,ease);}this.transitions=(this.transitions||[]).filter(a=>a.elapsed<380);this.press=Math.max(0,this.press-dt*.003);if(this.bear){const body=this.bear.userData.parts.body;if(body&&!['cut','design','sew'].includes(this.getState().work.stage)){body.scale.z=1-this.press*.23;body.scale.x=1+this.press*.05;}}this.controls.update();for(const object of this.scene.children)if(object.position.z<-3.5)object.visible=this.camera.position.z>-3;this.renderer.render(this.scene,this.camera);}
 stats(){const s=this.samples.slice(-120).sort((a,b)=>a-b),gl=this.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');return {fps:s.length?Math.round(1000/(s.reduce((a,b)=>a+b,0)/s.length)):0,medianFrameMs:+(s[Math.floor(s.length*.5)]||0).toFixed(2),p95FrameMs:+(s[Math.floor(s.length*.95)]||0).toFixed(2),drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,pixelRatio:this.renderer.getPixelRatio(),gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),bodyDepth:this.bear?.userData.parts.body.children[0].scale.z};}
 photo(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}

