/* Frostbite Mountain reusable geometry + boost/jump mechanics.
   Standalone ES module; integration into existing engine is deliberately opt-in. */
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function sampleCatmullRom(points,segmentsPerSpan=12,closed=true){
  const out=[],n=points.length;
  for(let i=0;i<(closed?n:n-1);i++){
    const p0=points[(i-1+n)%n],p1=points[i],p2=points[(i+1)%n],p3=points[(i+2)%n];
    for(let j=0;j<segmentsPerSpan;j++){
      const t=j/segmentsPerSpan,t2=t*t,t3=t2*t;
      const blend=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t3);
      out.push({x:blend('x'),y:blend('y'),z:blend('z'),bank:blend('bank'),width:blend('width')});
    }
  }
  if(!closed)out.push({...points[n-1]});
  return out;
}
export function roadMeshData(samples,{closed=true}={}){
  const vertices=[],indices=[],length=samples.length;
  for(let i=0;i<length;i++){
    const a=samples[(i-1+length)%length],b=samples[(i+1)%length];
    const dx=b.x-a.x,dz=b.z-a.z,mag=Math.hypot(dx,dz)||1;
    const nx=-dz/mag,nz=dx/mag,half=samples[i].width/2,bank=Math.tan(samples[i].bank*Math.PI/180);
    for(const side of [-1,1])vertices.push(samples[i].x+side*nx*half,samples[i].y+side*bank*half,samples[i].z+side*nz*half);
    if(i>0){const k=i*2;indices.push(k-2,k-1,k,k-1,k+1,k);}
  }
  if(closed){const k=(length-1)*2;indices.push(k,k+1,0,k+1,1,0);}
  return {vertices,indices};
}
export function createBoostPad({x,z,radius=5,strength=1.3,duration=1.15,cooldown=1.5}){
  return {x,z,radius,strength,duration,cooldown,lastHit:-Infinity};
}
export function updateBoostPads(vehicle,pads,time){
  for(const pad of pads){
    if(Math.hypot(vehicle.x-pad.x,vehicle.z-pad.z)>pad.radius||time-pad.lastHit<pad.cooldown)continue;
    pad.lastHit=time;
    vehicle.padBoost={multiplier:pad.strength,remaining:pad.duration};
    return pad;
  }
  return null;
}
export function tickPadBoost(vehicle,dt){
  if(!vehicle.padBoost)return 1;
  vehicle.padBoost.remaining=Math.max(0,vehicle.padBoost.remaining-dt);
  if(vehicle.padBoost.remaining===0){vehicle.padBoost=null;return 1;}
  return vehicle.padBoost.multiplier;
}
export function canClearJump({speed,driftBoostActive,minimumSpeed=38}){
  return Boolean(driftBoostActive&&speed>=minimumSpeed);
}
export function updateAirborne(vehicle,dt,{gravity=28,groundHeight,resetHeight=-25,onReset}){
  if(!vehicle.airborne)return;
  vehicle.verticalVelocity-=gravity*dt;
  vehicle.y+=vehicle.verticalVelocity*dt;
  const surface=groundHeight(vehicle.x,vehicle.z);
  if(surface!==null&&surface!==undefined&&vehicle.verticalVelocity<=0&&vehicle.y<=surface){
    vehicle.y=surface;vehicle.verticalVelocity=0;vehicle.airborne=false;return;
  }
  if(vehicle.y<resetHeight){vehicle.airborne=false;vehicle.verticalVelocity=0;onReset(vehicle);}
}
export function launchJump(vehicle,{verticalImpulse=12}={}){
  vehicle.airborne=true;vehicle.verticalVelocity=verticalImpulse;
}
