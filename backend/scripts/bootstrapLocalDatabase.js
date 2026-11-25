// Fresh local databases only. Never resets, drops or alters existing data.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import prismaClientPackage from "@prisma/client";

const historical=[
  "20260707122448_seed_changed",
  "20260708095325_add_account_code",
  "20261102000000_central_client_onboarding",
  "20261103000000_employee_module_access",
  "20261103010000_campaign_fields",
  "20261103020000_task_contact_link",
  "20261103030000_task_workflow",
  "20261104090000_industry_per_tenant",
];
const root=fileURLToPath(new URL("../",import.meta.url));
const cli=fileURLToPath(new URL("../node_modules/prisma/build/index.js",import.meta.url));
const baseline="prisma/baselines/pre-contact-workspace.prisma";
function run(args,input){
  return execFileSync(process.execPath,[cli,...args],{cwd:root,encoding:"utf8",...(input!==undefined?{input}:{}),stdio:[input!==undefined?"pipe":"ignore","pipe","inherit"]});
}
function show(args){process.stdout.write(run(args));}

async function main(){
  const args=process.argv.slice(2);
  if(args.length!==3||args[0]!=="--database"||args[2]!=="--confirm-empty")throw Error("Usage: npm run db:bootstrap:local -- --database <empty database name> --confirm-empty");
  const url=new URL(process.env.DATABASE_URL||"");
  const name=decodeURIComponent(url.pathname.slice(1));
  if(url.protocol!=="mysql:"||!["localhost","127.0.0.1","[::1]"].includes(url.hostname)||!name||name!==args[1]||url.search||url.hash)throw Error("Refusing bootstrap: DATABASE_URL must specify the confirmed local MySQL database, without connection options.");
  if(["mysql","information_schema","performance_schema","sys"].includes(name.toLowerCase()))throw Error("Refusing system database.");
  const {PrismaClient}=prismaClientPackage;
  const db=new PrismaClient({adapter:new PrismaMariaDb({
    host:url.hostname.replace(/^\[|\]$/g,""),port:Number(url.port||3306),
    user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),database:name,
    connectionLimit:1,connectTimeout:30000,acquireTimeout:35000,
    // The verified loopback-only target may use a self-signed local MySQL certificate.
    // Match the application adapter’s TLS handshake; never apply this to remote targets.
    ssl:{rejectUnauthorized:false}
  })});
  try{
    const [result]=await db.$queryRawUnsafe("SELECT DATABASE() AS database_name, (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()) + (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=DATABASE()) + (SELECT COUNT(*) FROM information_schema.EVENTS WHERE EVENT_SCHEMA=DATABASE()) AS object_count");
    if(result?.database_name!==name||Number(result.object_count)!==0)throw Error("Refusing bootstrap: database is not empty.");
  }finally{await db.$disconnect();}
  const sql=run(["migrate","diff","--from-empty","--to-schema",baseline,"--script"]);
  if(!sql.trim()||!sql.includes("CREATE TABLE"))throw Error("Baseline DDL was not generated.");
  process.stdout.write(run(["db","execute","--stdin"],sql));
  // Only record the historical migrations after verifying the installed schema.
  show(["migrate","diff","--from-config-datasource","--to-schema",baseline,"--exit-code"]);
  for(const migration of historical)show(["migrate","resolve","--applied",migration]);
  show(["migrate","deploy"]);
  show(["migrate","status"]);
  show(["migrate","diff","--from-config-datasource","--to-schema","prisma/schema.prisma","--exit-code"]);
  console.log("Local database bootstrap complete.");
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
