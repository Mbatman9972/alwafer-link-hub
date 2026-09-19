"use strict";

function sendJson(res,status,body){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
  res.setHeader("Pragma","no-cache");
  res.end(JSON.stringify(body));
}
function clean(v,max){return String(v==null?"":v).trim().slice(0,max)}

const VOICE_BY_LANG={en:"cedar",ar:"cedar",fr:"cedar",de:"cedar"};
const INSTRUCTIONS={
  en:"Speak like a polished human portfolio concierge. Warm, confident, natural, conversational, with subtle pauses and varied intonation. Never sound robotic or like a screen reader. Pronounce product names clearly and naturally.",
  ar:"تحدث بالعربية الفصحى الواضحة بنبرة عربية دافئة وطبيعية وقريبة من المحادثة البشرية. استخدم وقفات قصيرة وتنغيمًا طبيعيًا، ولا تبدُ كقارئ آلي. انطق أسماء المشاريع والاختصارات بوضوح وبشكل مفهوم.",
  fr:"Parlez en français naturel, chaleureux et professionnel, comme un conseiller humain. Utilisez une intonation variée et de courtes pauses. Ne sonnez jamais comme un lecteur d’écran ou une voix robotique.",
  de:"Sprich natürliches, warmes und professionelles Deutsch wie ein menschlicher Gesprächspartner. Verwende natürliche Pausen und abwechslungsreiche Intonation. Klinge niemals wie ein Screenreader oder eine Roboterstimme."
};

module.exports=async function handler(req,res){
  if(req.method==="GET")return sendJson(res,200,{ok:true,configured:!!process.env.OPENAI_API_KEY});
  if(req.method!=="POST")return sendJson(res,405,{error:"method_not_allowed"});
  if(!process.env.OPENAI_API_KEY)return sendJson(res,503,{error:"ai_not_configured"});

  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body)}catch(e){return sendJson(res,400,{error:"invalid_json"})}}
  body=body||{};
  const text=clean(body.text,3900);
  const lang=["ar","en","fr","de"].includes(body.lang)?body.lang:"en";
  if(!text)return sendJson(res,400,{error:"text_required"});

  try{
    const r=await fetch("https://api.openai.com/v1/audio/speech",{
      method:"POST",
      headers:{
        "Authorization":"Bearer "+process.env.OPENAI_API_KEY,
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        model:process.env.ALWEFER_TTS_MODEL||"gpt-4o-mini-tts",
        voice:VOICE_BY_LANG[lang]||"cedar",
        input:text,
        instructions:INSTRUCTIONS[lang]||INSTRUCTIONS.en,
        response_format:"mp3",
        speed:lang==="ar"?0.96:0.98
      })
    });
    if(!r.ok){
      const err=await r.text().catch(()=>"");
      console.error("portfolio-speak openai error",r.status,err.slice(0,300));
      return sendJson(res,502,{error:"tts_provider_error"});
    }
    const buf=Buffer.from(await r.arrayBuffer());
    res.statusCode=200;
    res.setHeader("Content-Type","audio/mpeg");
    res.setHeader("Content-Length",String(buf.length));
    res.setHeader("Cache-Control","no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma","no-cache");
    res.setHeader("X-Content-Type-Options","nosniff");
    return res.end(buf);
  }catch(error){
    console.error("portfolio-speak error",String(error&&error.message||error));
    return sendJson(res,500,{error:"tts_error"});
  }
};
