const http=require("http"),fs=require("fs"),path=require("path");
const PORT=process.env.PORT||3000,DUR=20*60e3;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const T=["20:00","20:30","21:00","21:30"];
const ACT=[["קראת עיתון","קריאת עיתון"],["הכנת לעצמך תה","הכנת תה"],["דיברת בטלפון","שיחת טלפון"],["בדקת הודעות","בדיקת הודעות"],["הסתכלת בתמונות שעל הקירות","התבוננות בתמונות"],["סידרת את הדברים שלך","סידור חפצים"],["הקשבת למוזיקה","האזנה למוזיקה"],["הכנת כריך","הכנת כריך"]];
const R8=["בסלון","במטבח","בספרייה","בחדר האוכל","במרפסת","במרתף","בחדר המוזיקה","במסדרון"];
const SC=[
{n:"אחוזת הברון",i:"ערב גאלה באחוזה הכפרית של משפחת פון שטיין. סופה ניתקה את הדרך והאורחים נשארו ללון.",v:["הברון פון שטיין","הברונית אסתר","המשרת הראשי יעקב"],w:["פמוט כסף כבד","פסל ברונזה","מפתח ברגים ישן","כבל של מנורה","סכין לפתיחת מכתבים"],r:R8,near:["בספרייה","במסדרון"],s:"בחדר העבודה",x:"דרך החלון אל המרפסת"},
{n:"ספינת הקרוז",i:"שיט יוקרה בים התיכון, הלילה האחרון לפני הנמל. הים סוער ואיש לא יכול לרדת מהספינה.",v:["קפטן רפאלי","המלצר הראשי","הזמר הנודד"],w:["חבל עגינה","מפתח ברגים של המכונאי","סכין דגים","בקבוק יין כבד","עוגן קטן"],r:["בסיפון","בבר","במסעדה","בחדר הקולנוע","בספא","בחדר המכונות","במועדון","במעבר התאים"],near:["במעבר התאים","בסיפון"],s:"בחדר הקברניט",x:"דרך דלת הצד אל הסיפון"},
{n:"מלון בהרים",i:"מלון סקי מבודד שכוסה בשלג. הכבישים סגורים והחשמל מהבהב.",v:["בעל המלון מר קליין","הטבח הראשי","האורחת הותיקה גב׳ רוזן"],w:["מגרפת האח","פטיש קרח","בקבוק שמפניה","מגש כסף","מקל סקי"],r:["בלובי","במסעדה","בספא","בחדר המדרגות","באולם האח","בחדר הסקי","בבר","במסדרון הקומה"],near:["במסדרון הקומה","בחדר המדרגות"],s:"בחדר המנהל",x:"דרך דלת השירות"},
{n:"מאחורי הקלעים",i:"הצגת הבכורה זה עתה הסתיימה. הקהל הלך והצוות נשאר לחגוג מאחורי הקלעים.",v:["הבמאי דוד לנדאו","הכוכבת הראשית","מנהל הבמה"],w:["חרב במה כבדה","זרקור","חבל תפאורה","פסלון פרס","מספריים של תלבושות"],r:["על הבמה","מאחורי הקלעים","בחדר הלבשה","בלובי","בבר התיאטרון","באולם הריק","בחדר התאורה","במחסן התפאורה"],near:["מאחורי הקלעים","בחדר הלבשה"],s:"במשרד הבמאי",x:"דרך היציאה האחורית"},
{n:"תחנת המחקר בקוטב",i:"תחנת מחקר מבודדת וסופת שלגים שמנתקת את הקשר. הצוות סגור בתחנה עד הבוקר.",v:["ד״ר נורדן ראש הצוות","המהנדס אורי","הביולוגית מאיה"],w:["גרזן קרח","צינור ברזל","מקדחה ידנית","מחשב נייד כבד","בלון חמצן"],r:["במעבדה","במטבח","בחדר המגורים","בחדר הגנרטור","בחדר הקשר","במחסן הציוד","בחדר הכושר","במסדרון הראשי"],near:["במסדרון הראשי","בחדר הקשר"],s:"במשרד ראש הצוות",x:"דרך פתח האוורור"},
{n:"רכבת הלילה",i:"רכבת לילה שחוצה את אירופה. מפולת שלג עצרה אותה באמצע הדרך.",v:["הסוחר מר ברטוני","הנסיכה אנה","מנהל הרכבת"],w:["מקל הליכה כבד","מזוודת ברזל","חוט פסנתר","פטיש חירום","סכין מטבח"],r:["בקרון המסעדה","בקרון הלילה","בקרון הסלון","בקרון המטען","בקרון הבר","במסדרון הרכבת","בקרון הצוות","בין הקרונות"],near:["במסדרון הרכבת","בקרון הלילה"],s:"בתא הפרטי",x:"דרך הדלת שבין הקרונות"},
{n:"האקדמיה העתיקה",i:"ערב סיום שנה באקדמיה עתיקה. הכול פתוח לחגיגה ואיש אינו עוזב.",v:["פרופסור גולד","הרקטור","אוצרת הספרייה"],w:["ספר עתיק כבד","מחזיק ספרים מברזל","מיקרוסקופ כבד","פסל ראש מגבס","סרגל מתכת"],r:["בספרייה","באולם ההרצאות","במעבדה","בקפטריה","בחצר","במשרדי הסגל","בחדר המחשבים","במסדרון"],near:["במסדרון","במשרדי הסגל"],s:"במשרד הרקטור",x:"דרך חלון המשרד"},
{n:"הקרקס הנודד",i:"קרקס נודד חנה בעיר להופעה אחרונה. אחרי ההצגה נשארו כולם לחגוג בין הקרוואנים.",v:["מנהל הקרקס","הקוסם הגדול","הלהטוטן"],w:["פטיש ענק","שוט","חבל אקרובט","סכין זריקה","מוט ברזל"],r:["באוהל הראשי","מאחורי הקלעים","בקרון הקוסם","באזור החיות","בדוכן הממתקים","בחניון הקרוואנים","בחדר התלבושות","בשביל הכניסה"],near:["בחניון הקרוואנים","בשביל הכניסה"],s:"בקרון המנהל",x:"דרך החלון האחורי"},
{n:"חוות היין",i:"חוות יין משפחתית בחגיגת הבציר. מתחת למסיבה מסתתרים ריבים ישנים על ירושה.",v:["בעל החווה","היינן הראשי","סבתא של המשפחה"],w:["פותחן יין ענק","מזלג חציר","בקבוק זכוכית כבד","חבל מחבית","פטיש עץ"],r:["בכרם","במרתף היין","בחדר הטעימות","בחצר","במטבח","בחדר האוכל","באסם","בשביל העפר"],near:["בחצר","בשביל העפר"],s:"במשרד החווה",x:"דרך הדלת האחורית"},
{n:"תחנת החלל",i:"תחנת חלל קטנה במסלול סביב כדור הארץ. תקלת תקשורת ניתקה אותה מהבקרה.",v:["המפקד סורוב","המהנדסת ליה","רופא התחנה"],w:["מפתח שרשרת כבד","צינור כיבוי","כלי מדידה כבד","כבל חשמל","מנעול כבד"],r:["במעבדה","במודול המגורים","במטבחון","בחדר הכושר","בחדר השליטה","במנעול האוויר","בחדר החשמל","במעבר הראשי"],near:["במעבר הראשי","בחדר השליטה"],s:"בתא המפקד",x:"דרך פתח התחזוקה"}];
function rng(s){let h=1779033703^s.length;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19}let a=h>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

