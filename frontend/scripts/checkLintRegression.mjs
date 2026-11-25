import {readFileSync} from "node:fs";
const [baselinePath,currentPath]=process.argv.slice(2);
function findings(path){
  const files=JSON.parse(readFileSync(path,"utf8"));
  if(!Array.isArray(files))throw Error("Invalid ESLint report");
  const result=new Map();
  for(const file of files){
    const name=file.filePath.split("/frontend/").at(-1);
    for(const message of file.messages){
      if(message.fatal)throw Error("Fatal lint error: "+name+" "+message.message);
      const key=[name,message.ruleId||"unknown",message.severity].join("|");
      result.set(key,(result.get(key)||0)+1);
    }
  }
  return result;
}
const baseline=findings(baselinePath),current=findings(currentPath);
const total=map=>[...map.values()].reduce((a,b)=>a+b,0);
console.log("Upstream legacy findings:",total(baseline),"Current findings:",total(current));
const regressions=[...current].filter(([key,count])=>count>(baseline.get(key)||0));
for(const [key,count] of regressions)console.error("New lint findings:",key,count-(baseline.get(key)||0));
if(regressions.length)process.exitCode=1;
else console.log("No new per-file/rule/severity lint findings; legacy debt is not resolved.");
