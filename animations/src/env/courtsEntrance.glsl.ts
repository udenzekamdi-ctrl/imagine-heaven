// Environment 1 — Entering the Heavenly Courts
// Raymarched marble colonnade with arcades, colossal outer columns, polished marble floor with gold inlay,
// a sea of clouds below, drifting high clouds, a low golden sun, volumetric light shafts and floating motes.
export const courtsEntranceFrag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2  uRes;
uniform float uQuality; // 1.0 = final
varying vec2 vUv;

#define SUN normalize(vec3(0.42, 0.30, 1.0))
const float SP = 5.0;   // inner column spacing
const float CX = 3.6;   // inner arcade x
const float OX = 12.5;  // colossal columns x
const float OSP = 10.0;

float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3){ p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz+33.33); return fract((p3.xxy + p3.yxx)*p3.zyx); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x), mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<6;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7); a*=.5; } return s; }
float fbm5(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p+vec2(3.1,1.7); a*=.5; } return s; }
float fbm3(vec2 p){ float a=.5, s=0.; for(int i=0;i<3;i++){ s+=a*noise(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }

float sdBox(vec3 p, vec3 b){ vec3 q=abs(p)-b; return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.); }

float column(vec3 q, float r, float h){
  float rr = length(q.xz);
  if (rr > r*1.7 + 0.3) return rr - r*1.6;            // cheap bound
  float ang = atan(q.z, q.x);
  float flute = 0.035*r*smoothstep(0.2, 1.0, 0.5+0.5*cos(ang*24.0));
  float taper = 1.0 - 0.06*clamp(q.y/h, 0., 1.);
  float shaft = max(rr - (r*taper - flute), abs(q.y - h*.5) - h*.5);
  float plinth = sdBox(q - vec3(0., .16*r/.5, 0.), vec3(r*1.42, .16*r/.5, r*1.42)) - .02;
  float torus  = length(vec2(rr - r*1.13, q.y - .42*r/.5)) - .11*r/.5;
  float abacus = sdBox(q - vec3(0., h + .22*r/.5, 0.), vec3(r*1.45, .12*r/.5, r*1.45)) - .02;
  float echin  = length(vec2(rr - r*.98, q.y - (h - .02))) - .14*r/.5;
  return min(min(shaft, plinth), min(min(torus, abacus), echin));
}

// returns distance, material in y (0 marble architecture, 1 floor)
vec2 map(vec3 p){
  // inner arcade
  vec3 q = p; q.x = abs(q.x) - CX;
  float zc = mod(q.z + SP*.5, SP) - SP*.5;
  float d = column(vec3(q.x, q.y, zc), .5, 8.0);
  if (abs(q.x) < 3.0 && q.y > 7.0) {
    float wall = sdBox(vec3(q.x, q.y - 10.6, 0.), vec3(.48, 2.1, 1e3));
    float za = mod(q.z, SP) - SP*.5;
    float hole = length(vec2(za, q.y - 8.45)) - 1.78;
    wall = max(wall, -hole);
    float keystone = sdBox(vec3(q.x, q.y - 10.28, za), vec3(.52, .2, .14));
    float corn  = sdBox(vec3(q.x - .05, q.y - 12.85, 0.), vec3(.78, .14, 1e3)) - .02;
    float frieze= sdBox(vec3(q.x, q.y - 12.45, 0.), vec3(.6, .28, 1e3));
    d = min(d, min(min(wall, keystone), min(corn, frieze)));
  }
  // colossal outer columns
  vec3 o = p; o.x = abs(o.x) - OX;
  o.z = mod(o.z + OSP*.5, OSP) - OSP*.5;
  d = min(d, column(o, 1.15, 30.0));
  // floor slab
  float fl = sdBox(p - vec3(0., -.6, 0.), vec3(16., .6, 1e4));
  // steps descending at the edges into the clouds
  fl = min(fl, sdBox(p - vec3(0., -1.4, 0.), vec3(17.2, .6, 1e4)));
  fl = min(fl, sdBox(p - vec3(0., -2.2, 0.), vec3(18.4, .6, 1e4)));
  return fl < d ? vec2(fl, 1.) : vec2(d, 0.);
}

vec3 calcNormal(vec3 p){
  const vec2 k = vec2(1,-1); float h = .002;
  return normalize(k.xyy*map(p+k.xyy*h).x + k.yyx*map(p+k.yyx*h).x + k.yxy*map(p+k.yxy*h).x + k.xxx*map(p+k.xxx*h).x);
}

vec2 march(vec3 ro, vec3 rd, float tmax, int steps){
  float t = .05; float m = -1.;
  for (int i=0; i<160; i++){
    if (i >= steps) break;
    vec2 h = map(ro + rd*t);
    if (h.x < .0015*t) { m = h.y; break; }
    t += h.x * .85;
    if (t > tmax) break;
  }
  if (m < -.5 && t < 40.) { vec2 h = map(ro + rd*t); if (h.x < .01 + .002*t) m = h.y; }
  return vec2(t, m);
}

float softShadow(vec3 ro, vec3 rd, float k){
  float res = 1.; float t = .04;
  for (int i=0; i<28; i++){
    float h = map(ro + rd*t).x;
    res = min(res, k*h/t);
    t += clamp(h, .05, 1.6);
    if (res < .002 || t > 40.) break;
  }
  return clamp(res, 0., 1.);
}
// Analytic sun visibility for the light shafts. The colonnade is perfectly regular, so instead of
// raymarching the SDF (was ~50% of the frame cost) intersect the sun ray with each row's plane
// (x = ±CX, ±OX) and test the nearest column / arcade wall there. Soft edges = soft shafts.
float rowOcc(vec3 p, float X, float sp, float r, float h, float hasWall){
  float s = (X - p.x)/SUN.x;
  if (s <= 0.) return 0.;
  vec3 c = p + SUN*s;
  float dx = abs(SUN.x)/length(SUN.xz);          // perpendicular distance factor in plan
  float zc = mod(c.z + sp*.5, sp) - sp*.5;
  float occ = smoothstep(r + .12, r - .12, abs(zc)*dx) * step(c.y, h);
  if (hasWall > .5 && c.y > 8.2 && c.y < 13.0) {
    float za = mod(c.z, sp) - sp*.5;
    float hole = length(vec2(za, c.y - 8.45)) - 1.78;
    occ = max(occ, smoothstep(-.15, .15, hole));
  }
  return occ;
}
float sunVis(vec3 p){
  float o = rowOcc(p, CX, SP, .55, 8.6, 1.);
  o = max(o, rowOcc(p, -CX, SP, .55, 8.6, 1.));
  o = max(o, rowOcc(p, OX, OSP, 1.2, 30.5, 0.));
  o = max(o, rowOcc(p, -OX, OSP, 1.2, 30.5, 0.));
  return 1. - o;
}
float ao(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for (int i=1; i<=4; i++){ float h = .12*float(i); o += (h - map(p + n*h).x)*s; s *= .7; }
  return clamp(1. - 1.6*o, 0., 1.);
}

vec3 sunCol(){ return vec3(1.0, .80, .52); }

vec3 sky(vec3 ro, vec3 rd){
  float sd = max(dot(rd, SUN), 0.);
  vec3 zen = vec3(.42, .58, .80);
  vec3 hor = vec3(1.0, .88, .70);
  vec3 col = mix(hor, zen, pow(clamp(rd.y*1.4 + .08, 0., 1.), .7));
  col += sunCol()*(pow(sd, 6.)*.45 + pow(sd, 40.)*.6);
  col += vec3(1., .95, .85)*pow(sd, 900.)*6.;
  // high cirrus / cumulus layer drifting
  if (rd.y > 0.0) {
    float t = (140. - ro.y)/max(rd.y, .02);
    vec2 uv = (ro.xz + rd.xz*t)*.0032 + vec2(uTime*.004, uTime*.0016);
    float c = fbm(uv*3.0);
    float dens = smoothstep(.48, .85, c) * smoothstep(.0, .25, rd.y);
    vec3 cl = mix(vec3(1., .96, .9), sunCol()*1.25, pow(sd, 4.));
    cl += vec3(1., .85, .6)*pow(sd, 18.)*(1. - dens)*.8;   // silver lining
    col = mix(col, cl, dens*.85);
  } else {
    // sea of clouds below the courts
    float t = (-14. - ro.y)/rd.y;
    vec2 uv = (ro.xz + rd.xz*t)*.012 + vec2(uTime*.006, uTime*.010);
    float c = fbm(uv);
    float c2 = fbm(uv*2.3 + 4.0 + uTime*.004);
    float shade = .55 + .45*smoothstep(.3, .8, c*.6 + c2*.4);
    vec3 cl = mix(vec3(.86, .82, .86), vec3(1., .94, .84), shade);
    cl += sunCol()*pow(sd, 5.)*.5*shade;
    float fade = exp(-t*.0022);
    col = mix(mix(hor*1.02, col, .2), cl, fade*.95);
  }
  return col;
}

vec3 marbleAlbedo(vec3 p, float isFloor){
  vec2 uv = isFloor > .5 ? p.xz : vec2(p.y, p.x + p.z);
  float v = fbm5(uv*.35 + fbm3(uv*.8)*2.2);
  float vein = (smoothstep(.02, .0, abs(v - .52))*.22 + smoothstep(.05, .0, abs(v - .38))*.10) * (isFloor > .5 ? 1. : .55);
  vec3 base = vec3(.93, .91, .87);
  base -= vein*vec3(.20, .21, .25);
  base *= .97 + .05*noise(uv*6.);
  return base;
}

vec3 shade(vec3 ro, vec3 rd, vec2 hit, bool lite, out vec3 pos, out vec3 nor){
  pos = ro + rd*hit.x; nor = calcNormal(pos);
  vec3 alb = marbleAlbedo(pos, hit.y);
  float goldMask = 0.;
  if (hit.y > .5 && pos.y > -0.05) {
    // floor tiles 2.5 m with fine gold inlay lines + central runner
    vec2 g = abs(fract(pos.xz/2.5) - .5);
    float line = smoothstep(.012, .0, .5 - max(g.x, g.y));
    float runner = smoothstep(.03, .0, abs(abs(pos.x) - 1.6));
    goldMask = max(line, runner);
    float chk = mod(floor(pos.x/2.5) + floor(pos.z/2.5), 2.);
    alb *= .96 + .04*chk;
  }
  // gilded capitals / keystones
  if (hit.y < .5) {
    float isCap = smoothstep(7.85, 7.95, pos.y) * (1. - smoothstep(8.45, 8.55, pos.y)) * step(abs(abs(pos.x) - CX), 1.);
    float inArc = step(abs(abs(pos.x) - CX), 1.);
    float isKey = smoothstep(10.05, 10.1, pos.y) * (1. - smoothstep(10.48, 10.52, pos.y)) * inArc;
    float isFrieze = smoothstep(12.15, 12.2, pos.y) * (1. - smoothstep(12.72, 12.75, pos.y)) * inArc;
    goldMask = max(isCap*.85, max(isKey*.8, isFrieze*.35));
  }
  vec3 gold = vec3(.86, .66, .34);
  alb = mix(alb, gold, goldMask);

  float sh = lite ? 1. : softShadow(pos + nor*.01, SUN, 9.);
  float dif = clamp(dot(nor, SUN), 0., 1.) * sh;
  float occ = lite ? 1. : ao(pos, nor);
  float skyL = .5 + .5*nor.y;
  float bounce = clamp(-nor.y, 0., 1.)*.6 + clamp(dot(nor, normalize(vec3(-SUN.x, 0., -SUN.z))), 0., 1.)*.25;
  vec3 lin = sunCol()*3.1*dif;
  lin += vec3(.62, .70, .86)*.75*skyL*occ;
  lin += vec3(1., .88, .72)*.55*bounce*occ;     // warm light bounced off marble
  vec3 col = alb*lin;
  // specular (gold more metallic)
  vec3 h = normalize(SUN - rd);
  float spe = pow(clamp(dot(nor, h), 0., 1.), mix(40., 90., goldMask)) * dif;
  if (!lite) col += mix(vec3(.25), gold*1.8, goldMask)*spe*1.5;
  return col;
}

vec3 render(vec3 ro, vec3 rd, vec2 fragCoord){
  vec2 hit = march(ro, rd, 220., int(130.*uQuality));
  vec3 col; float tHit = hit.x;
  if (hit.y < -.5) { col = sky(ro, rd); tHit = 400.; }
  else {
    vec3 pos, nor;
    col = shade(ro, rd, hit, false, pos, nor);
    if (hit.y > .5 && pos.y > -.05) {
      // polished floor: glossy reflection
      vec3 rr = reflect(rd, nor);
            vec2 rh = march(pos + nor*.02, rr, 90., int(56.*uQuality));
      vec3 rc;
      if (rh.y < -.5) rc = sky(pos, rr);
      else { vec3 p2, n2; rc = shade(pos + nor*.02, rr, rh, true, p2, n2); rc = mix(rc, vec3(1., .9, .76), 1. - exp(-rh.x*.02)); }
      float fre = .05 + .45*pow(1. - clamp(dot(-rd, nor), 0., 1.), 5.);
      col = mix(col, rc, fre*1.25);
    }
  }
  // atmospheric perspective
  float sd = max(dot(rd, SUN), 0.);
  vec3 fogC = mix(vec3(.96, .90, .82), vec3(1.0, .86, .62), pow(sd, 4.));
  float fog = 1. - exp(-tHit*.0105);
  if (hit.y > -.5) col = mix(col, fogC, fog);
  // low mist hugging the floor, slowly rolling
  float mist = exp(-max(ro.y + rd.y*min(tHit, 60.), 0.)*.9) * .16 * (0.7 + 0.3*fbm3(vec2(ro.z*.05 + uTime*.02, rd.x*3.)));
  col = mix(col, fogC, clamp(mist, 0., .25));

  // volumetric light shafts through the colonnade
  float jit = hash12(fragCoord);
  float L = min(tHit, 70.); float acc = 0.;
  const int NS = 14;
  for (int i=0; i<NS; i++){
    float s = (float(i) + jit)/float(NS);
    float tt = L*s*s;
    vec3 pp = ro + rd*tt;
    float dens = exp(-max(pp.y, 0.)*.07);
    acc += sunVis(pp)*dens;
  }
  acc /= float(NS);
  float phase = .25 + 1.3*pow(sd, 5.) + .5*pow(sd, 30.);
  col += sunCol()*acc*phase*(1. - exp(-L*.03))*.55;

  // floating motes of light
  for (int k=0; k<6; k++){
    float d = 1.2 + float(k)*1.9;
    if (d > tHit) break;
    vec3 pp = ro + rd*d;
    vec3 drift = vec3(uTime*.035, sin(uTime*.05)*.2 + uTime*.02, 0.);
    vec3 cs = vec3(1.4);
    vec3 cell = floor((pp + drift)/cs);
    vec3 rnd = hash33(cell);
    if (rnd.x < .55) continue;
    vec3 m = (cell + .3 + .4*hash33(cell + 7.))*cs - drift;
    m += .08*vec3(sin(uTime*.4 + rnd.y*6.), cos(uTime*.33 + rnd.z*6.), 0.);
    vec3 v = m - ro;
    float along = dot(v, rd);
    float perp = length(v - rd*along);
    float r = .010 + .008*rnd.y;
    float tw = .6 + .4*sin(uTime*(.6 + rnd.z) + rnd.x*20.);
    col += vec3(1., .9, .7)*smoothstep(r, 0., perp)*tw*.55*exp(-along*.08);
  }
  return col;
}

vec3 aces(vec3 x){ const float a=2.51, b=.03, c=2.43, d=.59, e=.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0., 1.); }