const REL=["שותף עסקי","קרוב משפחה","חבר ותיק","עובד ותיק","אורח בפעם הראשונה","שכן ותיק"];
const SEC=["אתה חייב כסף לקורבן ועוד לא סיפרת לאיש.","בשעות האלה התכתבת בסתר עם מישהו שאסור לך לדבר איתו.","חיטטת בחפצים של אורח אחר ונבהלת כששמעת מישהו מתקרב.","רצית לעזוב את האירוע מוקדם ופחדת שזה ייראה חשוד."];
const MOT=["החוב שלו הרס אותך כלכלית.","הוא איים לחשוף סוד שלך ברבים.","הוא לקח ממך ירושה שהגיעה לך.","הוא הלשין עליך ופגע בקריירה שלך."];
const DET=["האוויר היה חם ומעט מחניק.","נשמעה מוזיקה חלשה ממקום רחוק.","האור היה עמום ונעים.","עמד שם ריח של קפה טרי.","שמעת צעדים כבדים בחדר סמוך.","הרצפה חרקה מתחת לרגליך.","מישהו צחק בקול מהקומה הסמוכה.","הרגשת משב רוח קר מהחלון."];
const TPL=[
{r:[[0,0,130,100],[130,0,140,100],[270,0,130,100],[0,100,130,120],[130,100,140,120],[270,100,130,120],[0,220,130,100],[130,220,140,100],[270,220,130,100]],s:4},
{r:[[0,0,100,100],[100,0,100,100],[200,0,100,100],[300,0,100,100],[0,100,400,110],[0,210,100,110],[100,210,100,110],[200,210,100,110],[300,210,100,110]],s:2},
{r:[[0,0,120,107],[0,107,120,107],[0,214,120,106],[120,0,140,160],[120,160,140,160],[260,0,140,80],[260,80,140,80],[260,160,140,80],[260,240,140,80]],s:3},
{r:[[0,0,80,140],[80,0,80,140],[160,0,80,140],[240,0,80,140],[320,0,80,140],[0,140,100,180],[100,140,100,180],[200,140,100,180],[300,140,100,180]],s:6}];
function adj(a,b){const ox=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0]),oy=Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1]);
 if((a[0]+a[2]===b[0]||b[0]+b[2]===a[0])&&oy>=30)return{x:a[0]+a[2]===b[0]?b[0]:a[0],y:Math.max(a[1],b[1])+oy/2,v:1};
 if((a[1]+a[3]===b[1]||b[1]+b[3]===a[1])&&ox>=30)return{x:Math.max(a[0],b[0])+ox/2,y:a[1]+a[3]===b[1]?b[1]:a[1],v:0};return null}
