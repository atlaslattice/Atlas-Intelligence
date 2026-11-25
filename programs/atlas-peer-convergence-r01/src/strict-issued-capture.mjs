/**
 * Atlas source-only strict capture of a caller-supplied numeric peer frame.
 * This is NOT a source-rights grant, issuer attestation or final egress lock.
 * Works alongside (not in place of) the one existing neural result.
 * The original R34/R35 versions remain unmodified in a private predecessor archive.
 */
import {types as utilTypes} from 'node:util';
import {createHash} from 'node:crypto';

const taProto=Object.getPrototypeOf(Float64Array.prototype);
const intrinsic=Object.fromEntries(['buffer','length','byteOffset','byteLength'].map(k=>[k,Object.getOwnPropertyDescriptor(taProto,k).get]));
const abResizable=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'resizable')?.get;
const abDetached=Object.getOwnPropertyDescriptor(ArrayBuffer.prototype,'detached')?.get;
const HEX=/^[0-9a-f]{64}$/;
const NAME=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;

function fail(code){throw new TypeError(code)}
export function plainRecord(value,keys){
  if(!value||typeof value!=='object'||Array.isArray(value)||utilTypes.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('INVALID_RECORD');
  const desc=Object.getOwnPropertyDescriptors(value),own=Reflect.ownKeys(desc);
  if(own.length!==keys.length||own.some(x=>typeof x!=='string'||!keys.includes(x)))fail('INVALID_RECORD_FIELDS');
  const out=Object.create(null);
  for(const key of keys){const d=desc[key];if(!d||!Object.hasOwn(d,'value')||!d.enumerable)fail('GETTER_OR_MISSING');out[key]=d.value}
  return out;
}
export function primitiveMetadata(raw,{ids=[],hashes=[]}={}){
  for(const key of ids)if(typeof raw[key]!=='string'||!NAME.test(raw[key]))fail('INVALID_IDENTIFIER');
  for(const key of hashes)if(typeof raw[key]!=='string'||!HEX.test(raw[key]))fail('INVALID_DIGEST');
  return raw;
}
/**
 * Copy EXACT numerical indexed values without accessing user-controlled
 * Symbol.iterator, own buffer/length properties, or shadowed getters.
 */
export function snapshotIssuedScores(value){
  if(!value||typeof value!=='object'||utilTypes.isProxy(value))fail('SCORE_NOT_NATIVE');
  const proto=Object.getPrototypeOf(value);
  const format=proto===Float32Array.prototype?'f32be':proto===Float64Array.prototype?'f64be':null;
  if(format===null)fail('SCORE_WRONG_PROTOTYPE');
  // An attacker can assign Float32Array.prototype to a Uint32Array.
  // Prototype and byte width are insufficient; require native V8 float brand.
  const nativeFloat=utilTypes.isFloat32Array(value)?'f32be':
    utilTypes.isFloat64Array(value)?'f64be':null;
  if(nativeFloat!==format)fail('SCORE_NATIVE_BRAND_MISMATCH');
  const length=intrinsic.length.call(value),byteLen=intrinsic.byteLength.call(value);
  const byteOff=intrinsic.byteOffset.call(value),buffer=intrinsic.buffer.call(value);
  const bytesPer=format==='f32be'?4:8;
  if(length!==1728||byteLen!==1728*bytesPer||!Number.isInteger(byteOff))fail('SCORE_WRONG_SHAPE');
  if(!utilTypes.isArrayBuffer(buffer)||utilTypes.isSharedArrayBuffer(buffer))fail('SCORE_UNSAFE_BUFFER');
  if(abResizable?.call(buffer)===true||abDetached?.call(buffer)===true)fail('SCORE_RESIZABLE_OR_DETACHED');
  const keys=Reflect.ownKeys(value);
  if(keys.length!==1728||keys.some((k,i)=>typeof k!=='string'||k!==String(i)))fail('SCORE_SHADOW_OR_EXTRA_FIELDS');
  // Native numeric index descriptors are data descriptors. No callbacks.
  const clean=new (format==='f32be'?Float32Array:Float64Array)(1728);
  const binary=Buffer.alloc(1728*bytesPer);
  for(let i=0;i<1728;i++){
    const d=Object.getOwnPropertyDescriptor(value,String(i));
    if(!d||!Object.hasOwn(d,'value')||!d.enumerable||typeof d.value!=='number'||!Number.isFinite(d.value))fail('SCORE_INVALID_ELEMENT');
    clean[i]=d.value;
    if(format==='f32be')binary.writeFloatBE(clean[i],4*i);
    else binary.writeDoubleBE(clean[i],8*i);
  }
  // R15: Freeze the RECEIPT semantics, not only its outer object. Native
  // nonempty Float32/64 and Node Buffer cannot be Object.freeze'd; returning
  // them directly leaked mutable aliases of the committed numerical snapshot.
  // Each accessor yields a fresh native copy; retained lexical data is never
  // exposed. Existing R34/R35 read these properties synchronously and receive
  // exactly the same typed-array/Buffer interface with no model calls.
  const rawDigest=createHash('sha256').update(Buffer.from(`ATLAS-STRICT-ISSUED/${format}/v1\0`)).update(binary).digest('hex');
  return Object.freeze({
    get scores(){return new (format==='f32be'?Float32Array:Float64Array)(clean);},
    get beBytes(){return Buffer.from(binary);},
    format,rawDigest,scoreCount:1728
  });
}
