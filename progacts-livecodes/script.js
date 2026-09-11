(function(){
  try{localStorage.getItem('progacts_test')}catch(e){Object.defineProperty(window,'localStorage',{value:{_m:{},getItem(k){return Object.prototype.hasOwnProperty.call(this._m,k)?this._m[k]:null},setItem(k,v){this._m[k]=String(v)},removeItem(k){delete this._m[k]}}})}
  const base='https://cdn.jsdelivr.net/gh/Mbatman9972/alwafer-link-hub@progacts-review/progacts-review-v2/';
  const files=['data.js','app-a.js','app-b.js','app-c.js'];
  function next(i){if(i>=files.length)return;const s=document.createElement('script');s.src=base+files[i]+'?v=20260911';s.onload=()=>next(i+1);s.onerror=()=>{document.body.innerHTML='<div style="font-family:Arial;padding:40px">PROGACTS review assets failed to load. Please refresh once.</div>'};document.body.appendChild(s)}
  next(0);
})();