function build(g){const R=rng(g.seed),ids=g.roster,pk=a=>a[Math.floor(R()*a.length)],sh=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const si=Math.floor(R()*SC.length),ti=Math.floor(R()*TPL.length),sc=SC[g.scIdx!=null?g.scIdx:si],tpl=TPL[g.tplIdx!=null?g.tplIdx:ti];
 const k=g.forceKiller||ids[Math.floor(R()*ids.length)],victim=pk(sc.v),weap=pk(sc.w),mot=pk(MOT),pos={},act={},det={},rel={},sec={};
 ids.forEach(i=>{pos[i]=[pk(sc.r),pk(sc.r),pk(sc.r),i===k?sc.s:pk(sc.r)];act[i]=[0,1,2,3].map(()=>pk(ACT));det[i]=[0,1,2,3].map(()=>pk(DET));rel[i]=pk(REL);sec[i]=pk(SEC)});
 const oth=ids.filter(i=>i!==k),w=oth[Math.floor(R()*oth.length)];pos[w][2]=pos[k][2];pos[w][3]=pk(sc.near);
 const all=tpl.r.map((r,i)=>i),nb=sh(all.filter(i=>i!==tpl.s&&adj(tpl.r[tpl.s],tpl.r[i]))),ns=nb.slice(0,2),rest=sh(all.filter(i=>i!==tpl.s&&!ns.includes(i))),others=sh(sc.r.filter(r=>!sc.near.includes(r))),layout=Array(9);
 layout[tpl.s]=sc.s;layout[ns[0]]=sc.near[0];layout[ns[1]]=sc.near[1];rest.forEach((x,i)=>layout[x]=others[i]);
 return{sc,tpl,k,victim,weap,mot,pos,act,det,rel,sec,w,fake:pk(sc.r),layout}}
const lab=r=>r.replace(/^ב(?!ין)/,"");
function story(g,me){const B=g.B,N=g.names,sc=B.sc,isK=B.k===me,p=B.pos[me],a=B.act[me],d=B.det[me],nm=i=>esc(N[i]),o=[];
 o.push(`<h3>${sc.n}</h3><p>${sc.i} הלילה נרצח <b>${B.victim}</b>. גופתו נמצאה ב־22:00 ${sc.s}. כל הנוכחים חשודים, ואתם האחרונים שנשארו שם.</p>`);
 o.push(`<p><b>מי אתה:</b> אתה ${B.rel[me]} של ${B.victim}.${isK?"":" <b>הסוד שלך:</b> "+B.sec[me]+" אתה לא חייב לספר אותו, אבל הוא עלול לגרום לך להיראות חשוד."}</p>`);
 if(isK)o.push(`<div class="card kill"><b>🔪 אתה הרוצח.</b><p><b>המניע:</b> ${B.mot}</p><p><b>התוכנית:</b> ב־21:30 נכנסת בשקט ${sc.s}, שם ${B.victim} היה שקוע בענייניו. ב־21:45 הרמת את <b>${B.weap}</b>, פעלת מהר, ניגבת טביעות ויצאת ${sc.x}.</p><p><b>הסיפור המכסה:</b> “ב־21:30 הייתי ${B.fake}”. שים לב: אם מישהו היה שם באמת, הוא יגלה את השקר. ייתכן שמישהו ראה אותך ב־21:00. אל תכחיש הכול, ופנה חשד למי שהיה קרוב ל${lab(sc.s)}.</p></div>`);
 o.push(`<p><b>המסלול שלך:</b> ${p.map((r,s)=>T[s]+" "+lab(r)).join(" ← ")}</p>`);
 [0,1,2,3].forEach(s=>{const here=p[s],prev=s?p[s-1]:null,pr=g.roster.filter(i=>i!==me&&B.pos[i][s]===here);
  let t=`<p><b>⏰ ${T[s]}</b> — `+(s===0?`הגעת ${here}. `:here===prev?`נשארת ${here}. `:`עברת מ${lab(prev)} אל ${here}. `);
  if(isK&&s===3)t+=`נכנסת בשקט, שם ${B.victim} היה שקוע בענייניו, ונשארת שם עד 21:45. `;
  else{t+=`${a[s][0]}. ${d[s]} `;t+=pr.length?"ראית שם: "+pr.map(i=>`${nm(i)} (בזמן ${B.act[i][s][1]})`).join(", ")+".":"לא ראית שם אף אחד."}
  o.push(t+"</p>")});
 if(me===B.w)o.push(`<p>ב־21:00 הבחנת שאחד מהנוכחים הסתיר משהו עטוף במטפחת. אולי זה היה <b>${B.weap}</b>.</p>`);
 if(!isK)o.push(`<p><b>⏰ 21:45</b> — ${sc.near.includes(p[3])?"שמעת בום חזק וצעקה קצרה מכיוון "+lab(sc.s)+".":"שמעת מרחוק צעקה עמומה, ולא הצלחת להבין מאיפה."}</p>`);
 o.push(`<p class="mut">רמז: בלשונית “חקירות” אפשר לשאול כל שחקן איפה היה ואת מי ראה, ולהשוות לסיפור שלך.</p>`);
 return o.join("")}