void main(){
  vec2 fragCoord = vUv*uRes;
  vec2 p = (2.*fragCoord - uRes)/uRes.y;
  float t = uTime;
  // slow, continuous forward travel; gentle lift and drift, never jerky
  float ease = smoothstep(0., 14., t);
  float z = t*.82 + 2.5;
  vec3 ro = vec3(.55*sin(t*.031) , 1.35 + .45*ease + .06*sin(t*.11), z);
  float pitch = mix(.32, .07, ease) + .03*sin(t*.023);
  vec3 ta = ro + vec3(.9*sin(t*.027 + 1.), pitch*6., 6.);
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0,1,0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(p.x*uu + p.y*vv + 1.55*ww);

  vec3 col = render(ro, rd, fragCoord);

  // bloom-like glow around the sun
  float sd = max(dot(rd, SUN), 0.);
  col += vec3(1., .82, .55)*pow(sd, 14.)*.35;

  // grade: gentle exposure, filmic curve, warm highlights / cool-ivory shadows
  col *= .86;
  col = aces(col);
  col = mix(col, col*col*(3. - 2.*col), .22);
  col = pow(col, vec3(.95, .97, 1.02));
  float lum = dot(col, vec3(.299, .587, .114));
  col = mix(col, col*vec3(1.03, 1.0, .95), smoothstep(.4, 1., lum));
  col = mix(vec3(lum), col, .92);
  // vignette
  vec2 q = vUv;
  col *= .72 + .28*pow(16.*q.x*q.y*(1.-q.x)*(1.-q.y), .22);
  // fine film grain
  col += (hash12(fragCoord + fract(uTime*17.3)*500.) - .5)*.018;
  gl_FragColor = vec4(clamp(col, 0., 1.), 1.);
}
`;

export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;
