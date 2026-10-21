import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const bindingPath=path.join(root,'docs/github-pages.json');
const binding=fs.existsSync(bindingPath)?JSON.parse(fs.readFileSync(bindingPath,'utf8')):null;
const repoName='plush-little-shop';
function git(args,input){
  const result=spawnSync('git',args,{cwd:root,input,encoding:'utf8',env:{...process.env,GCM_INTERACTIVE:'never'},timeout:120000});
  if(result.status!==0)throw Error((result.stderr||'Git command failed').trim());
  return result.stdout.trim();
}
const credential=Object.fromEntries(git(['credential','fill'],'protocol=https\nhost=github.com\n'+(binding?'username='+binding.owner+'\n':'')+'\n').split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]}));
if(!credential.password)throw Error('GitHub 登录不可用，请先登录 GitHub。');
async function api(route,method='GET',body){
  const response=await fetch('https://api.github.com'+route,{method,headers:{Authorization:'Bearer '+credential.password,'User-Agent':'Codex-game-publisher',Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const text=await response.text(),data=text?JSON.parse(text):{};
  if(!response.ok)throw Object.assign(Error(`GitHub ${response.status}: ${data.message||'request failed'}`),{status:response.status});
  return data;
}
const user=await api('/user');
if(binding&&(binding.owner!==user.login||binding.repository!==repoName))throw Error('已绑定仓库与当前账户不匹配，停止发布。');
const owner=user.login,repoRoute='/repos/'+owner+'/'+repoName;
if(process.argv.includes('--inspect')){
  const repository=await api(repoRoute);let pages;
  try{pages=await api(repoRoute+'/pages')}catch(e){pages={error:e.message}}
  const runs=await api(repoRoute+'/actions/runs?per_page=3');
  console.log(JSON.stringify({owner,repository:repository.html_url,pages,runs:runs.workflow_runs.map(x=>({id:x.id,status:x.status,conclusion:x.conclusion,url:x.html_url,commit:x.head_sha}))},null,2));process.exit(0);
}
let repository;
try{repository=await api(repoRoute);if(!binding)throw Error('同名仓库已存在且未绑定，停止以避免覆盖。')}
catch(e){if(e.status!==404)throw e;repository=await api('/user/repos','POST',{name:repoName,description:'布偶小铺 · Three.js plush bear making and restoration workshop',private:false,auto_init:false});fs.writeFileSync(bindingPath,JSON.stringify({owner,repository:repoName,repositoryUrl:repository.html_url,url:`https://${owner}.github.io/${repoName}/`,hosting:'GitHub Pages',buildType:'workflow'},null,2));}
if(repository.private||repository.owner.login!==owner)throw Error('仓库归属或公开状态异常。');
if(!fs.existsSync(path.join(root,'.git'))){git(['init','-b','main']);git(['config','user.name',user.name||owner]);git(['config','user.email',`${user.id}+${owner}@users.noreply.github.com`]);git(['remote','add','origin',repository.clone_url]);}
if(git(['rev-parse','--show-toplevel']).replaceAll('\\','/').toLowerCase()!==root.replaceAll('\\','/').toLowerCase())throw Error('必须在游戏自己的仓库中发布。');
if(git(['remote','get-url','origin'])!==repository.clone_url)throw Error('Git remote 不匹配，停止发布。');
git(['add','.gitattributes','.gitignore','.github','src','tests','docs','index.html','package.json','package-lock.json','vite.config.js','README.md','start-game.cmd','favicon.svg']);
const staged=git(['diff','--cached','--name-only']).split('\n').filter(Boolean);
if(staged.some(file=>/^(artifacts|node_modules|dist|\.netlify)\//.test(file)||/(^|\/)\.env($|\.)/.test(file)))throw Error('发布文件包含不应上传的内容。');
if(staged.length)git(['commit','-m','Publish Plush Little Shop playable workshop with GitHub Pages']);
git(['push','-u','origin','main']);
let pages;
try{pages=await api(repoRoute+'/pages');if(pages.build_type!=='workflow')pages=await api(repoRoute+'/pages','PUT',{build_type:'workflow'});}
catch(e){if(e.status!==404)throw e;pages=await api(repoRoute+'/pages','POST',{build_type:'workflow'});}
console.log(JSON.stringify({repository:repository.html_url,page:pages.html_url,commit:git(['rev-parse','HEAD']),hosting:'GitHub Pages; wait for workflow success and anonymous browser verification'},null,2));
