import {PARTS,COLORS,progress} from './rules.js';
const W=480,H=300;
export function craftPath(mode,id){
 const count=mode==='cut'?48:mode==='sew'?32:24,points=[];
 if(mode==='close'||mode==='repair'){for(let i=0;i<count;i++)points.push({x:105+i*270/(count-1),y:148+Math.sin(i*.55)*11});}
 else{const limb=id.startsWith('arm')||id.startsWith('leg'),ear=id.startsWith('ear'),rx=ear?73:limb?64:id==='head'?104:100,ry=ear?70:limb?99:id==='head'?84:110;for(let i=0;i<count;i++){const a=i/count*Math.PI*2-Math.PI/2;points.push({x:240+Math.cos(a)*rx*(id==='body'?1+.06*Math.sin(a*3):1),y:153+Math.sin(a)*ry});}}
 return points;
}
export class CraftPad{
 constructor(canvas,getState,onBegin,onProgress,onAligned,onEnd){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.getState=getState;this.onBegin=onBegin;this.onProgress=onProgress;this.onAligned=onAligned;this.onEnd=onEnd;canvas.width=W*2;canvas.height=H*2;this.ctx.scale(2,2);this.active=null;this.cursor=null;this.grip={x:105,y:142};
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const c=this.config();if(!c)return;const p=this.point(e);if(c.mode==='sew'&&!c.aligned){if(Math.hypot(p.x-this.grip.x,p.y-this.grip.y)>34)return;this.active='align';}else{this.active='trace';this.onBegin();}this.last=p;this.cursor=p;canvas.setPointerCapture(e.pointerId);this.move(e);});canvas.addEventListener('pointermove',e=>this.move(e));
  const end=()=>{if(this.active)this.onEnd();this.active=null;this.last=null;this.cursor=null;this.draw();};for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);window.addEventListener('blur',end);this.visibility=()=>{if(document.hidden)end();};document.addEventListener('visibilitychange',this.visibility);this.end=end;
 }
 point(e){const b=this.canvas.getBoundingClientRect();return {x:(e.clientX-b.x)/b.width*W,y:(e.clientY-b.y)/b.height*H};}
 destroy(){this.end();window.removeEventListener('blur',this.end);document.removeEventListener('visibilitychange',this.visibility);}
 config(){const w=this.getState().work;if(w.stage==='cut')return {mode:'cut',id:this.part||'body',bits:w.parts[this.part||'body'].cut};if(w.stage==='sew')return {mode:'sew',id:this.part||'body',bits:w.seams[this.part||'body'].bits,aligned:w.seams[this.part||'body'].aligned};if(w.stage==='close')return {mode:'close',id:'body',bits:w.closed,aligned:true};if(w.stage==='repair'&&w.repair.found)return {mode:'repair',id:'body',bits:w.repair.bits,aligned:true};return null;}
 setPart(id){this.end();this.part=id;this.grip={x:105,y:142};this.draw();}
 move(e){const p=this.point(e);this.cursor=p;if(!this.active){this.draw();return;}const c=this.config();if(!c){this.end();return;}
  if(this.active==='align'){this.grip=p;if(Math.hypot(p.x-240,p.y-142)<19){this.onBegin();this.onAligned(c.id);this.active=null;this.onEnd();}this.draw();return;}
  const pts=craftPath(c.mode,c.id),last=this.last||p,distance=Math.hypot(p.x-last.x,p.y-last.y);const changed=[];
  // shortcut: a large pointer jump never cuts the unseen path; upgrade only for pressure-sensitive stylus support.
  const samples=distance>55?[p]:Array.from({length:Math.max(1,Math.ceil(distance/5))},(_,i)=>({x:last.x+(p.x-last.x)*(i+1)/Math.max(1,Math.ceil(distance/5)),y:last.y+(p.y-last.y)*(i+1)/Math.max(1,Math.ceil(distance/5))}));
  for(const sample of samples){let best=-1,dist=Infinity;pts.forEach((q,i)=>{const d=Math.hypot(q.x-sample.x,q.y-sample.y);if(d<dist){dist=d;best=i;}});if(dist<18&&best>=0&&!c.bits[best])changed.push(best);}
  if(changed.length)this.onProgress(c.mode,c.id,[...new Set(changed)]);this.last=p;this.draw();
 }
 draw(){const x=this.ctx,c=this.config();x.clearRect(0,0,W,H);if(!c)return;const w=this.getState().work,p=w.parts[c.id],color=COLORS.find(a=>a[0]===p.color)[2];x.fillStyle='#f0e5d2';x.fillRect(0,0,W,H);for(let i=0;i<W;i+=24){x.strokeStyle='rgba(102,88,65,.1)';x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke();}for(let i=0;i<H;i+=24){x.beginPath();x.moveTo(0,i);x.lineTo(W,i);x.stroke();}
  const pts=craftPath(c.mode,c.id);if(c.mode==='cut'||c.mode==='sew'){
   x.fillStyle=color;x.fillRect(82,27,316,248);x.save();x.translate(240,150);x.rotate(p.angle);x.translate(-240,-150);x.strokeStyle=p.fabric==='linen'?'rgba(46,60,35,.24)':'rgba(255,255,255,.17)';x.lineWidth=p.fabric==='linen'?7:1;for(let i=-200;i<650;i+=p.fabric==='linen'?29:5){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.moveTo(0,i);x.lineTo(W,i);x.stroke();}x.restore();
   if(c.mode==='cut'){x.beginPath();pts.forEach((q,i)=>i?x.lineTo(q.x,q.y):x.moveTo(q.x,q.y));x.closePath();x.fillStyle='rgba(255,251,235,.85)';x.fill();x.strokeStyle='#a6997d';x.lineWidth=1;x.stroke();x.textAlign='center';x.fillStyle='#88785e';x.font='14px "Microsoft YaHei"';x.fillText(PARTS.find(a=>a[0]===c.id)[1]+' · 正反成对',240,142);x.font='11px sans-serif';x.fillText('↑ 布纹方向 · 外侧一致',240,162);x.setLineDash([4,5]);x.strokeStyle='#c4b498';x.beginPath();x.moveTo(240,100);x.lineTo(240,205);x.stroke();x.setLineDash([]);}
   if(c.mode==='sew'&&!c.aligned){x.fillStyle='rgba(246,238,220,.8)';x.beginPath();x.ellipse(this.grip.x,152,70,100,0,0,Math.PI*2);x.fill();x.setLineDash([6,5]);x.strokeStyle='#526a51';x.beginPath();x.arc(240,142,24,0,Math.PI*2);x.stroke();x.setLineDash([]);x.fillStyle='#526a51';x.beginPath();x.arc(this.grip.x,this.grip.y,23,0,Math.PI*2);x.fill();x.fillStyle='#fff';x.textAlign='center';x.font='14px sans-serif';x.fillText('拖动',this.grip.x,this.grip.y+5);x.fillStyle='#5c6650';x.font='12px sans-serif';x.fillText('将绿色夹点拖进虚线环，两片对齐',240,287);return;}
  }else{x.fillStyle=color;x.beginPath();x.roundRect(62,88,355,120,24);x.fill();x.fillStyle='#554033';x.fillRect(93,132,290,34);for(let i=0;i<15;i++){x.fillStyle='#eae2d3';x.beginPath();x.ellipse(104+i*18,145,12,8,0,0,Math.PI*2);x.fill();}}
  x.lineCap='round';for(let i=0;i<pts.length;i++){const q=pts[i],next=pts[(i+1)%pts.length];if((c.mode==='close'||c.mode==='repair')&&i===pts.length-1)continue;x.strokeStyle=c.bits[i]?'#55724f':'#b98256';x.lineWidth=c.bits[i]?5:2;x.setLineDash(c.bits[i]?[]:[3,5]);x.beginPath();x.moveTo(q.x,q.y);x.lineTo(next.x,next.y);x.stroke();x.setLineDash([]);}
  for(let i=0;i<pts.length;i+=4){x.fillStyle=c.bits[i]?'#edf2d9':'#754d34';x.beginPath();x.arc(pts[i].x,pts[i].y,c.bits[i]?2:2.5,0,Math.PI*2);x.fill();}
  const first=pts.findIndex((q,i)=>!c.bits[i]);if(first>=0){const q=pts[first];x.strokeStyle='#f4d074';x.lineWidth=3;x.beginPath();x.arc(q.x,q.y,10,0,Math.PI*2);x.stroke();}
  if(this.cursor){x.save();x.translate(this.cursor.x,this.cursor.y);x.rotate(-.45);x.strokeStyle='#455745';x.lineWidth=3;x.beginPath();if(c.mode==='cut'){x.moveTo(-7,-14);x.lineTo(7,13);x.moveTo(7,-14);x.lineTo(-7,13);x.stroke();for(const a of [-1,1]){x.beginPath();x.arc(a*7,-18,5,0,Math.PI*2);x.stroke();}}else{x.moveTo(0,-17);x.lineTo(0,15);x.stroke();x.strokeStyle='#bc8c70';x.lineWidth=1;x.beginPath();x.moveTo(0,-15);x.bezierCurveTo(20,-30,25,10,35,-3);x.stroke();}x.restore();}
  x.textAlign='left';x.fillStyle='#5c6650';x.font='12px "Microsoft YaHei"';x.fillText(c.mode==='cut'?'沿轮廓拖动剪刀 · 可分段操作':c.mode==='sew'?'沿接缝拖动针线 · 身体预留背部填充口':'沿开口往返穿针 · 可分段继续',16,287);x.textAlign='right';x.fillText(Math.round(progress(c.bits)*100)+'%',464,24);
 }
}
