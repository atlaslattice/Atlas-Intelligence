import {expect,keys,id,number,ids,array,snapshot,store,random,sizeOf} from './a-common.mjs';

export const descriptor = Object.freeze({houseId:'H01',sphereId:'H01.S01',service:'physical_state_types',contractVersion:'1',supportKind:'SUPPORTING_CAPABILITY',scope:'Declared affine unit conversion with preserved frame and state; no empirical physical property validation.'});
const memory=store(descriptor.service);
function normalize(raw) {
  const d=snapshot(raw);keys(d,['units','frames','states']);array(d.units,'units',4096);expect(d.units.length>0,'No units declared');ids(d.frames,'frames',128);ids(d.states,'states',128);
  const seen=new Set();
  for(const u of d.units){keys(u,['unit','dimension','scale','offset']);id(u.unit,'unit');id(u.dimension,'dimension');number(u.scale,'scale',Number.MIN_VALUE,1e12);number(u.offset,'offset',-1e12,1e12);expect(!seen.has(u.unit),'Duplicate unit');seen.add(u.unit);}
  return d;
}
function request(raw){const r=snapshot(raw);keys(r,['quantity','toUnit','expectedDimension','targetFrame','targetState'],['quantity','toUnit']);keys(r.quantity,['value','unit','frame','state']);number(r.quantity.value,'value',-1e12,1e12);id(r.quantity.unit,'quantity unit');id(r.quantity.frame,'frame');id(r.quantity.state,'state');id(r.toUnit,'target unit');for(const k of ['expectedDimension','targetFrame','targetState'])if(k in r)id(r[k],k);return r;}
function convert(src,dst,r,frames,states) {
  expect(src && dst,'Unknown source or target unit');expect(src.dimension===dst.dimension,'Incompatible dimensions');
  expect(!r.expectedDimension||r.expectedDimension===src.dimension,'Expected dimension mismatch');
  expect(frames.includes(r.quantity.frame),'Unknown reference frame');expect(states.includes(r.quantity.state),'Unknown state');
  expect(!r.targetFrame||r.targetFrame===r.quantity.frame,'Undeclared frame transformation');expect(!r.targetState||r.targetState===r.quantity.state,'Undeclared state transformation');
  const value=(r.quantity.value*src.scale+src.offset-dst.offset)/dst.scale;expect(Number.isFinite(value),'Converted value overflows finite representation');
  return {kind:'quantity_conversion',value,unit:dst.unit,dimension:src.dimension,frame:r.quantity.frame,state:r.quantity.state,sourceUnit:src.unit};
}
export function prepare(dataset){const d=normalize(dataset);return memory.put({d,units:new Map(d.units.map(u=>[u.unit,u]))});}
export function reference(dataset,raw){const d=normalize(dataset),r=request(raw);return convert(d.units.find(u=>u.unit===r.quantity.unit),d.units.find(u=>u.unit===r.toUnit),r,d.frames,d.states);}
export function referenceQuery(prepared,raw){const {d}=memory.get(prepared),r=request(raw);let src,dst;for(const u of d.units){if(u.unit===r.quantity.unit)src=u;if(u.unit===r.toUnit)dst=u;}return convert(src,dst,r,d.frames,d.states);}
export function query(prepared,raw){const {d,units}=memory.get(prepared),r=request(raw);return convert(units.get(r.quantity.unit),units.get(r.toUnit),r,d.frames,d.states);}
export function fixture(seed=1,size=256){sizeOf(size,16,1024);const rng=random(seed),units=Array.from({length:size},(_,i)=>({unit:`u${i}`,dimension:`dimension${i%4}`,scale:1+(i%17),offset:0}));const dataset={units,frames:['laboratory','simulation'],states:['atomic','material','engineered']};const requests=Array.from({length:16},(_,i)=>{const a=Math.floor(rng()*size),choices=units.filter(u=>u.dimension===units[a].dimension);return {quantity:{value:1+i,unit:units[a].unit,frame:'simulation',state:'material'},toUnit:choices[Math.floor(rng()*choices.length)].unit};});return {dataset,requests};}
