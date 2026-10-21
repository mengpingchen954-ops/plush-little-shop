import './style.css';
import {WorkshopScene} from './scene.js';
import {CraftPad} from './craft.js';
import {initialState,validateSave,STAGES,STAGE_NAMES,PARTS,FABRICS,COLORS,ORDERS,progress,allCut,allSewn,advance,undo,redo,buy,newProject,deliver,collect,addDecoration,rework,checkWork,checkpoint,costFor,orderFor} from './rules.js';

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const escape=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='plush-little-shop-save';
let state=initialState(),saveWarning='',scene,craft,part='body',selected=null,tool='view',modalOpen=false,toastTimer,gesture=false;
try{const raw=localStorage.getItem(KEY);if(raw)state=validateSave(JSON.parse(raw));}catch(e){saveWarning='原存档无法读取：'+e.message+'。已保留原数据，请导入备份。';}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4600);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));saveWarning='';$('#save-state').textContent='已自动保存';return true;}catch(e){saveWarning='保存失败，请导出备份：'+e.message;$('#save-state').textContent=saveWarning;toast(saveWarning);return false;}}
function mutate(fn,history=true){try{if(state.work.delivered&&history)throw Error('作品已交付，请从收藏柜载入副本');if(history)checkpoint(state);fn();save();render();}catch(e){toast(e.message);}}
function finishGesture(){if(gesture){gesture=false;save();scene.sync();updateProgress();if(state.work.stage==='repair')queueMicrotask(()=>render());}}
function beginGesture(){if(!gesture){checkpoint(state);gesture=true;}}
function fullRender(){craft?.end();craft=null;gesture=false;render();}
function stageIndex(){return STAGES.indexOf(state.work.stage);}
const pct=b=>Math.round(progress(b)*100);
const icons={design:'✿',cut:'✂',sew:'⌁',fill:'☁',close:'⌁',decorate:'✦',inspect:'✓',repair:'♡'};
const names={bow:'蝴蝶结',patch:'布贴',heart:'心形补丁',flower:'小花'};
const title=()=>state.work.stage==='repair'?'旧物修复':STAGE_NAMES[stageIndex()];
const action=(id,text,cls='secondary',disabled=false)=>`<button class="${cls}" data-action="${id}" ${disabled?'disabled':''}>${text}</button>`;
function download(href,name){const a=document.createElement('a');a.href=href;a.download=name;a.click();}
function exportSave(){download('data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(state,null,2)),'plush-little-shop.save.json');toast('完整备份已下载；包含作品、库存、余额和撤销记录');}
function modal(body){modalOpen=true;scene.setTool('none');craft?.end();$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal"><button class="modal-x" data-action="close-modal" aria-label="关闭">×</button>${body}</section></div>`;$('#modal-root button')?.focus();}
function closeModal(){modalOpen=false;$('#modal-root').innerHTML='';scene.setTool(tool);}
function requirements(o){return `<div class="order-note"><b>${o.name}</b><p>${o.story}</p><small>报酬 ${o.reward} · 预算 ${o.budget} 线币</small><ul>${o.requirements.map(t=>`<li>${t}</li>`).join('')}</ul></div>`;}
function objective(w){return {design:'挑选布料与配色，预览你的圆耳小熊',cut:'在右侧按住剪刀，沿每组纸样轮廓拖动',sew:'先拖动绿色夹点对齐，再沿轮廓穿针',fill:'分次加入棉絮，观察体积与手感变化',close:'沿背部填充口往返穿针，完成最后一道接缝',decorate:'选择表情与装饰，用微调工具安排位置',inspect:checkWork(w).length?'检查发现需要修改的地方；作品可以返工':'小熊完成了！拍照、收藏或交付给顾客',repair:w.repair?.found?'补充腹部填充，并沿右侧开线处重新缝合':'使用检查工具，点击阿栗右侧的金色损坏环'}[w.stage];}
function render(){
 const w=state.work;$('#money').textContent=state.money;$('#stage-title').textContent=title();$('#stage-desc').textContent=orderFor(w)?.name||'每一针，都让它更像你的作品';$('#objective').textContent=objective(w);$('#hint').textContent=tool==='view'?'观察模式 · 拖动旋转，滚轮缩放':tool==='press'?'轻按模式 · 点击布偶观察柔软回弹':tool==='repair'?'检查模式 · 点击金色环定位开线处':'装饰模式 · 点击已有装饰选择';
 $('#stage-steps').innerHTML=STAGES.map((s,i)=>`<div class="stage-step ${w.stage===s?'active':''} ${i<stageIndex()?'done':''}"><span>${i<stageIndex()?'✓':icons[s]}</span><div><b>${STAGE_NAMES[i]}</b><small>${i===0?'ROUND BEAR · V1':i===1?`${PARTS.filter(([id])=>progress(w.parts[id].cut)===1).length}/8 组裁片`:i===2?`${PARTS.filter(([id])=>progress(w.seams[id].bits)===1).length}/8 处接缝`:i===3?Math.round(w.fill*100)+'% 饱满度':i===4?pct(w.closed)+'% 封口':i===5?w.decorations.length+' 件装饰':'真实作品检查'}</small></div></div>`).join('');
 $('#order-list').innerHTML=ORDERS.map(o=>`<button class="order-card ${o.id===w.orderId?'selected':''} ${state.completed.includes(o.id)?'done':''}" data-order="${o.id}" ${state.completed.includes(o.id)?'disabled':''}><span class="order-icon">${icons[o.id==='repair'?'repair':'decorate']}</span><span><b>${o.name}</b><small>${state.completed.includes(o.id)?'已交付':'报酬 '+o.reward+' · 预算 '+o.budget}</small></span></button>`).join('');
 $('#work-label').textContent=w.delivered?'已交付的 '+w.name:w.name;$('#save-state').textContent=saveWarning||'本地存档 · 自动保存';$('#undo').disabled=!state.history.length||w.delivered;$('#redo').disabled=!state.future.length||w.delivered;
 const detailOpen=$('.part-details')?.open,scroll=$('.right-panel').scrollTop;craft?.destroy();craft=null;$('#panel').innerHTML=panel(w);if(detailOpen&&$('.part-details'))$('.part-details').open=true;$('.right-panel').scrollTop=scroll;scene.sync();mountPad();if(!modalOpen)scene.setTool(tool);
}
function panelHead(kicker,t,p){return `<div class="panel-head"><span class="eyebrow">${kicker}</span><h2>${t}</h2><p>${p}</p></div>`;}
function colorOptions(current){return COLORS.map(([id,n])=>`<option value="${id}" ${id===current?'selected':''}>${n}</option>`).join('');}
function fabricOptions(current){return Object.entries(FABRICS).map(([id,f])=>`<option value="${id}" ${id===current?'selected':''}>${f.name}</option>`).join('');}
function selectField(label,key,options){return `<label class="select-field">${label}<select data-field="${key}">${options}</select></label>`;}
function slider(label,key,value,min,max,step=.01){return `<label class="slider-field"><span>${label}</span><input aria-label="${label}" type="range" data-field="${key}" value="${value}" min="${min}" max="${max}" step="${step}"></label>`;}
function panel(w){
 if(w.delivered)return panelHead('THANK YOU · DELIVERED','送到顾客手中了','报酬已到账。作品已存入收藏柜，下一只小熊会是什么颜色？')+requirements(orderFor(w))+action('photo','▣ 下载这件作品的照片','secondary wide')+action('collection','打开收藏柜','secondary wide')+action('free','开始新的自由作品','primary wide');
 if(w.stage==='design'){
  return panelHead('PATTERN · ROUND BEAR V1','先选触感和配色','同一套圆耳纸样，身体、头部和成对四肢可以分别安排材料。预览中的布纹会继承到实际成品。')+(orderFor(w)?requirements(orderFor(w)):'<div class="order-note"><b>自由制作</b><p>不限定风格。可以用棉布、短绒或格纹，做一只自己的小熊。</p></div>')+
  `<div class="field"><label>整只小熊配色</label><div class="choice-grid">${COLORS.map(([id,n,c])=>`<button class="color-chip ${id===w.parts.body.color?'selected':''}" data-color="${id}" style="--chip:${c}"><i></i>${n}</button>`).join('')}</div></div><div class="field"><label>整只小熊的布料</label><div class="fabric-grid">${Object.entries(FABRICS).map(([id,f])=>`<button class="fabric-card ${w.parts.body.fabric===id?'selected':''}" data-fabric="${id}"><span class="fabric-preview ${id}" style="--fabric:${f.color}"></span><b>${f.name}</b><small>${f.price} 线币/片 · 库存 ${state.stock[id]}</small></button>`).join('')}</div></div>
  <details class="part-details"><summary>逐个部件安排布料与花纹</summary>${PARTS.map(([id,n])=>`<div class="part-design"><b>${n}</b><select aria-label="${n}配色" data-part="${id}" data-key="color">${colorOptions(w.parts[id].color)}</select><select aria-label="${n}布料" data-part="${id}" data-key="fabric">${fabricOptions(w.parts[id].fabric)}</select>${slider(n+'布纹方向',id+'.angle',w.parts[id].angle,0,Math.PI*2,.1)}${slider(n+'花纹位置',id+'.offset',w.parts[id].offset,0,1,.05)}</div>`).join('')}</details>
  <div class="cost-note">预计材料成本 <b>${costFor(w)} 线币</b> · 8 组裁片</div>${action('advance','领取材料，开始裁剪','primary wide')}${action('supplies','材料补给与库存','secondary wide')}`;
 }
 if(['cut','sew','close'].includes(w.stage)){
  const mode=w.stage,bits=mode==='cut'?w.parts[part].cut:mode==='sew'?w.seams[part].bits:w.closed,done=mode==='cut'?allCut(w):mode==='sew'?allSewn(w):progress(w.closed)===1;
  return panelHead('HANDWORK · '+mode.toUpperCase(),mode==='cut'?'沿纸样裁出部件':mode==='sew'?'两片对齐，一针一线':'缝上最后的填充口',mode==='cut'?'按住并拖动剪刀。轮廓点会吸附，裁好的正反成对部件留在桌上。':mode==='sew'?'先把绿色夹点拖入圆环，再沿接缝穿针。缝完的部件才形成对应立体结构。':'沿背部开口线来回拖动针线。进度对应实际经过的位置。')+
  (mode==='close'?'':`<div class="part-tabs">${PARTS.map(([id,n])=>`<button class="part-tab ${part===id?'active':''}" data-part-tab="${id}">${n}<small>${mode==='cut'?pct(w.parts[id].cut):pct(w.seams[id].bits)}%</small></button>`).join('')}</div>`)+
  '<div class="craft-wrap"><canvas id="craft-canvas" aria-label="沿线裁剪或缝合操作区"></canvas></div>'+progressBar(bits)+`<div class="craft-note">${mode==='sew'?'身体会预留背部填充口；右侧纸样展示同组正反连接边。':'从金色圆环附近开始，可以分段完成。释放鼠标、失焦或切换部件都会可靠结束操作。'}</div>`+action('advance','完成本阶段，继续','primary wide',!done);
 }
 if(w.stage==='fill')return panelHead('SOFTNESS · FIND THE RIGHT SHAPE','一点一点填出形状','每团棉絮会增加小熊身体的宽度与深度。可以加，也可以取出。')+fillControls(w)+action('advance','形状满意，开始封口','primary wide')+action('press','轻按布偶看看回弹','secondary wide');
 if(w.stage==='decorate'){
  const d=w.decorations.find(d=>d.id===selected);
  return panelHead('PERSONAL TOUCH · FINISH','给它一个自己的表情','添加装饰后可以移动、旋转、缩放和删除。表情和布贴贴合曲面，随填充形状一起调整。')+
  `<div class="field"><label>眼睛</label><div class="segmented">${[['button','纽扣'],['sleepy','眯眼'],['glass','玻璃珠']].map(([id,n])=>`<button class="${w.eyes===id?'selected':''}" data-eyes="${id}">${n}</button>`).join('')}</div></div><div class="field"><label>嘴部</label><div class="segmented">${[['smile','微笑'],['tiny','小嘴'],['wonder','惊喜']].map(([id,n])=>`<button class="${w.mouth===id?'selected':''}" data-mouth="${id}">${n}</button>`).join('')}</div></div>`+
  slider('耳朵张开角度','earAngle',w.earAngle,-.5,.5)+slider('表情横向位置','faceX',w.faceX,-.18,.18)+slider('表情纵向位置','faceY',w.faceY,-.2,.2)+
  `<div class="field"><label>添加装饰</label><div class="deco-grid">${Object.entries(names).map(([id,n])=>`<button data-deco="${id}"><b>${id==='bow'?'⋈':id==='heart'?'♡':id==='flower'?'✿':'▧'}</b><span>${n}</span></button>`).join('')}</div></div><div class="decor-list">${w.decorations.map(d=>`<button class="${selected===d.id?'selected':''}" data-select-deco="${d.id}">${names[d.type]}</button>`).join('')||'<span>添加一件装饰，让它成为你的作品。</span>'}</div>`+
  (d?`<div class="deco-adjust"><b>${names[d.type]} · 位置微调</b>${slider('横向移动','deco.x',d.x,-.52,.52)}${slider('纵向移动','deco.y',d.y,-.62,.62)}${slider('旋转','deco.rotation',d.rotation,-3.14,3.14,.05)}${slider('缩放','deco.scale',d.scale,.6,1.4,.05)}${action('remove-deco','删除此装饰','secondary wide')}</div>`:'')+action('advance','完成装饰，检查作品','primary wide');
 }
 if(w.stage==='repair'){
  const r=w.repair;
  return panelHead('OLD FRIEND · REPAIR','阿栗需要几针新线','保留蓝耳朵、纽扣眼和心形旧补丁，只修右侧开线与腹部填充。')+requirements(orderFor(w))+action('find-damage',r.found?'已定位：右侧腹部接缝':'使用检查工具，找到金色损坏环','secondary wide')+
  (r.found?fillControls(w)+'<div class="craft-wrap"><canvas id="craft-canvas" aria-label="修复右侧接缝"></canvas></div>'+progressBar(r.bits)+`<label class="checkbox-field"><input type="checkbox" data-field="repair.visible" ${r.visible?'checked':''}> 保留可见修补线</label>`:'')+action('compare','并排查看修复前后','secondary wide')+issuesList(checkWork(w))+action('deliver','检查完成，交付阿栗 · 40 线币','primary wide',checkWork(w).length>0);
 }
 const issues=checkWork(w);
 return panelHead('QUALITY CHECK · '+(issues.length?'REVISION':'READY'),issues.length?'再修一针，就更好了':'小熊做完了','检查依据部件连接、封口、填充、配色与装饰状态。轻按和旋转可继续观察。')+issuesList(issues)+(!issues.length?`<div class="checklist"><div>✓ 8 组成对裁片已连接</div><div>✓ 背部填充口已缝合</div><div>✓ ${Math.round(w.fill*100)}% 填充，装饰附着有效</div>${orderFor(w)?'<div>✓ 所有委托条件满足</div>':''}</div>`:'')+
 `<div class="rework-buttons">${action('rework-fill','拆开填充口，调整')}${action('rework-deco','调整表情与装饰')}</div>`+action('press','轻按布偶，观察回弹','secondary wide')+action('photo','▣ 下载实际作品照片','secondary wide')+action('collect','放进收藏柜','secondary wide',!!issues.length)+(orderFor(w)?action('deliver','交付并收款 · '+orderFor(w).reward+' 线币','primary wide',!!issues.length):action('free','再做另一种风格','primary wide'));
}
function progressBar(bits){return `<div class="progress-line"><span>实际操作进度</span><b id="trace-pct">${pct(bits)}%</b><div><i id="trace-fill" style="width:${pct(bits)}%"></i></div></div>`;}
function issuesList(issues){return issues.length?`<div class="issues">${issues.map(t=>`<div>! <span>${t}</span></div>`).join('')}</div>`:'';}
function fillControls(w){return `<div class="fill-meter"><div class="fill-ring" style="--fill:${Math.min(100,w.fill/1.3*100)}%"><b>${Math.round(w.fill*100)}%</b><small>饱满度</small></div><div><b>${w.fill<.6?'柔软偏扁':w.fill>1.12?'接缝张力偏高':'蓬松饱满'}</b><span>${w.fill>1.12?'取出一点棉絮即可恢复':'可分次加入，也可以重新调整'}</span></div></div><div class="fill-controls">${action('fill-minus','− 取出一团')}${action('fill-plus','＋ 加入一团','primary')}</div><div class="fill-track"><i style="width:${w.fill/1.3*100}%"></i></div><div class="fill-guide"><span>扁</span><span>柔软</span><span>饱满</span><span>张力</span></div>`;}
function mountPad(){const canvas=$('#craft-canvas');if(!canvas)return;craft=new CraftPad(canvas,()=>state,beginGesture,(mode,id,bits)=>{
 const w=state.work;const target=mode==='cut'?w.parts[id].cut:mode==='sew'?w.seams[id].bits:mode==='close'?w.closed:w.repair.bits;
 bits.forEach(i=>target[i]=1);updateProgress();
 },id=>{state.work.seams[id].aligned=true;updateProgress();},finishGesture);craft.setPart(part);}
function updateProgress(){$('#undo').disabled=!state.history.length||state.work.delivered;$('#redo').disabled=!state.future.length||state.work.delivered;const w=state.work,c=craft?.config();if(!c)return;$('#trace-pct').textContent=pct(c.bits)+'%';$('#trace-fill').style.width=pct(c.bits)+'%';$$('[data-part-tab]').forEach(b=>b.querySelector('small').textContent=pct(w.stage==='cut'?w.parts[b.dataset.partTab].cut:w.seams[b.dataset.partTab].bits)+'%');const done=w.stage==='cut'?allCut(w):w.stage==='sew'?allSewn(w):w.stage==='repair'?checkWork(w).length===0:progress(w.closed)===1;const next=$('#panel [data-action="advance"]')||$('#panel [data-action="deliver"]');if(next)next.disabled=!done;}
function worldEvent(type,data){
 if(type==='contextlost'){toast('3D 画布暂时失去上下文；作品数据已保留，恢复后继续。');return;}
 if(type==='contextrestored'){scene.sync(true);toast('工作台已恢复');return;}
 if(type==='damage'&&state.work.stage==='repair'&&!state.work.repair.found){mutate(()=>state.work.repair.found=true);toast('找到右侧开线处。现在补充腹部填充，再用针线修好。');}
 if(type==='missDamage')toast('请点金色环；它位于小熊右侧腹部。可切换侧面或近景。');
 if(type==='selectDecoration'){selected=data;render();}
}
function requestNew(id){
 const go=()=>{try{newProject(state,id);part='body';selected=null;tool=id==='repair'?'repair':'view';scene.compare=false;closeModal();save();render();scene.view(id==='repair'?'side':'room');}catch(e){toast(e.message);}};
 if(state.work.charged&&!state.work.delivered){modal(panelHead('NEW WORK','将当前作品另存到工作架？','保留当前进度再开新作品。已裁剪材料不会退回。')+action('park-start','另存当前作品并开始','primary wide')+action('close-modal','取消','secondary wide'));pendingNew=go;}else go();
}
let pendingNew=null;
function collectionModal(){modal(panelHead('MY COLLECTION','作品与工作架','载入未完成作品继续制作；已完成作品载入为可修改副本。')+`<div class="collection-list">${state.collection.map((w,i)=>`<button data-load="${i}"><i style="background:${COLORS.find(c=>c[0]===w.parts.body.color)[2]}">♡</i><span><b>${escape(w.name)}</b><small>${w.stage==='inspect'?'完成作品':w.stage==='repair'?'修复':'制作中的 '+STAGE_NAMES[STAGES.indexOf(w.stage)]} · ${Math.round(w.fill*100)}% 填充</small></span></button>`).join('')||'<p>收藏柜还是空的。完成作品后收藏，或用「另存」保留当前进度。</p>'}</div>`+action('park','另存当前作品到工作架','secondary wide'));}
function suppliesModal(){modal(panelHead('MATERIALS','补给与库存','4 片为一组。基础补给箱确保练习时始终可以继续。')+`<div class="supplies">${Object.entries(FABRICS).map(([id,f])=>`<div><b>${f.name}</b><span>库存 ${state.stock[id]} 片</span><button data-buy="${id}">购买 4 片 · ${f.price*4} 线币</button></div>`).join('')}</div>`+action('basic-kit','领取基础补给：8 片棉布 + 16 线币','secondary wide',state.money>=24&&state.stock.cotton>=8));}
function settings(){modal(panelHead('SAVE & SETTINGS','存档与设置','存档保存在当前浏览器中。下载备份可在另一浏览器继续制作。')+action('export','下载完整存档 JSON','primary wide')+`<label class="file-field">从备份恢复<input id="import-file" type="file" accept=".json,application/json"></label><p id="import-feedback"></p>`+action('quality',state.quality==='high'?'切换到流畅画质':'切换到精细画质','secondary wide')+action('help','操作说明','secondary wide'));}
function park(){const i=state.collection.findIndex(w=>w.id===state.work.id);if(i>=0)state.collection[i]=structuredClone(state.work);else if(state.collection.length<100)state.collection.push(structuredClone(state.work));else throw Error('工作架已满，最多 100 件作品');save();}
function doAction(id){
 try{
  if(id==='close-modal'){closeModal();return;}
  if(id==='park-start'){park();pendingNew?.();pendingNew=null;return;}
  if(id==='free'){requestNew(null);return;}
  if(id==='collection'){collectionModal();return;}
  if(id==='park'){park();closeModal();toast('已另存到工作架，全部工艺进度保留');return;}
  if(id==='supplies'){suppliesModal();return;}
  if(id==='settings'){settings();return;}
  if(id==='export'){exportSave();return;}
  if(id==='quality'){state.quality=state.quality==='high'?'low':'high';save();scene.sync(true);settings();return;}
  if(id==='help'){modal(panelHead('HOW TO PLAY','一只小熊的诞生','先选布料，沿纸样轮廓剪裁；拖动绿色夹点对齐后缝合。加入棉絮，封住背部开口，再安排表情和装饰。')+'<p>镜头：选择「观察」后拖动旋转，滚轮缩放；正、侧、背、近按钮可快速检查。剪裁和缝制只在右侧工具板操作。</p><p>返工：检查栏可重新打开填充口或修改表情，兼容装饰会保留。Ctrl+Z / Ctrl+Shift+Z 撤销和重做。释放鼠标或窗口失焦会结束工具操作。</p><p>作品：自动保存、另存工作架、导出完整 JSON；照片来自实际 3D 工作台。修复委托在完成第一只小熊后解锁。</p>');return;}
  if(id==='basic-kit'){if(state.money>=24&&state.stock.cotton>=8)return;state.stock.cotton+=8;state.money+=16;save();suppliesModal();toast('基础练习补给已领取');return;}
  if(id==='photo'){download(scene.photo(),`plush-${state.work.id.slice(0,8)}.png`);toast('已下载当前实际作品与工作台照片');return;}
  if(id==='press'){tool='press';scene.setTool(tool);$('#hint').textContent='轻按模式 · 点击布偶观察柔软回弹';return;}
  if(id==='find-damage'){tool='repair';scene.setTool(tool);scene.view('side');return;}
  if(id==='compare'){scene.compare=!scene.compare;scene.sync(true);scene.view('front');$('#compare').classList.toggle('hidden',!scene.compare);return;}
  if(id==='undo'||id==='redo'){craft?.end();if((id==='undo'?undo:redo)(state)){save();render();}else toast('没有可'+(id==='undo'?'撤销':'重做')+'的操作');return;}
  if(id==='advance'){craft?.end();advance(state);part='body';tool='view';save();render();if(state.work.stage==='fill'||state.work.stage==='close')scene.view('back');if(state.work.stage==='decorate'||state.work.stage==='inspect')scene.view('front');return;}
  if(id==='fill-plus'||id==='fill-minus'){
   if(state.work.stage==='repair'&&state.work.cost===0){if(state.money<2)throw Error('修复棉絮需要 2 线币，请领取基础补给');state.money-=2;state.work.cost=2;state.history=[];state.future=[];}
   mutate(()=>{
   state.work.fill=Math.max(.25,Math.min(1.3,+(state.work.fill+(id==='fill-plus'?.12:-.1)).toFixed(2)));
  },true);return;}
  if(id==='remove-deco'){mutate(()=>{state.work.decorations=state.work.decorations.filter(d=>d.id!==selected);selected=null;});return;}
  if(id==='rework-fill'||id==='rework-deco'){rework(state,id==='rework-fill'?'fill':'decorate');tool='view';save();render();scene.view(id==='rework-fill'?'back':'front');return;}
  if(id==='collect'){collect(state);save();toast('已收藏这只小熊；可以从收藏柜重新打开');return;}
  if(id==='deliver'){deliver(state);tool='view';save();render();toast('交付成功，'+orderFor(state.work).reward+' 线币已到账');return;}
 }catch(e){toast(e.message);}
}
function handleClick(e){const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.action){doAction(b.dataset.action);return;}if(b.dataset.order){requestNew(b.dataset.order);return;}if(b.dataset.partTab){craft?.end();part=b.dataset.partTab;render();return;}
 if(b.dataset.view){scene.view(b.dataset.view);return;}if(b.dataset.tool){tool=b.dataset.tool;scene.setTool(tool);render();return;}
 if(b.dataset.color){mutate(()=>PARTS.forEach(([id])=>state.work.parts[id].color=b.dataset.color));return;}
 if(b.dataset.fabric){mutate(()=>PARTS.forEach(([id])=>state.work.parts[id].fabric=b.dataset.fabric));return;}
 if(b.dataset.eyes){mutate(()=>state.work.eyes=b.dataset.eyes);return;}if(b.dataset.mouth){mutate(()=>state.work.mouth=b.dataset.mouth);return;}
 if(b.dataset.deco){if(state.work.decorations.length>=20){toast('最多放置 20 件装饰');return;}addDecoration(state,b.dataset.deco);selected=state.work.decorations.at(-1).id;tool='decorate';save();render();scene.view('front');return;}
 if(b.dataset.selectDeco){selected=b.dataset.selectDeco;tool='decorate';render();return;}
 if(b.dataset.buy){try{buy(state,b.dataset.buy);save();suppliesModal();}catch(e){toast(e.message);}return;}
 if(b.dataset.load!==undefined){const w=structuredClone(state.collection[Number(b.dataset.load)]);if(!w)return;state.work=w;if(w.delivered){state.work.id=crypto.randomUUID();state.work.delivered=false;state.work.orderId=null;state.work.stage='inspect';}state.history=[];state.future=[];tool='view';closeModal();save();render();scene.view('front');}
}
function handleChange(e){const el=e.target;if(el.id==='import-file'){const f=el.files?.[0];if(!f)return;if(f.size>2e6){$('#import-feedback').textContent='文件过大';return;}f.text().then(raw=>{try{const restored=validateSave(JSON.parse(raw));state=restored;part='body';selected=null;tool='view';closeModal();save();render();toast('完整存档恢复成功');}catch(err){$('#import-feedback').textContent='恢复失败：'+err.message;}});return;}
 const key=el.dataset.field;if(el.dataset.part){mutate(()=>state.work.parts[el.dataset.part][el.dataset.key]=el.value);return;}if(!key)return;
 mutate(()=>{const val=el.type==='checkbox'?el.checked:Number(el.value);if(key.startsWith('deco.')){const d=state.work.decorations.find(d=>d.id===selected);if(d)d[key.split('.')[1]]=val;}else if(key==='repair.visible')state.work.repair.visible=val;else if(key.includes('.')){const [id,p]=key.split('.');state.work.parts[id][p]=val;}else state.work[key]=val;});
}
function start(){
 $('#app').innerHTML=`<main id="shell"><header class="topbar"><div class="brand"><span class="brand-mark">✿</span><div><h1>布偶小铺</h1><small>PLUSH LITTLE SHOP · 一针一线</small></div></div><div class="top-actions"><span class="money">◈ <b id="money"></b> 线币</span><button class="icon-btn" data-action="collection" aria-label="收藏柜" title="收藏柜">▦</button><button class="icon-btn" data-action="park" aria-label="另存当前作品" title="另存">＋</button><button class="icon-btn" data-action="settings" aria-label="存档与设置" title="存档与设置">⇩</button><button class="icon-btn" data-action="help" aria-label="操作说明">?</button></div></header><section class="workspace"><aside class="left-rail"><div class="rail-title"><span class="eyebrow">WORKBENCH</span><h2 id="stage-title"></h2><p id="stage-desc"></p></div><div id="stage-steps"></div><div class="history-controls"><button id="undo" data-action="undo">↶ 撤销</button><button id="redo" data-action="redo">↷ 重做</button></div><div class="orders-mini"><span class="eyebrow">顾客来信</span><div id="order-list"></div>${action('free','＋ 自由制作','text-btn')}${action('supplies','材料补给','text-btn')}</div></aside><section class="viewport"><div id="world"></div><div class="world-hud"><div class="objective"><span class="status-dot"></span><span id="objective"></span></div><div class="camera-tools">${[['front','正'],['side','侧'],['back','背'],['detail','近'],['room','桌']].map(([id,n])=>`<button data-view="${id}" title="${id}" aria-label="${n}面镜头">${n}</button>`).join('')}</div></div><div class="work-caption"><span>ROUND EAR BEAR · NO. 001</span><b id="work-label">我的小熊</b></div><div class="world-bottom"><div class="hint" id="hint"></div><div class="fps" id="fps"></div></div><div id="compare" class="compare hidden"><span>修复前 · 阿栗</span><span>当前 · 同一只阿栗</span></div><div class="tool-dock"><button data-tool="view">↻ 观察</button><button data-tool="press">☁ 轻按</button></div></section><aside class="right-panel"><div id="panel"></div></aside></section><footer class="footer"><span>沿线手作 · 真实作品状态 · 免费浏览器游戏</span><span id="save-state"></span></footer></main><div id="toast" role="status"></div><div id="modal-root"></div>`;
 try{scene=new WorkshopScene($('#world'),()=>state,worldEvent);}catch(e){$('#world').innerHTML='<div class="webgl-error">无法初始化 3D 画布。请启用浏览器硬件加速并重新打开。<br>'+escape(e.message)+'</div>';return;}
 $('#app').addEventListener('click',handleClick);$('#app').addEventListener('change',handleChange);render();
 window.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();tool='view';scene.setTool(tool);craft?.end();}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!['INPUT','TEXTAREA'].includes(e.target.tagName)){e.preventDefault();doAction(e.shiftKey?'redo':'undo');}});
 window.addEventListener('pagehide',()=>{finishGesture();save();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finishGesture();});
 setInterval(()=>{if(!document.hidden)$('#fps').textContent=scene.stats().fps+' FPS';},1200);
 window.plushShop={getState:()=>structuredClone(state),stats:()=>scene.stats(),scene,save};
 if(!state.started&&!saveWarning){modal(panelHead('A LITTLE STUDIO · A LOT OF HEART','欢迎来到布偶小铺','先做一只圆耳小熊，再修复一位顾客珍爱的旧伙伴。选布、裁剪、缝合与填充，都会留下你自己的手作痕迹。')+`<div class="welcome-bear">♡</div><p>一张木桌，三种织物，和慢慢成形的小熊。</p>`+action('close-modal','开始今天的手作','primary wide'));state.started=true;save();}
 if(saveWarning)toast(saveWarning);
}
start();
