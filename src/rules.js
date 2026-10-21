export const PARTS=[['body','身体'],['head','头部'],['earL','左耳'],['earR','右耳'],['armL','左臂'],['armR','右臂'],['legL','左腿'],['legR','右腿']];
export const FABRICS={cotton:{name:'细织棉布',price:2,color:'#d7ac80',roughness:.92},plush:{name:'短绒毛绒',price:4,color:'#e3c8a5',roughness:1},linen:{name:'亚麻格纹',price:3,color:'#879983',roughness:.96}};
export const COLORS=[['honey','蜂蜜','#c99a68'],['cream','奶油','#eddec4'],['sage','鼠尾草','#91a18c'],['rose','蔷薇','#c78e92'],['blue','雾蓝','#87a4b6'],['cocoa','可可','#8d6753']];
export const STAGES=['design','cut','sew','fill','close','decorate','inspect'];
export const STAGE_NAMES=['选择布料','裁剪纸样','对齐缝合','填充塑形','缝合封口','表情装饰','检查交付'];
export const ORDERS=[
 {id:'honey',name:'给小满的抱抱熊',customer:'林阿姨',story:'小满要去幼儿园了。想给她一个柔软、笑眯眯的小伙伴，放进午睡的小被窝。',reward:65,budget:28,min:.68,max:.95,color:'honey',eyes:'button',mouth:'smile',deco:'bow',requirements:['蜂蜜色身体；圆耳小熊','纽扣眼睛、微笑、一个蝴蝶结','填充 68–95%，材料不超过 28 线币']},
 {id:'garden',name:'窗台上的小园丁',customer:'阿禾',story:'新家的窗台种了第一盆薄荷。想要一只绿衣小熊陪着它，也陪我慢慢安顿下来。',reward:80,budget:36,min:.85,max:1.08,color:'sage',fabric:'linen',eyes:'sleepy',deco:'patch',requirements:['鼠尾草色亚麻格纹身体','弯弯的眯眼、一块布贴','填充 85–108%，材料不超过 36 线币']},
 {id:'repair',name:'陪我搬家的阿栗',customer:'周周',story:'阿栗陪我搬过三次家。右侧的线松了，肚子也瘪了。请保留它的蓝耳朵、纽扣眼和那块心形旧补丁。',reward:40,budget:6,min:.8,max:1.05,requirements:['找到右侧开线处，补充腹部填充','沿开线重新缝合；保留蓝耳和旧心形补丁','填充 80–105%，可保留可见修补线']}
];
const full=n=>Array(n).fill(1);
const uid=()=>globalThis.crypto?.randomUUID?.()||'p'+Date.now()+'-'+Math.random().toString(16).slice(2);
export function makeWork(orderId=null){
 return {id:uid(),name:'我的小熊',orderId,stage:'design',pattern:'round-bear-v1',parts:Object.fromEntries(PARTS.map(([id])=>[id,{fabric:'cotton',color:'honey',angle:0,offset:0,cut:Array(48).fill(0)}])),seams:Object.fromEntries(PARTS.map(([id])=>[id,{aligned:false,bits:Array(32).fill(0)}])),fill:.25,closed:Array(24).fill(0),earAngle:0,eyes:'button',mouth:'smile',faceX:0,faceY:0,decorations:[],cost:0,charged:false,delivered:false,repair:null};
}
export function initialState(){return {version:1,money:90,stock:{cotton:28,plush:12,linen:14},work:makeWork(),completed:[],collection:[],history:[],future:[],started:false,quality:'high',sound:true};}
export function progress(bits){return bits.reduce((a,b)=>a+b,0)/bits.length;}
export function allCut(w){return PARTS.every(([id])=>progress(w.parts[id].cut)===1);}
export function allSewn(w){return PARTS.every(([id])=>w.seams[id].aligned&&progress(w.seams[id].bits)===1);}
export function orderFor(w){return ORDERS.find(o=>o.id===w.orderId);}
export function costFor(w){return PARTS.reduce((n,[id])=>n+FABRICS[w.parts[id].fabric].price,0);}
export function checkWork(w){
 const issues=[];
 if(w.repair){
  if(progress(w.repair.bits)<1)issues.push('右侧开线还没有缝好');
  if(w.parts.earL.color!=='blue'||w.eyes!=='button'||!w.decorations.some(d=>d.type==='heart'&&d.original))issues.push('请保留阿栗的蓝耳、纽扣眼和旧心形补丁');
 }else{
  if(!allCut(w))issues.push('还有未裁完的成对裁片');
  if(!allSewn(w))issues.push('还有未连接的部件或接缝');
  if(progress(w.closed)<1)issues.push('填充口尚未封好');
 }
 if(w.fill<.55)issues.push('填充过少：身体还比较扁，可返回填充调整');
 if(w.fill>1.12)issues.push('填充过量：接缝张力偏高，可取出一点棉絮');
 if(w.decorations.some(d=>Math.abs(d.x)>.52||Math.abs(d.y)>.62||d.scale<.6||d.scale>1.4))issues.push('装饰超出有效附着区域');
 const o=orderFor(w);
 if(o){
  if(w.fill<o.min||w.fill>o.max)issues.push(`委托需要填充 ${Math.round(o.min*100)}–${Math.round(o.max*100)}%`);
  if(w.cost>o.budget)issues.push(`材料费用 ${w.cost} 超出预算 ${o.budget}`);
  if(o.color&&w.parts.body.color!==o.color)issues.push(`身体需要${COLORS.find(c=>c[0]===o.color)[1]}色`);
  if(o.fabric&&w.parts.body.fabric!==o.fabric)issues.push('身体需要亚麻格纹布料');
  if(o.eyes&&w.eyes!==o.eyes)issues.push(o.eyes==='sleepy'?'需要弯弯的眯眼':'需要纽扣眼睛');
  if(o.mouth&&w.mouth!==o.mouth)issues.push('需要微笑嘴部');
  if(o.deco&&!w.decorations.some(d=>d.type===o.deco))issues.push(o.deco==='bow'?'还缺一个蝴蝶结':'还缺一块布贴');
 }
 return issues;
}
export function checkpoint(s){s.history.push(structuredClone(s.work));if(s.history.length>30)s.history.shift();s.future=[];}
export function undo(s){if(!s.history.length||s.work.delivered)return false;s.future.push(structuredClone(s.work));s.work=s.history.pop();return true;}
export function redo(s){if(!s.future.length||s.work.delivered)return false;s.history.push(structuredClone(s.work));s.work=s.future.pop();return true;}
export function reserveMaterials(s){
 const w=s.work;if(w.charged)return;
 const need={cotton:0,plush:0,linen:0};for(const [id] of PARTS)need[w.parts[id].fabric]++;
 const cost=costFor(w);
 if(s.money<cost)throw Error('线币不足。补给箱里有免费的基础棉布与练习金。');
 for(const id in need)if(s.stock[id]<need[id])throw Error(FABRICS[id].name+'库存不足，请先补购材料');
 for(const id in need)s.stock[id]-=need[id];s.money-=cost;w.cost=cost;w.charged=true;s.history=[];s.future=[];
}
export function advance(s){
 const w=s.work;
 if(w.stage==='design'){reserveMaterials(s);w.stage='cut';return;}
 if(w.stage==='cut'&&!allCut(w))throw Error('请沿轮廓裁完全部 8 组成对裁片');
 if(w.stage==='sew'&&!allSewn(w))throw Error('请对齐并缝完每个部件，留下身体填充口');
 if(w.stage==='fill'&&(w.fill<.4||w.fill>1.3))throw Error('先调整填充量');
 if(w.stage==='close'&&progress(w.closed)<1)throw Error('请用针线沿填充口完成封口');
 if(w.stage==='inspect')return;
 checkpoint(s);w.stage=STAGES[STAGES.indexOf(w.stage)+1];
}
export function buy(s,fabric){if(!FABRICS[fabric])throw Error('未知材料');const price=FABRICS[fabric].price*4;if(s.money<price)throw Error('余额不足');s.money-=price;s.stock[fabric]+=4;}
export function newProject(s,orderId=null){
 if(orderId&&!ORDERS.some(o=>o.id===orderId))throw Error('未知委托');
 if(s.completed.includes(orderId))throw Error('这份委托已交付');
 if(orderId==='repair'){
  if(!s.collection.length&&!s.completed.some(id=>id!=='repair'))throw Error('先完成并收藏或交付一件制作作品，再接修复委托');
  const w=makeWork(orderId);w.name='阿栗';w.stage='repair';w.charged=true;w.fill=.43;w.parts.body.color='cocoa';w.parts.earL.color='blue';w.parts.earR.color='cream';
  for(const [id] of PARTS){w.parts[id].cut=full(48);w.seams[id]={aligned:true,bits:full(32)};}w.closed=full(24);
  w.decorations=[{id:uid(),type:'heart',x:-.25,y:.18,rotation:-.15,scale:.8,original:true}];w.repair={bits:Array(24).fill(0),found:false,visible:true,before:null};
  const before=structuredClone(w);before.repair.before=null;w.repair.before=before;s.work=w;
 }else s.work=makeWork(orderId);
 s.history=[];s.future=[];
}
export function deliver(s){
 const w=s.work;if(w.delivered)throw Error('作品已经交付，不会重复收款');
 if(w.stage!=='inspect'&&w.stage!=='repair')throw Error('请先完成制作并检查');
 const issues=checkWork(w);if(issues.length)throw Error(issues.join('；'));
 const o=orderFor(w);if(!o)throw Error('自由作品可以收藏；接委托后再交付');
 if(s.completed.includes(o.id))throw Error('委托已经结算');
 s.money+=o.reward;s.completed.push(o.id);w.delivered=true;s.history=[];s.future=[];
 if(!s.collection.some(c=>c.id===w.id))s.collection.push(structuredClone(w));
}
export function collect(s){const w=s.work;if(w.stage!=='inspect'&&w.stage!=='repair')throw Error('请先完成作品检查');const issues=checkWork(w);if(issues.length)throw Error(issues.join('；'));const old=s.collection.findIndex(c=>c.id===w.id);if(old>=0)s.collection[old]=structuredClone(w);else s.collection.push(structuredClone(w));}
export function addDecoration(s,type){if(!['bow','patch','heart','flower'].includes(type))return;checkpoint(s);s.work.decorations.push({id:uid(),type,x:0,y:type==='bow'?.57:0,rotation:0,scale:1});}
export function rework(s,stage){const w=s.work;if(w.delivered)throw Error('已交付作品可从收藏载入副本');if(!['fill','decorate','design'].includes(stage))return;checkpoint(s);if(stage==='fill'){w.closed=Array(24).fill(0);w.stage='fill';}else if(stage==='design'){if(w.charged)throw Error('已裁剪的材料不能退回；配色通过新作品选择');w.stage='design';}else w.stage='decorate';}
export function validateSave(input){
 const s=structuredClone(input);
 if(!s||s.version!==1||!Number.isFinite(s.money)||s.money<0||s.money>1e8||!s.stock||!s.work||!Array.isArray(s.collection)||s.collection.length>100||!Array.isArray(s.completed)||s.completed.some(id=>!ORDERS.some(o=>o.id===id))||new Set(s.completed).size!==s.completed.length)throw Error('存档格式不正确');
 for(const id in FABRICS)if(!Number.isInteger(s.stock[id])||s.stock[id]<0||s.stock[id]>1e6)throw Error('库存数据不正确');
 function work(w,nested=false){
  if(!w||typeof w.id!=='string'||typeof w.name!=='string'||w.name.length>80||w.pattern!=='round-bear-v1'||!['repair',...STAGES].includes(w.stage)||!Number.isFinite(w.fill)||w.fill<.25||w.fill>1.3||!Number.isFinite(w.cost)||w.cost<0||typeof w.charged!=='boolean'||typeof w.delivered!=='boolean'||(w.orderId!==null&&!ORDERS.some(o=>o.id===w.orderId)))throw Error('作品数据不正确');
  const bits=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(b=>b===0||b===1);
  for(const [id] of PARTS){const p=w.parts?.[id],seam=w.seams?.[id];if(!p||!FABRICS[p.fabric]||!COLORS.some(c=>c[0]===p.color)||!Number.isFinite(p.angle)||Math.abs(p.angle)>Math.PI*2||!Number.isFinite(p.offset)||p.offset<0||p.offset>1||!bits(p.cut,48)||!seam||typeof seam.aligned!=='boolean'||!bits(seam.bits,32))throw Error('裁片或接缝数据不正确');}
  if(!bits(w.closed,24)||!['button','sleepy','glass'].includes(w.eyes)||!['smile','tiny','wonder'].includes(w.mouth)||!Number.isFinite(w.faceX)||Math.abs(w.faceX)>.18||!Number.isFinite(w.faceY)||Math.abs(w.faceY)>.2||!Number.isFinite(w.earAngle)||Math.abs(w.earAngle)>.5||!Array.isArray(w.decorations)||w.decorations.length>20)throw Error('外观数据不正确');
  for(const d of w.decorations)if(typeof d.id!=='string'||!['bow','patch','heart','flower'].includes(d.type)||!Number.isFinite(d.x)||Math.abs(d.x)>.52||!Number.isFinite(d.y)||Math.abs(d.y)>.62||!Number.isFinite(d.scale)||d.scale<.6||d.scale>1.4||!Number.isFinite(d.rotation)||Math.abs(d.rotation)>Math.PI*4)throw Error('装饰数据不正确');
  if(w.stage==='repair'&&!w.repair)throw Error('缺少修复数据');
  if(w.repair){if(!bits(w.repair.bits,24)||typeof w.repair.found!=='boolean'||typeof w.repair.visible!=='boolean'||(!nested&&!w.repair.before))throw Error('修复数据不正确');if(w.repair.before&&!nested)work(w.repair.before,true);}
 }
 work(s.work);s.collection.forEach(w=>work(w));for(const key of ['history','future']){if(!Array.isArray(s[key])||s[key].length>30)throw Error('撤销记录不正确');s[key].forEach(w=>work(w));}return s;
}
