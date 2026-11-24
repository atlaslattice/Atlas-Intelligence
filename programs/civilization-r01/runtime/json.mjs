export function require_(condition, message) {if(!condition)throw new Error(message);}
export function snapshot(value, {maxBytes=2*1024*1024,maxDepth=48,maxItems=100000}={}) {
  let items=0;
  const seen=new WeakSet();
  function copy(v,depth) {
    require_(++items<=maxItems&&depth<=maxDepth,'JSON_BOUND');
    if(v===null||typeof v==='string'||typeof v==='boolean')return v;
    if(typeof v==='number'){require_(Number.isFinite(v),'FINITE_NUMBER_REQUIRED');return v;}
    require_(typeof v==='object'&&v!==null,'JSON_VALUE_REQUIRED');
    require_(!seen.has(v),'CYCLIC_JSON');seen.add(v);
    const descriptors=Object.getOwnPropertyDescriptors(v);
    let out;
    if(Array.isArray(v)) {
      require_(v.length<=maxItems,'ARRAY_BOUND');
      out=[];
      for(let i=0;i<v.length;i++) {const d=descriptors[String(i)];require_(d&&Object.hasOwn(d,'value'),'DENSE_DATA_ARRAY_REQUIRED');out.push(copy(d.value,depth+1));}
      require_(Object.keys(descriptors).every(k=>k==='length'||/^(0|[1-9][0-9]*)$/.test(k)&&Number(k)<v.length),'ARRAY_EXTRA_PROPERTIES');
    } else {
      require_([Object.prototype,null].includes(Object.getPrototypeOf(v)),'PLAIN_OBJECT_REQUIRED');out=Object.create(null);
      for(const key of Object.keys(descriptors).sort()) {
        const d=descriptors[key];require_(Object.hasOwn(d,'value')&&d.enumerable,'DATA_PROPERTY_REQUIRED');
        require_(!['__proto__','constructor','prototype'].includes(key),'UNSAFE_OBJECT_KEY');out[key]=copy(d.value,depth+1);
      }
    }
    require_(Object.getOwnPropertySymbols(v).length===0,'SYMBOL_KEYS_FORBIDDEN');seen.delete(v);return out;
  }
  const out=copy(value,0),raw=JSON.stringify(out);
  require_(new TextEncoder().encode(raw).length<=maxBytes,'JSON_BYTE_BOUND');
  return JSON.parse(raw);
}
export function canonical(value, limits) {return JSON.stringify(snapshot(value,limits));}
export async function fingerprint(bytes) {
  require_(globalThis.crypto?.subtle,'WEBCRYPTO_REQUIRED');
  const raw=typeof bytes==='string'?new TextEncoder().encode(bytes):bytes;
  return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