function mapData(g,me){const B=g.B,nm=B.layout,rs=B.tpl.r,doors=[];
 rs.forEach((r,i)=>rs.forEach((q,j)=>{if(j>i){const d=adj(r,q);if(d)doors.push(d)}}));
 return{rooms:rs.map((r,i)=>({x:r[0],y:r[1],w:r[2],h:r[3],label:lab(nm[i])})),doors,scene:B.tpl.s,sceneFull:B.sc.s,mineFull:B.pos[me][3],
  route:[0,1,2,3].map(s=>({t:T[s],room:nm.indexOf(B.pos[me][s]),full:B.pos[me][s],saw:g.roster.filter(i=>i!==me&&B.pos[i][s]===B.pos[me][s]).map(i=>g.names[i])}))}}
function phase(g){if(g.status!=="playing")return{p:"lobby"};const now=Date.now(),dl=g.startedAt+DUR,ids=g.roster,all=ids.every(i=>g.votes[i]);
 const R=all?Math.max(...ids.map(i=>g.votes[i].t)):dl;if(!all&&now<dl)return{p:"play",left:dl-now};const e=now-R;
 return e<10000?{p:"count",n:10-Math.floor(e/1000)}:{p:"res"}}
function result(g){const cnt={};Object.values(g.votes).forEach(v=>cnt[v.target]=(cnt[v.target]||0)+1);
 const mx=Math.max(0,...Object.values(cnt)),top=Object.keys(cnt).filter(i=>cnt[i]===mx),ok=mx>0&&top.length===1&&top[0]===g.B.k;
 return{none:!mx,ok,top:top.map(i=>g.names[i]),killer:g.names[g.B.k],killerStory:ok?"":story(g,g.B.k),
  votes:g.roster.map(i=>({name:g.names[i],target:g.votes[i]?g.names[g.votes[i].target]:null}))}}
function view(g,id){const o={code:g.code,status:g.status,host:g.host,me:id,phase:phase(g),chat:g.chat.slice(-400),players:[...g.players].map(([i,n])=>({id:i,name:n}))};
 if(g.status==="playing"&&g.roster.includes(id)){o.story=story(g,id);o.map=mapData(g,id);o.roster=g.roster.map(i=>({id:i,name:g.names[i]}));
  o.voted=Object.keys(g.votes);o.myVote=g.votes[id]?g.votes[id].target:null;if(o.phase.p==="res")o.result=result(g)}
 return o}
