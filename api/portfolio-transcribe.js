"use strict";

function send(res,status,body){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.end(JSON.stringify(body));
}
function clean(v,max){return String(v==null?"":v).trim().slice(0,max)}
module.exports=async function handler(req,res){
  if(req.method==="GET")return send(res,200,{ok:true,configured:!!process.env.OPENAI_API_KEY});
  if(req.method!=="POST")return send(res,405,{error:"method_not_allowed"});
  if(!process.env.OPENAI_API_KEY)return send(res,503,{error:"ai_not_configured"});
  let body=req.body;
  if(typeof body==="string"){try{body=JSON.parse(body)}catch(e){return send(res,400,{error:"invalid_json"})}}
  body=body||{};
  const b64=clean(body.audio,9_000_000);
  const mime=clean(body.mime_type||"audio/webm",80);
  if(!b64)return send(res,400,{error:"audio_required"});
  let buf;try{buf=Buffer.from(b64,"base64")}catch(e){return send(res,400,{error:"invalid_audio"})}
  if(!buf.length||buf.length>6_500_000)return send(res,413,{error:"audio_too_large"});
  try{
    const ext=mime.includes("mp4")?"m4a":mime.includes("ogg")?"ogg":mime.includes("wav")?"wav":"webm";
    const form=new FormData();
    form.append("file",new Blob([buf],{type:mime}),"speech."+ext);
    form.append("model",process.env.ALWEFER_TRANSCRIBE_MODEL||"gpt-4o-mini-transcribe");
    form.append("response_format","json");
    form.append("prompt","Portfolio conversation. Project names may include Alwafer, ReelsCheck, COVAT, Projact, AquaGuard, Securia, TikVibe, and Cento. Preserve the speaker's language exactly.");
    const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{
      method:"POST",
      headers:{"Authorization":"Bearer "+process.env.OPENAI_API_KEY},
      body:form
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok){
      console.error("portfolio-transcribe openai error",r.status,data&&data.error&&data.error.message);
      return send(res,502,{error:"transcription_provider_error",status:r.status});
    }
    const text=clean(data.text,4000);
    if(!text)return send(res,502,{error:"empty_transcription"});
    return send(res,200,{ok:true,text});
  }catch(error){
    console.error("portfolio-transcribe error",String(error&&error.message||error));
    return send(res,500,{error:"transcription_error"});
  }
};