const games=new Map();
const send=(c,o)=>c.res.write("data: "+JSON.stringify(o)+"\n\n");
const push=g=>g.clients.forEach(c=>send(c,view(g,c.id)));
function body(req){return new Promise(r=>{let d="";req.on("data",c=>{d+=c;if(d.length>10000)req.destroy()});req.on("end",()=>{try{r(JSON.parse(d||"{}"))}catch(e){r({})}})})}
const fail=(res,c,e)=>{res.writeHead(c,{"Content-Type":"application/json"});res.end(JSON.stringify({e}))};
const ok=(res,o)=>{res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify(o||{}))};
const clean=n=>String(n||"").trim().slice(0,16);
const INDEX=fs.readFileSync(path.join(__dirname,"index.html"));
http.createServer(async(req,res)=>{const u=new URL(req.url,"http://x");
 if(req.method==="GET"&&u.pathname==="/"){res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});return res.end(INDEX)}
 if(req.method==="GET"&&u.pathname==="/api/events"){const g=games.get(u.searchParams.get("code")),id=u.searchParams.get("id");
  if(!g||!g.players.has(id))return fail(res,404,"לא נמצא");
  res.writeHead(200,{"Content-Type":"text/event-stream","Cache-Control":"no-cache",Connection:"keep-alive","X-Accel-Buffering":"no"});
  const c={res,id};g.clients.add(c);send(c,view(g,id));req.on("close",()=>g.clients.delete(c));return}
 if(req.method!=="POST")return fail(res,404,"לא נמצא");
 const b=await body(req),id=String(b.id||"").slice(0,64),name=clean(b.name);if(!id)return fail(res,400,"חסר מזהה");
 if(u.pathname==="/api/new"){if(!name)return fail(res,400,"הכנס שם");let code;do code=String(1000+Math.floor(Math.random()*9000));while(games.has(code));
  games.set(code,{code,host:id,status:"lobby",players:new Map([[id,name]]),chat:[],votes:{},clients:new Set(),created:Date.now()});return ok(res,{code})}
 if(u.pathname==="/api/test"){if(!name)return fail(res,400,"הכנס שם");let code;do code=String(1000+Math.floor(Math.random()*9000));while(games.has(code));
  const g={code,host:id,status:"playing",test:1,players:new Map([[id,name],["bot1","בוט א׳"],["bot2","בוט ב׳"]]),chat:[],votes:{},clients:new Set(),created:Date.now()};
  g.roster=[...g.players.keys()].sort();g.names=Object.fromEntries(g.players);g.seed="test";g.scIdx=0;g.tplIdx=0;g.forceKiller=id;g.B=build(g);g.startedAt=Date.now();
  ["bot1","bot2"].forEach(x=>g.votes[x]={target:id,t:Date.now()});games.set(code,g);return ok(res,{code})}
 const g=games.get(String(b.code||""));if(!g)return fail(res,404,"קוד לא נמצא");
 if(u.pathname==="/api/join"){if(!g.players.has(id)){if(g.status!=="lobby")return fail(res,403,"המשחק כבר התחיל והכניסה נעולה");
   if(!name)return fail(res,400,"הכנס שם");if(g.players.size>=12)return fail(res,403,"המשחק מלא");g.players.set(id,name);push(g)}return ok(res,{code:g.code})}
 if(!g.players.has(id))return fail(res,403,"אינך במשחק");
 if(u.pathname==="/api/chat"){const t=String(b.text||"").trim().slice(0,300),to=String(b.to||"");if(t&&g.players.has(to)){g.chat.push({uid:id,to,name:g.players.get(id),text:t,t:Date.now()});if(g.chat.length>600)g.chat.shift();push(g)}return ok(res)}
 if(u.pathname==="/api/start"){if(g.host!==id||g.status!=="lobby"||g.players.size<3)return fail(res,400,"אי אפשר להתחיל");
  g.roster=[...g.players.keys()].sort();g.names=Object.fromEntries(g.players);g.seed=Math.random().toString(36).slice(2)+Date.now();
  g.B=build(g);g.startedAt=Date.now();g.status="playing";push(g);return ok(res)}
 if(u.pathname==="/api/vote"){if(g.status!=="playing"||!g.roster.includes(id)||g.votes[id]||phase(g).p!=="play"||!g.roster.includes(b.target)||b.target===id)return fail(res,400,"אי אפשר להצביע");
  g.votes[id]={target:b.target,t:Date.now()};push(g);return ok(res)}
 fail(res,404,"לא נמצא")}).listen(PORT,()=>console.log("listening on "+PORT));
let n=0;setInterval(()=>{n++;const now=Date.now();games.forEach((g,code)=>{
 if(now-g.created>6*3600e3){g.clients.forEach(c=>c.res.end());games.delete(code);return}
 if(g.status==="playing"){const ph=phase(g);g.clients.forEach(c=>send(c,{tick:1,phase:ph}));if(ph.p==="res"&&!g.resSent){g.resSent=1;push(g)}}
 else if(n%20===0)g.clients.forEach(c=>c.res.write(":\n\n"))})},1000);
