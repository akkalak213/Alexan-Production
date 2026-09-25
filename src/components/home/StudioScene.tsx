/**
 * ฉากสตูดิโอ — เป็นพื้นห้องของทั้ง section ไม่ใช่รูปที่แปะไว้ข้าง ๆ ข้อความ
 *
 * ภาษาภาพ
 *   ของทุกชิ้นเป็นเงาทึบสีเข้มกว่าห้องเล็กน้อย มีเส้นขอบบางมาก ไม่ใช่ลายเส้นสว่างล้วน
 *   ความเป็นสามมิติมาจาก "แสงขอบ" ตามทิศไฟจริงในฉาก: ด้านที่หันหาไฟคีย์ (ซ้าย) ติดขอบอุ่น
 *   ด้านที่หันหาไฟฟิลล์ (ขวา) ติดขอบเย็น ช่างภาพที่ยืนหลังไฟติดขอบเย็นจากจอมอนิเตอร์ด้านหลัง
 *   สีสว่างจัดมีแค่หน้าไฟ แสงแฟลช และตัวสินค้า สายตาจึงวิ่งไปที่ของบนโต๊ะเสมอ
 *
 * แยกเป็นชั้นความลึกหลายแผ่น แต่ละแผ่นเป็น <svg> viewBox เดียวกัน ภาพจึงประกบกันพอดีตอนนิ่ง
 * แล้วให้ studio-motion.ts (GSAP) ขยับแต่ละชั้นคนละระยะตามเมาส์และการเลื่อน ได้ความลึกแบบ 2.5 มิติ
 * ของที่ต้องขยับไปด้วยกันอยู่แผ่นเดียวกันเสมอ เช่น หัวแฟลช แสงวาบ และแสงแฟลชทั่วห้อง
 * ไม่งั้นพอแผ่นเลื่อนคนละระยะ แสงจะออกมาจากจุดที่ไม่ใช่หัวแฟลช
 *
 * ถ้า JavaScript ไม่มาหรือผู้ใช้ปิดการเคลื่อนไหว ฉากที่เห็นคือสภาพ "ไฟเปิดครบ" นิ่ง ๆ
 * ทุกอย่างที่ต้องซ่อนไว้ก่อน (แสงแฟลช กรอบโฟกัส รูปที่ลอยออกมา) ซ่อนด้วย CSS ไม่ใช่ด้วยสคริปต์
 *
 * กติกาที่ยึด
 *   ทุกชิ้นที่ตั้งบนพื้นวัดจาก GROUND ค่าเดียว มาตราส่วน 100 หน่วยเท่ากับ 1 เมตร
 *     ช่างภาพสูง 1.77 (โน้มตัวเข้าหาช่องมองภาพ) โต๊ะถ่ายสูง 0.78 จอมอนิเตอร์ 32 นิ้ว
 *     กล้อง แฟลช และของบนโต๊ะขยายเกินจริงโดยตั้งใจ ไม่งั้นเล็กจนมองไม่ออกว่าคืออะไร
 *   ตาของช่างภาพอยู่ที่ช่องมองภาพ นิ้วอยู่บนปุ่มชัตเตอร์ มืออีกข้างรองใต้เลนส์
 *   โคมไฟคำนวณในระบบพิกัดของตัวเองแล้วหมุนตามทิศเล็ง ลำแสงเริ่มจากหน้ากระจายแสงที่คำนวณได้จริง
 *   id ทุกตัวขึ้นต้นด้วย ss- และอ้างข้ามแผ่นได้ (ทั้งหน้ามีฉากนี้ฉากเดียว)
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** เส้นพื้นห้อง ทุกชิ้นที่ตั้งอยู่บนพื้นต้องจบที่ค่านี้ */
const GROUND = 296

/** ใต้เส้นพื้นมีพื้นเงาอีกแถบ ไว้ให้เงาสะท้อนของโต๊ะและช่างภาพ */
const VIEW_H = 344

/** สะท้อนรอบเส้นพื้น — y ใหม่ = 2·GROUND − y */
const MIRROR = `matrix(1 0 0 -1 0 ${GROUND * 2})`

/** ความสูงจริง หน่วยเป็นเมตร คูณ 100 เป็นหน่วยใน viewBox */
const m = (meters: number) => Math.round(GROUND - meters * 100)

type Pt = [number, number]

const f1 = (n: number) => n.toFixed(1)

const poly = (pts: Pt[], close = true) =>
  `M ${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L ')}${close ? ' Z' : ''}`

/** แท่งเรียวจาก a ไป b กว้าง w0 ที่ต้น w1 ที่ปลาย — ขาขาตั้ง เสา แขนบูม */
function taper([ax, ay]: Pt, [bx, by]: Pt, w0: number, w1 = w0) {
  const len = Math.hypot(bx - ax, by - ay)
  const nx = -(by - ay) / len
  const ny = (bx - ax) / len
  return poly([
    [ax + (nx * w0) / 2, ay + (ny * w0) / 2],
    [bx + (nx * w1) / 2, by + (ny * w1) / 2],
    [bx - (nx * w1) / 2, by - (ny * w1) / 2],
    [ax - (nx * w0) / 2, ay - (ny * w0) / 2],
  ])
}

/** จุดบนเส้นตรง a→b ที่สัดส่วน t */
const lerp = ([ax, ay]: Pt, [bx, by]: Pt, t: number): Pt => [ax + (bx - ax) * t, ay + (by - ay) * t]

/**
 * สีของฉาก — ฉากอยู่ใน .studio-panel ซึ่งมืดเสมอทั้งโหมดสว่างและมืด จึงใช้ค่าคงที่ได้
 * สีสว่างที่อ่านจาก token มีแค่ accent (ไฟอุ่น) ที่ต้องตรงกับสีแบรนด์ทั้งเว็บ
 */
const C = {
  body: 'hsl(240 7% 14%)',
  bodyHi: 'hsl(240 6% 19%)',
  deep: 'hsl(240 9% 8%)',
  edge: 'hsl(40 14% 82% / 0.26)',
  edgeSoft: 'hsl(40 14% 82% / 0.13)',
  metal: 'hsl(240 4% 30%)',
  metalHi: 'hsl(240 5% 56%)',
  warm: 'hsl(var(--accent))',
  cool: 'hsl(206 72% 70%)',
  hot: '#fff4e2',
  skin: 'hsl(22 18% 26%)',
  hair: 'hsl(240 9% 6%)',
  jacket: 'hsl(240 7% 15%)',
  trousers: 'hsl(240 8% 10%)',
  sandbag: 'hsl(30 8% 14%)',
}

/**
 * โคมไฟหนึ่งดวง คำนวณทุกชิ้นส่วนในระบบพิกัดของตัวโคม
 * หันไปทาง +x แล้วหมุนไปตามทิศที่เล็งตัวแบบ ชิ้นส่วนจึงประกอบกันสนิทเสมอไม่ว่าจะเล็งไปทางไหน
 * จุดยึดอยู่กึ่งกลางกล่องหัวไฟ ปลายเสาจึงมาจบใต้หัวไฟพอดี ซึ่งเป็นตำแหน่งที่ขาตั้งจับจริง
 */
const HEAD_HALF = 14
const RING_AT = 14
const BODY_AT = 20

function lamp(x: number, top: number, aim: Pt, depth: number, half: number) {
  const th = Math.atan2(aim[1] - top, aim[0] - x)
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  const at = (lx: number, ly: number): Pt => [x + lx * cos - ly * sin, top + lx * sin + ly * cos]
  const front = BODY_AT + depth

  return {
    at,
    dir: [cos, sin] as Pt,
    head: poly([at(-HEAD_HALF, -11), at(HEAD_HALF, -11), at(HEAD_HALF, 11), at(-HEAD_HALF, 11)]),
    ring: poly([at(RING_AT, -14), at(BODY_AT, -14), at(BODY_AT, 14), at(RING_AT, 14)]),
    body: poly([at(BODY_AT, -14), at(front, -half), at(front, half), at(BODY_AT, 14)]),
    /** ตะเข็บกลางผ้า — เห็นก้านโครงซอฟต์บ็อกซ์ ช่วยให้อ่านเป็นกล่องผ้า ไม่ใช่สามเหลี่ยมแบน */
    seam: `M ${f1(at(BODY_AT, 0)[0])} ${f1(at(BODY_AT, 0)[1])} L ${f1(at(front - 9, 0)[0])} ${f1(at(front - 9, 0)[1])}`,
    diffuser: poly([at(front - 9, -half + 3), at(front, -half), at(front, half), at(front - 9, half - 3)]),
    faceTop: at(front, -half),
    faceBot: at(front, half),
    faceMid: at(front, 0),
    backMid: at(BODY_AT, 0),
  }
}

/** ลากขอบลำแสงจากมุมหน้าโคมไปตามทิศเล็ง จนชนพื้นหรือครบระยะที่กำหนด */
function beamOf(faceTop: Pt, faceBot: Pt, dir: Pt, maxLen = 999) {
  const reach = ([px, py]: Pt): Pt => {
    const t = Math.min(dir[1] > 0.01 ? (GROUND - py) / dir[1] : Infinity, maxLen)
    return [px + dir[0] * t, py + dir[1] * t]
  }
  const endTop = reach(faceTop)
  const endBot = reach(faceBot)
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  return { d: poly([faceTop, endTop, endBot, faceBot]), from: mid(faceTop, faceBot), to: mid(endTop, endBot) }
}

const PRODUCT_X = 830
const TABLE = m(0.78)

// เสาถอยหลังเล็กน้อยเพื่อชดเชยที่ตัวผ้าขยับไปข้างหน้า ตัวซอฟต์บ็อกซ์จึงอยู่ที่เดิม
const KEY_X = 542
const FILL_X = 1348
const key = lamp(KEY_X, 92, [PRODUCT_X, 236], 58, 44)
const fill = lamp(FILL_X, 96, [886, 240], 48, 34)
const keyBeam = beamOf(key.faceTop, key.faceBot, key.dir)
const fillBeam = beamOf(fill.faceTop, fill.faceBot, fill.dir)

/**
 * แผ่นสะท้อนแสงกลมสีทอง 0.9 เมตร บนขาตั้งพร้อมแขนจับ หันหน้าเข้าหาสินค้า
 * มองจากด้านข้างจึงเห็นเป็นวงรีแคบ เอียงลงนิดหนึ่งไปทางโต๊ะ
 */
const REF_X = 1156
const REF_TOP = 206
const REF_C: Pt = [1126, 200]
const REF_TILT = -8
const REF_R = 45
const refTilt = (REF_TILT * Math.PI) / 180
const refTop: Pt = [REF_C[0] + REF_R * Math.sin(refTilt), REF_C[1] - REF_R * Math.cos(refTilt)]
const refBot: Pt = [REF_C[0] - REF_R * Math.sin(refTilt), REF_C[1] + REF_R * Math.cos(refTilt)]
const refDir: Pt = (() => {
  const dx = 860 - REF_C[0]
  const dy = 214 - REF_C[1]
  const len = Math.hypot(dx, dy)
  return [dx / len, dy / len]
})()
const bounce = beamOf(refTop, refBot, refDir, 245)

/**
 * ขาบูม (C-stand) เสาตั้งทางขวาแล้วยื่นแขนข้ามมาเหนือสินค้า ปลายอีกข้างแขวนถุงทรายถ่วง
 * ตั้งทางขวาเพราะถ้าตั้งทางซ้ายเสาจะไปขวางลำแสงของไฟคีย์พอดี
 * แขนทั้งเส้นเป็นเส้นตรงเดียวผ่านหัวจับ ปลายหน้าอยู่ตรงกลางสินค้าพอดี
 */
const BOOM_X = 1020
const BOOM_HEAD: Pt = [BOOM_X, 100]
const BOOM_TIP: Pt = [PRODUCT_X, 36]
const BOOM_TAIL: Pt = lerp(BOOM_TIP, BOOM_HEAD, 1 + 62 / Math.hypot(BOOM_HEAD[0] - BOOM_TIP[0], BOOM_HEAD[1] - BOOM_TIP[1]))

/** ไฟบูมเป็นสตริปซอฟต์บ็อกซ์ห้อยใต้ปลายแขน หน้ากระจายแสงอยู่ด้านล่าง ส่องลงตรง ๆ */
const STRIP = { left: 772, right: 888, top: 62, face: 80 }

/**
 * หัวแฟลชเงยขึ้น 35 องศาไปทางสินค้า หมุนรอบคอหมุนที่ (345.3,121)
 * หน้าเลนส์แฟลช แสงวาบ และแสงทั่วห้องคำนวณจากจุดเดียวกัน (FLASH.fire) และอยู่แผ่นเดียวกัน
 */
const FLASH = (() => {
  const pivot: Pt = [345.3, 121]
  const th = (-35 * Math.PI) / 180
  const at = (lx: number, ly: number): Pt => [
    pivot[0] + lx * Math.cos(th) - ly * Math.sin(th),
    pivot[1] + lx * Math.sin(th) + ly * Math.cos(th),
  ]
  const fire = at(11.2, 0)
  const ray = (deg: number, r0: number, r1: number) => {
    const t = th + (deg * Math.PI) / 180
    return `M ${f1(fire[0] + Math.cos(t) * r0)} ${f1(fire[1] + Math.sin(t) * r0)} L ${f1(fire[0] + Math.cos(t) * r1)} ${f1(fire[1] + Math.sin(t) * r1)}`
  }
  return {
    head: poly([at(-0.8, -4.6), at(10, -4.6), at(10, 4.6), at(-0.8, 4.6)]),
    face: `M ${f1(at(10.5, -4)[0])} ${f1(at(10.5, -4)[1])} L ${f1(at(10.5, 4)[0])} ${f1(at(10.5, 4)[1])}`,
    fire,
    rays: [ray(-38, 10, 19), ray(-14, 11, 23), ray(10, 11, 23), ray(34, 10, 19)].join(' '),
  }
})()

/** ขาตั้งกล้อง: หัวแพนอยู่ใต้ตัวกล้อง ขาสามขา ขาไกลสุดวาดเข้มกว่าและเล็กกว่า */
const TRIPOD_APEX: Pt = [348, 169.5]
const TRIPOD_FEET = { back: [313, 295] as Pt, front: [386, 295] as Pt, far: [354, 293] as Pt }

/** รถเข็นจอมอนิเตอร์ จอ 32 นิ้ว (0.76 × 0.44 เมตร) หันหน้าออกมาหาคนดู */
const MONITOR = { x: 196, left: 158, right: 234, top: 144, bottom: 188 }

/** กรอบภาพที่กล้องถ่ายได้ ใช้ทั้งภาพบนจอมอนิเตอร์และรูปที่ลอยออกมา */
const STILL_VIEW = '742 110 176 97'

/**
 * ของบนโต๊ะ: แท่นหมุนกลางโต๊ะ ขวดน้ำหอมบนแท่น กระปุกครีมทางซ้าย กล่องของขวัญทางขวา
 * แท่นหมุนหนา 4 หน่วย ขอบหน้าจบที่ผิวโต๊ะ ขวดตั้งบนกึ่งกลางผิวแท่น
 */
const TURNTABLE_TOP = TABLE - 10
const BOTTLE_BASE = TURNTABLE_TOP
const BOTTLE_BODY = `M 810 ${BOTTLE_BASE} Q 807 ${BOTTLE_BASE} 807 ${BOTTLE_BASE - 3} V 163 C 807 155.5 812 151 819.5 151 H 840.5 C 848 151 853 155.5 853 163 V ${BOTTLE_BASE - 3} Q 853 ${BOTTLE_BASE} 850 ${BOTTLE_BASE} Z`

/**
 * ระดับความลึกของแต่ละแผ่น 0 = ไกลสุด (ผนัง) 1 = ใกล้สุด (ช่างภาพ)
 * studio-motion.ts อ่านค่านี้จาก data-depth แล้วขยับแผ่นใกล้มากกว่าแผ่นไกล
 */
const DEPTH = { room: 0.12, rig: 0.5, set: 0.68, crew: 1 } as const

function Layer({ depth, className, children }: { depth: number; className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox={`0 0 1440 ${VIEW_H}`}
      preserveAspectRatio="xMidYMax slice"
      className={cn('studio-layer', className)}
      data-depth={depth}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {children}
    </svg>
  )
}

/** เงาสัมผัสพื้นใต้ของที่ตั้งบนพื้น */
function Contact({ x, rx, ry = 5 }: { x: number; rx: number; ry?: number }) {
  return <ellipse cx={x} cy={GROUND} rx={rx} ry={ry} fill="url(#ss-shadow)" />
}

/**
 * ขาตั้งไฟ: ท่อบนเล็ก ท่อล่างใหญ่ (ยืดหดได้) ตัวล็อกตรงรอยต่อ ขาสามขาพร้อมค้ำ
 * sandbag = ถุงทรายพาดขาข้างที่ระบุ ซึ่งสตูดิโอจริงวางกันไฟหนักหน้าคว่ำ
 */
function LightStand({ x, top, sandbag }: { x: number; top: number; sandbag?: 'left' | 'right' }) {
  const hub = GROUND - 32
  const joint = top + (hub - top) * 0.46
  const spread = 30
  const bagX = sandbag === 'left' ? x - 20 : x + 20
  return (
    <g>
      <path d={taper([x, hub], [x + 7, GROUND - 3], 2.2, 1.6)} fill="hsl(240 5% 17%)" />
      <path d={taper([x, top], [x, joint], 2.2)} fill="url(#ss-metal)" />
      <path d={taper([x, joint], [x, hub + 2], 3.4)} fill="url(#ss-metal)" />
      <rect x={x - 3.2} y={joint - 1.5} width="6.4" height="5" rx="1.2" fill={C.metal} stroke={C.edgeSoft} />
      <path d={`M ${x + 3.2} ${joint + 1} h 3.5`} stroke={C.metalHi} strokeWidth="1.4" strokeLinecap="round" />
      <path d={`M ${x} ${hub - 16} L ${x - spread / 2} ${GROUND - 15} M ${x} ${hub - 16} L ${x + spread / 2} ${GROUND - 15}`} stroke={C.metal} strokeWidth="1.2" />
      <path d={taper([x, hub], [x - spread, GROUND - 0.5], 2.8, 2)} fill="url(#ss-metal)" />
      <path d={taper([x, hub], [x + spread, GROUND - 0.5], 2.8, 2)} fill="url(#ss-metal)" />
      <rect x={x - 3.6} y={hub - 3} width="7.2" height="7" rx="1.5" fill={C.body} stroke={C.edgeSoft} />
      {sandbag && (
        <g>
          <path
            d={`M ${bagX - 13} ${GROUND - 0.5} C ${bagX - 13.5} ${GROUND - 6.5} ${bagX - 7} ${GROUND - 9} ${bagX} ${GROUND - 9} C ${bagX + 7} ${GROUND - 9} ${bagX + 13.5} ${GROUND - 6.5} ${bagX + 13} ${GROUND - 0.5} Z`}
            fill={C.sandbag}
            stroke={C.edgeSoft}
          />
          <path d={`M ${bagX - 4} ${GROUND - 8.8} Q ${bagX} ${GROUND - 13} ${bagX + 4} ${GROUND - 8.8}`} stroke="hsl(30 8% 24%)" strokeWidth="1.2" />
        </g>
      )}
    </g>
  )
}

type Lamp = ReturnType<typeof lamp>

/**
 * ซอฟต์บ็อกซ์: หัวแฟลชสตูดิโอ สปีดริง ผ้าทรงกล่อง และหน้ากระจายแสงที่เรืองอยู่
 * ผ้าไล่จากเข้มที่สปีดริงไปสว่างขึ้นที่หน้าไฟ เหมือนแสงจากข้างในลอดผ้าออกมา
 */
function Softbox({ l, tone, name }: { l: Lamp; tone: 'warm' | 'cool'; name: 'key' | 'fill' }) {
  const glow = tone === 'warm' ? C.warm : C.cool
  const led = l.at(-HEAD_HALF + 4, -6)
  return (
    <g>
      <defs>
        <linearGradient id={`ss-fabric-${name}`} gradientUnits="userSpaceOnUse"
          x1={l.backMid[0]} y1={l.backMid[1]} x2={l.faceMid[0]} y2={l.faceMid[1]}>
          <stop offset="0%" stopColor="hsl(240 8% 10%)" />
          <stop offset="75%" stopColor="hsl(240 6% 15%)" />
          <stop offset="100%" stopColor={glow} stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`ss-face-${name}`} gradientUnits="userSpaceOnUse"
          x1={l.faceTop[0]} y1={l.faceTop[1]} x2={l.faceBot[0]} y2={l.faceBot[1]}>
          <stop offset="0%" stopColor={glow} />
          <stop offset="50%" stopColor={C.hot} />
          <stop offset="100%" stopColor={glow} />
        </linearGradient>
      </defs>
      <path d={l.head} fill={C.body} stroke={C.edge} strokeLinejoin="round" />
      <circle cx={led[0]} cy={led[1]} r="1.3" fill="hsl(145 60% 55%)" />
      <path d={l.ring} fill="url(#ss-metal)" stroke={C.edgeSoft} />
      <path d={l.body} fill={`url(#ss-fabric-${name})`} stroke={C.edge} strokeLinejoin="round" />
      <path d={l.seam} stroke={C.edgeSoft} strokeWidth="1" />
      <path className={`diffuser diff-${name}`} d={l.diffuser} fill={`url(#ss-face-${name})`} stroke={C.hot} strokeOpacity="0.7" strokeWidth="1" strokeLinejoin="round" />
    </g>
  )
}

/** label มาจากไฟล์แปล หน้าอังกฤษจึงไม่ได้คำอธิบายภาพเป็นภาษาไทย */
export function StudioScene({ className, label }: { className?: string; label: string }) {
  return (
    <>
      <div role="img" aria-label={label} className={cn('studio-scene', className)}>
        <div className="studio-world">
          {/* ─────────────── ห้อง: ฉากหลังกระดาษโค้ง พื้นเงา แอ่งแสงบนพื้น ฝุ่นไกล ─────────────── */}
          <Layer depth={DEPTH.room}>
            <defs>
              <linearGradient id="ss-cyc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.012" />
                <stop offset="55%" stopColor="hsl(var(--foreground))" stopOpacity="0.035" />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.065" />
              </linearGradient>
              <linearGradient id="ss-cyc-fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="26%" stopColor="#fff" stopOpacity="1" />
                <stop offset="74%" stopColor="#fff" stopOpacity="1" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="ss-cyc-mask">
                <rect x="546" y="-10" width="572" height="330" fill="url(#ss-cyc-fade)" />
              </mask>
              <linearGradient id="ss-edge-fade" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity="0" />
                <stop offset="22%" stopColor="hsl(var(--border))" stopOpacity="1" />
                <stop offset="78%" stopColor="hsl(var(--border))" stopOpacity="1" />
                <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="ss-pool">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.24" />
                <stop offset="60%" stopColor="hsl(var(--accent))" stopOpacity="0.07" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ss-pool-cool">
                <stop offset="0%" stopColor={C.cool} stopOpacity="0.12" />
                <stop offset="100%" stopColor={C.cool} stopOpacity="0" />
              </radialGradient>
              {/* พื้นเงาใต้เส้นพื้น สว่างใต้โต๊ะแล้วจางออกไปทั้งสองข้าง */}
              <radialGradient id="ss-floor" gradientUnits="userSpaceOnUse" cx="780" cy={GROUND} r="620"
                gradientTransform={`matrix(1 0 0 0.09 0 ${GROUND * 0.91})`}>
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.07" />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g mask="url(#ss-cyc-mask)">
              <path
                d="M 582 0 L 1078 0 L 1078 232 C 1078 272 1042 292 992 296 L 668 296 C 618 292 582 272 582 232 Z"
                fill="url(#ss-cyc)"
              />
            </g>
            <path
              d="M 582 232 C 582 272 618 292 668 296 M 1078 232 C 1078 272 1042 292 992 296"
              stroke="url(#ss-edge-fade)"
              strokeWidth="1"
              strokeOpacity="0.6"
            />

            <rect x="0" y={GROUND} width="1440" height={VIEW_H - GROUND} fill="url(#ss-floor)" />
            <ellipse className="ss-pool" data-origin={`${PRODUCT_X} ${GROUND}`} cx={PRODUCT_X} cy={GROUND} rx="300" ry="34" fill="url(#ss-pool)" />
            {/* แสงฟิลล์ตกกระทบพื้นฝั่งขวาของโต๊ะ */}
            <ellipse cx="990" cy={GROUND} rx="170" ry="16" fill="url(#ss-pool-cool)" />
            <rect x="0" y={GROUND} width="1440" height="1.5" fill="url(#ss-edge-fade)" />

            {/* ฝุ่นไกลในลำแสง เล็กและจาง */}
            <g fill="hsl(var(--accent))">
              <circle className="mote" cx="700" cy="184" r="1.8" opacity="0.45" />
              <circle className="mote" cx="780" cy="140" r="1.4" opacity="0.35" />
              <circle className="mote" cx="900" cy="216" r="2" opacity="0.38" />
              <circle className="mote" cx="1044" cy="168" r="1.6" opacity="0.3" />
              <circle className="mote" cx="646" cy="126" r="1.3" opacity="0.38" />
              <circle className="mote" cx="1160" cy="228" r="1.8" opacity="0.26" />
            </g>
          </Layer>

          {/*
            ─────────────── ลำแสง ───────────────
            ไม่มีฟิลเตอร์เบลอใน SVG — เบลอทั้งแผ่นด้วย CSS filter แทน (.studio-beams)
            แผ่นที่เป็น composited layer ให้การ์ดจอเบลอตอนประกอบภาพ ไม่ต้องคำนวณเบลอใหม่ทุกเฟรม
            อยู่ความลึกเดียวกับโคม ต้นลำแสงจึงไม่หลุดจากหน้าโคมตอนขยับ
          */}
          <Layer depth={DEPTH.rig} className="studio-beams">
            <defs>
              <linearGradient id="ss-beam-key" gradientUnits="userSpaceOnUse"
                x1={keyBeam.from[0]} y1={keyBeam.from[1]} x2={keyBeam.to[0]} y2={keyBeam.to[1]}>
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.5" />
                <stop offset="30%" stopColor="hsl(var(--accent))" stopOpacity="0.26" />
                <stop offset="65%" stopColor="hsl(var(--accent))" stopOpacity="0.08" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ss-beam-fill" gradientUnits="userSpaceOnUse"
                x1={fillBeam.from[0]} y1={fillBeam.from[1]} x2={fillBeam.to[0]} y2={fillBeam.to[1]}>
                <stop offset="0%" stopColor={C.cool} stopOpacity="0.34" />
                <stop offset="30%" stopColor={C.cool} stopOpacity="0.17" />
                <stop offset="65%" stopColor={C.cool} stopOpacity="0.05" />
                <stop offset="100%" stopColor={C.cool} stopOpacity="0" />
              </linearGradient>
              <linearGradient id="ss-beam-bounce" gradientUnits="userSpaceOnUse"
                x1={bounce.from[0]} y1={bounce.from[1]} x2={bounce.to[0]} y2={bounce.to[1]}>
                <stop offset="0%" stopColor="hsl(42 80% 70%)" stopOpacity="0.16" />
                <stop offset="70%" stopColor="hsl(42 80% 70%)" stopOpacity="0.04" />
                <stop offset="100%" stopColor="hsl(42 80% 70%)" stopOpacity="0" />
              </linearGradient>
              {/* ไฟบูมส่องลงตรง ๆ แกนไล่สีจึงเป็นแนวดิ่ง */}
              <linearGradient id="ss-beam-boom" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.34" />
                <stop offset="35%" stopColor="hsl(var(--accent))" stopOpacity="0.16" />
                <stop offset="72%" stopColor="hsl(var(--accent))" stopOpacity="0.05" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="ss-hot-key">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.42" />
                <stop offset="45%" stopColor="hsl(var(--accent))" stopOpacity="0.12" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ss-hot-fill">
                <stop offset="0%" stopColor={C.cool} stopOpacity="0.34" />
                <stop offset="45%" stopColor={C.cool} stopOpacity="0.1" />
                <stop offset="100%" stopColor={C.cool} stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ss-hot-boom">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.3" />
                <stop offset="45%" stopColor="hsl(var(--accent))" stopOpacity="0.09" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path className="beam beam-key" d={keyBeam.d} fill="url(#ss-beam-key)" />
            <path className="beam beam-fill" d={fillBeam.d} fill="url(#ss-beam-fill)" />
            <path className="beam beam-bounce" d={bounce.d} fill="url(#ss-beam-bounce)" />
            <path
              className="beam beam-boom"
              data-origin={`${BOOM_TIP[0]} ${BOOM_TIP[1]}`}
              d={poly([[STRIP.left + 3, STRIP.face + 5], [STRIP.right - 3, STRIP.face + 5], [936, 236], [724, 236]])}
              fill="url(#ss-beam-boom)"
            />
            <ellipse className="glow glow-key" cx={key.faceMid[0]} cy={key.faceMid[1]} rx="86" ry="73" fill="url(#ss-hot-key)" />
            <ellipse className="glow glow-fill" cx={fill.faceMid[0]} cy={fill.faceMid[1]} rx="66" ry="56" fill="url(#ss-hot-fill)" />
            <ellipse className="glow glow-boom" data-origin={`${BOOM_TIP[0]} ${BOOM_TIP[1]}`} cx={PRODUCT_X} cy={STRIP.face + 6} rx="88" ry="38" fill="url(#ss-hot-boom)" />
          </Layer>

          {/* ─────────────── ชุดไฟ: ซอฟต์บ็อกซ์ ขาบูม แผ่นสะท้อน ─────────────── */}
          <Layer depth={DEPTH.rig}>
            <defs>
              <radialGradient id="ss-shadow">
                <stop offset="0%" stopColor="hsl(240 20% 2%)" stopOpacity="0.6" />
                <stop offset="100%" stopColor="hsl(240 20% 2%)" stopOpacity="0" />
              </radialGradient>
              {/* ท่อโลหะ: สว่างตรงกลาง เข้มสองข้าง อ่านออกว่ากลม */}
              <linearGradient id="ss-metal" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(240 4% 24%)" />
                <stop offset="45%" stopColor="hsl(240 5% 52%)" />
                <stop offset="100%" stopColor="hsl(240 4% 22%)" />
              </linearGradient>
              <linearGradient id="ss-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(240 6% 19%)" />
                <stop offset="100%" stopColor="hsl(240 8% 11%)" />
              </linearGradient>
              <linearGradient id="ss-face-boom" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={C.warm} />
                <stop offset="50%" stopColor={C.hot} />
                <stop offset="100%" stopColor={C.warm} />
              </linearGradient>
              {/* หน้าแผ่นสะท้อนสีทอง ไล่แสงตามแนวยาวของวงรี สว่างตรงที่รับแสงคีย์ */}
              <linearGradient id="ss-reflector" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(44 80% 80%)" />
                <stop offset="45%" stopColor="hsl(40 62% 56%)" />
                <stop offset="100%" stopColor="hsl(34 48% 32%)" />
              </linearGradient>
            </defs>

            <Contact x={KEY_X} rx={42} />
            <Contact x={BOOM_X} rx={40} />
            <Contact x={REF_X} rx={36} />
            <Contact x={FILL_X} rx={40} />

            {/* ─── ไฟคีย์ (อุ่น) ─── */}
            <LightStand x={KEY_X} top={100} sandbag="left" />
            <Softbox l={key} tone="warm" name="key" />

            {/* ─── ขาบูม ─── */}
            <LightStand x={BOOM_X} top={BOOM_HEAD[1] + 6} sandbag="right" />
            <path d={taper(BOOM_TIP, BOOM_TAIL, 3.4, 3)} fill="url(#ss-metal)" stroke={C.edgeSoft} strokeWidth="0.6" />
            <circle cx={BOOM_HEAD[0]} cy={BOOM_HEAD[1]} r="7" fill={C.metal} stroke={C.edge} />
            <circle cx={BOOM_HEAD[0]} cy={BOOM_HEAD[1]} r="2.8" fill={C.deep} />
            <path d={`M ${BOOM_HEAD[0] + 5} ${BOOM_HEAD[1] + 5} L ${BOOM_HEAD[0] + 11} ${BOOM_HEAD[1] + 11}`} stroke={C.metalHi} strokeWidth="1.8" strokeLinecap="round" />
            {/* ถุงทรายถ่วงปลายแขน */}
            <path d={`M ${f1(BOOM_TAIL[0])} ${f1(BOOM_TAIL[1])} V ${f1(BOOM_TAIL[1] + 7)}`} stroke={C.metal} strokeWidth="1.4" />
            <path
              d={`M ${f1(BOOM_TAIL[0] - 8)} ${f1(BOOM_TAIL[1] + 9)} Q ${f1(BOOM_TAIL[0] - 9)} ${f1(BOOM_TAIL[1] + 7)} ${f1(BOOM_TAIL[0] - 5)} ${f1(BOOM_TAIL[1] + 7)} H ${f1(BOOM_TAIL[0] + 5)} Q ${f1(BOOM_TAIL[0] + 9)} ${f1(BOOM_TAIL[1] + 7)} ${f1(BOOM_TAIL[0] + 8)} ${f1(BOOM_TAIL[1] + 9)} L ${f1(BOOM_TAIL[0] + 10)} ${f1(BOOM_TAIL[1] + 21)} Q ${f1(BOOM_TAIL[0] + 10)} ${f1(BOOM_TAIL[1] + 25.5)} ${f1(BOOM_TAIL[0])} ${f1(BOOM_TAIL[1] + 25.5)} Q ${f1(BOOM_TAIL[0] - 10)} ${f1(BOOM_TAIL[1] + 25.5)} ${f1(BOOM_TAIL[0] - 10)} ${f1(BOOM_TAIL[1] + 21)} Z`}
              fill={C.sandbag}
              stroke={C.edgeSoft}
            />
            <path d={`M ${f1(BOOM_TAIL[0] - 7)} ${f1(BOOM_TAIL[1] + 12)} H ${f1(BOOM_TAIL[0] + 7)}`} stroke="hsl(30 8% 22%)" strokeWidth="1" />
            {/*
              สตริปไลต์ห้อยใต้ปลายแขนด้วยแกนหมุน แกว่งช้ามากรอบจุดแขวน แขนบูมยาวเกือบสองเมตร ของจริงไม่มีทางนิ่งสนิท
              แกว่งแค่ครึ่งองศา มากกว่านี้จะกลายเป็นของที่กำลังจะหล่น
            */}
            <g className="boom-swing" data-origin={`${BOOM_TIP[0]} ${BOOM_TIP[1]}`}>
              <path d={`M ${PRODUCT_X} ${BOOM_TIP[1]} V ${STRIP.top - 5}`} stroke={C.metalHi} strokeWidth="2" strokeLinecap="round" />
              <path d={`M ${PRODUCT_X - 16} ${STRIP.top + 2} V ${STRIP.top - 5} H ${PRODUCT_X + 16} V ${STRIP.top + 2}`} stroke={C.metal} strokeWidth="2" strokeLinejoin="round" />
              <rect x={STRIP.left} y={STRIP.top} width={STRIP.right - STRIP.left} height={STRIP.face - STRIP.top} rx="3" fill="url(#ss-body)" stroke={C.edge} />
              <path d={`M ${STRIP.left + 8} ${STRIP.top + 4} H ${STRIP.right - 8}`} stroke={C.edgeSoft} strokeWidth="1" />
              <rect className="diffuser diff-boom" x={STRIP.left + 2} y={STRIP.face} width={STRIP.right - STRIP.left - 4} height="5.5" rx="1.5" fill="url(#ss-face-boom)" stroke={C.hot} strokeOpacity="0.6" strokeWidth="0.8" />
            </g>

            {/* ─── แผ่นสะท้อนทอง ─── */}
            <LightStand x={REF_X} top={REF_TOP} />
            <path d={taper([REF_X, REF_TOP + 2], REF_C, 2.2)} fill="url(#ss-metal)" />
            <ellipse
              cx={REF_C[0]} cy={REF_C[1]} rx="10" ry={REF_R}
              transform={`rotate(${REF_TILT} ${REF_C[0]} ${REF_C[1]})`}
              fill="url(#ss-reflector)" stroke="hsl(240 5% 20%)" strokeWidth="2.4"
            />
            <ellipse
              cx={REF_C[0] + 2} cy={REF_C[1] - 12} rx="2" ry="18"
              transform={`rotate(${REF_TILT} ${REF_C[0]} ${REF_C[1]})`}
              fill="#fff" fillOpacity="0.35"
            />

            {/* ─── ไฟฟิลล์ (เย็น) ─── */}
            <LightStand x={FILL_X} top={104} sandbag="right" />
            <Softbox l={fill} tone="cool" name="fill" />
          </Layer>

          {/* ─────────────── โต๊ะถ่ายสินค้า สูง 0.78 เมตร ระดับเอวตามโต๊ะจริง ─────────────── */}
          <Layer depth={DEPTH.set}>
            <defs>
              {/* แก้ว: ขอบสองข้างสว่าง กลางใส เหมือนแสงหักเหที่ขอบขวดจริง */}
              <linearGradient id="ss-glass" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.26" />
                <stop offset="18%" stopColor="hsl(var(--foreground))" stopOpacity="0.08" />
                <stop offset="50%" stopColor="hsl(var(--foreground))" stopOpacity="0.03" />
                <stop offset="82%" stopColor="hsl(var(--foreground))" stopOpacity="0.08" />
                <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.22" />
              </linearGradient>
              <linearGradient id="ss-liquid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.66" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0.28" />
              </linearGradient>
              {/* ทอง: แถบสว่างกลางชิ้น ขอบเข้ม อ่านออกทันทีว่าเป็นโลหะขัดเงา */}
              <linearGradient id="ss-gold" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(36 48% 38%)" />
                <stop offset="38%" stopColor="hsl(42 72% 70%)" />
                <stop offset="52%" stopColor="hsl(45 90% 86%)" />
                <stop offset="70%" stopColor="hsl(40 62% 58%)" />
                <stop offset="100%" stopColor="hsl(34 46% 34%)" />
              </linearGradient>
              <linearGradient id="ss-turntable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(240 5% 26%)" />
                <stop offset="100%" stopColor="hsl(240 6% 15%)" />
              </linearGradient>
              <linearGradient id="ss-turntable-side" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(28 30% 30%)" />
                <stop offset="45%" stopColor="hsl(240 5% 34%)" />
                <stop offset="100%" stopColor="hsl(206 20% 28%)" />
              </linearGradient>
              {/* ผิวโต๊ะรับไฟคีย์อุ่นจากซ้าย ไฟฟิลล์เย็นจากขวา */}
              <linearGradient id="ss-tabletop" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(28 28% 22%)" />
                <stop offset="50%" stopColor="hsl(240 6% 16%)" />
                <stop offset="100%" stopColor="hsl(206 22% 21%)" />
              </linearGradient>
              <linearGradient id="ss-rim-h" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={C.warm} stopOpacity="0.9" />
                <stop offset="50%" stopColor={C.hot} stopOpacity="0.35" />
                <stop offset="100%" stopColor={C.cool} stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="ss-glint" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#fff" stopOpacity="0" />
                <stop offset="50%" stopColor="#fff" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <radialGradient id="ss-spill">
                <stop offset="0%" stopColor={C.hot} stopOpacity="0.5" />
                <stop offset="100%" stopColor={C.hot} stopOpacity="0" />
              </radialGradient>
              {/* พื้นหลังของภาพที่ถ่ายได้ (จอมอนิเตอร์และรูปที่ลอยออกมา) — ฉากกระดาษที่โดนไฟคีย์ */}
              <radialGradient id="ss-still-bg" gradientUnits="userSpaceOnUse" cx="818" cy="150" r="110">
                <stop offset="0%" stopColor="hsl(30 38% 30%)" />
                <stop offset="100%" stopColor="hsl(240 8% 8%)" />
              </radialGradient>
              {/* เงาสะท้อนบนพื้น เข้มสุดที่เส้นพื้นแล้วหายไปภายในสี่สิบหน่วย */}
              <linearGradient id="ss-reflect-fade" gradientUnits="userSpaceOnUse" x1="0" y1={GROUND} x2="0" y2={GROUND + 40}>
                <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="ss-reflect" maskUnits="userSpaceOnUse" x="0" y={GROUND} width="1440" height={VIEW_H - GROUND}>
                <rect x="0" y={GROUND} width="1440" height={VIEW_H - GROUND} fill="url(#ss-reflect-fade)" />
              </mask>
              <clipPath id="ss-bottle-clip">
                <path d={BOTTLE_BODY} />
                <rect x="823" y="143.5" width="14" height="8" />
                <rect x="816" y="119" width="28" height="22.5" rx="3" />
              </clipPath>
            </defs>

            <Contact x={PRODUCT_X} rx={112} ry={6} />

            <g id="ss-set-art">
              {/* ขาโต๊ะคู่หลัง เล็กและเข้มกว่า อยู่ไกลกว่า */}
              <rect x="761" y={TABLE + 11} width="3.4" height={GROUND - TABLE - 13} fill="hsl(240 5% 16%)" />
              <rect x="896" y={TABLE + 11} width="3.4" height={GROUND - TABLE - 13} fill="hsl(240 5% 16%)" />
              <rect x="751" y={GROUND - 30} width="158" height="2.6" rx="1" fill="hsl(240 5% 22%)" />
              <rect x="747" y={TABLE + 11} width="4.6" height={GROUND - TABLE - 12} fill="url(#ss-metal)" />
              <rect x="908.5" y={TABLE + 11} width="4.6" height={GROUND - TABLE - 12} fill="url(#ss-metal)" />
              <rect x="745" y={GROUND - 2.2} width="8.6" height="2.2" rx="1" fill={C.deep} />
              <rect x="906.5" y={GROUND - 2.2} width="8.6" height="2.2" rx="1" fill={C.deep} />
              {/* หน้าโต๊ะหนา มีขอบบนรับแสงสองสีจากไฟสองข้าง */}
              <rect x="738" y={TABLE + 6.5} width="184" height="5" fill={C.deep} />
              <rect x="730" y={TABLE} width="200" height="7" rx="1.6" fill="url(#ss-tabletop)" stroke={C.edge} strokeWidth="0.9" />
              <path d={`M 731.5 ${TABLE + 0.5} H 928.5`} stroke="url(#ss-rim-h)" strokeWidth="1.2" strokeLinecap="round" />
              <StillLife />
            </g>
            <g mask="url(#ss-reflect)">
              <use href="#ss-set-art" transform={MIRROR} />
            </g>

            {/* แสงแฟลชที่ตกถึงตัวสินค้า ทำให้อ่านออกว่าแฟลชยิงไปที่ของบนโต๊ะ */}
            <ellipse className="flash-spill" cx={PRODUCT_X} cy="172" rx="150" ry="76" fill="url(#ss-spill)" />

            {/* แสงวาบพาดผ่านแก้วกับฝาทอง ตัดขอบตามรูปขวด */}
            <g clipPath="url(#ss-bottle-clip)">
              <path className="glint" d={poly([[794, 112], [806, 112], [792, 212], [780, 212]])} fill="url(#ss-glint)" />
            </g>

            {/*
              กรอบโฟกัสอัตโนมัติ — สิ่งที่ช่างภาพเห็นในช่องมองภาพ ซ่อนไว้จนกว่าจะเริ่มถ่าย
              กรอบหดเข้าหาขวดแล้วกะพริบตอนล็อกโฟกัส ตัวเลขข้างกรอบคือค่าที่กล้องตั้งไว้จริงสำหรับงานแบบนี้
            */}
            <g className="hud" fontFamily="var(--font-mono), ui-monospace, monospace" fontSize="8" letterSpacing="0.06em">
              <path
                className="hud-brackets"
                data-origin={`${PRODUCT_X} 163`}
                d="M 798 121 V 112 H 807 M 853 112 H 862 V 121 M 862 205 V 214 H 853 M 807 214 H 798 V 205 M 826 163 H 834 M 830 159 V 167"
                stroke="hsl(var(--accent))" strokeWidth="1.6" strokeLinecap="round"
              />
              <g className="hud-text" fill="hsl(var(--accent))">
                <text x="798" y="106">AF-S</text>
                <text className="hud-lock" x="862" y="106" textAnchor="end">● LOCK</text>
                <g fill="hsl(var(--foreground) / 0.72)">
                  <text x="868" y="124">1/200</text>
                  <text x="868" y="134">f/8</text>
                  <text x="868" y="144">ISO 100</text>
                </g>
                <text className="hud-frame" x="868" y="158" fill="hsl(var(--muted-foreground))">ALX_0412</text>
              </g>
            </g>
          </Layer>

          {/* ─────────────── ช่างภาพ กล้อง แฟลช และจอดูภาพ (ใกล้สุด) ─────────────── */}
          <Layer depth={DEPTH.crew}>
            <defs>
              <radialGradient id="ss-burst">
                <stop offset="0%" stopColor="#fff7ea" stopOpacity="0.95" />
                <stop offset="35%" stopColor="#ffe6c4" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ffe6c4" stopOpacity="0" />
              </radialGradient>
              {/* แสงแฟลชทั่วห้อง จุดกำเนิดคือหน้าเลนส์แฟลชจุดเดียวกับแสงวาบ แล้วจางลงตามระยะ */}
              <radialGradient id="ss-room" gradientUnits="userSpaceOnUse" cx={FLASH.fire[0]} cy={FLASH.fire[1]} r="900">
                <stop offset="0%" stopColor="#fff4e2" stopOpacity="0.18" />
                <stop offset="45%" stopColor="#fff4e2" stopOpacity="0.05" />
                <stop offset="100%" stopColor="#fff4e2" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ss-mote-near">
                <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity="0.4" />
                <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
              </radialGradient>
              {/* แสงจากจอมอนิเตอร์ ฟุ้งรอบจอและตกลงพื้น */}
              <radialGradient id="ss-screen-glow">
                <stop offset="0%" stopColor="hsl(32 60% 70%)" stopOpacity="0.22" />
                <stop offset="100%" stopColor="hsl(32 60% 70%)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ss-lens-glass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.warm} stopOpacity="0.9" />
                <stop offset="45%" stopColor="hsl(240 20% 10%)" />
                <stop offset="100%" stopColor={C.cool} stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="ss-jacket" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(240 7% 17%)" />
                <stop offset="100%" stopColor="hsl(240 8% 12%)" />
              </linearGradient>
            </defs>

            <Contact x={MONITOR.x} rx={34} />
            <Contact x={304} rx={40} />
            <Contact x={TRIPOD_APEX[0]} rx={44} />
            <ellipse cx={MONITOR.x} cy={GROUND} rx="60" ry="6" fill="url(#ss-screen-glow)" />

            <g id="ss-crew-art">
              <MonitorCart />
              <Photographer />
              <CameraRig />
              <NearArm />
            </g>
            <g mask="url(#ss-reflect)">
              <use href="#ss-crew-art" transform={MIRROR} />
            </g>

            {/* แสงตอนแฟลชทำงาน ออกจากหน้าเลนส์แฟลชและพุ่งไปทางที่หัวเงยอยู่ */}
            <g className="flash-pop" data-origin={`${f1(FLASH.fire[0])} ${f1(FLASH.fire[1])}`}>
              <circle cx={FLASH.fire[0]} cy={FLASH.fire[1]} r="46" fill="url(#ss-burst)" />
              <path d={FLASH.rays} stroke="#fff4e2" strokeWidth="2.2" strokeLinecap="round" opacity="0.8" />
            </g>

            {/*
              แสงแฟลชสว่างไปทั้งห้องหนึ่งจังหวะ อยู่แผ่นเดียวกับหัวแฟลช จุดกำเนิดจึงตรงหัวแฟลชเสมอแม้แผ่นเลื่อน
              หัวแฟลชเงยขึ้นจึงเป็นการยิงสะท้อน แสงกระจายทั่วห้องแทนที่จะพุ่งเป็นลำเดียว
            */}
            <rect className="flash-room" x="-60" y="-40" width="1560" height={VIEW_H + 80} fill="url(#ss-room)" />

            {/* ฝุ่นใกล้กล้อง ใหญ่และนุ่มเหมือนหลุดโฟกัส ขยับมากกว่าฝุ่นไกลเพราะอยู่แผ่นหน้า */}
            <g>
              <circle className="mote" cx="470" cy="150" r="4" fill="url(#ss-mote-near)" />
              <circle className="mote" cx="640" cy="232" r="5" fill="url(#ss-mote-near)" />
              <circle className="mote" cx="980" cy="120" r="3.5" fill="url(#ss-mote-near)" />
              <circle className="mote" cx="1210" cy="204" r="4.5" fill="url(#ss-mote-near)" />
            </g>
          </Layer>
        </div>
      </div>

      {/*
        รูปที่เพิ่งถ่ายได้ ลอยออกมาจากตัวสินค้าแล้วค่อย ๆ ปรากฏภาพเหมือนฟิล์มอินสแตนต์
        อยู่นอกตัวฉาก เพราะต้องหมุนแบบ 3 มิติจริง ซึ่งชิ้นส่วนภายใน SVG ทำไม่ได้
        ซ่อนไว้ด้วย CSS จนกว่า studio-motion.ts จะพาออกมา
      */}
      <div className="studio-shot" aria-hidden="true">
        <div className="studio-shot-photo">
          <svg viewBox={STILL_VIEW} preserveAspectRatio="xMidYMid slice">
            <rect x="742" y="110" width="176" height="97" fill="url(#ss-still-bg)" />
            <use href="#ss-still-art" />
          </svg>
          <span className="studio-shot-develop" />
        </div>
        <p className="studio-shot-meta">
          <span className="studio-shot-name">ALX_0413.RAW</span>
          <span>1/200 · f/8 · ISO 100</span>
        </p>
      </div>
    </>
  )
}

/**
 * จอดูภาพบนรถเข็น ต่อสายเทเธอร์จากกล้อง ภาพขึ้นจอทันทีที่กดชัตเตอร์
 * จอหันหน้าออกมาหาคนดู (ไม่ใช่มุมข้างจริง) เพื่อให้เห็นว่าบนจอคือรูปที่เพิ่งถ่าย
 */
function MonitorCart() {
  const { x, left, right, top, bottom } = MONITOR
  const hub: Pt = [x, GROUND - 10]
  return (
    <g>
      {/* แสงจอฟุ้งด้านหลัง */}
      <ellipse cx={x} cy={(top + bottom) / 2} rx="70" ry="42" fill="url(#ss-screen-glow)" />

      {/* ฐานล้อ ขาหลังเข้มกว่า */}
      <path d={taper(hub, [x + 8, GROUND - 5], 2.2, 1.8)} fill="hsl(240 5% 16%)" />
      <path d={taper(hub, [x - 24, GROUND - 4], 2.8, 2.2)} fill="url(#ss-metal)" />
      <path d={taper(hub, [x + 24, GROUND - 4], 2.8, 2.2)} fill="url(#ss-metal)" />
      <circle cx={x - 25} cy={GROUND - 3.2} r="3.2" fill={C.deep} stroke={C.edgeSoft} />
      <circle cx={x + 25} cy={GROUND - 3.2} r="3.2" fill={C.deep} stroke={C.edgeSoft} />
      <path d={taper([x, bottom + 2], hub, 3.6)} fill="url(#ss-metal)" />
      {/* ถาดวางของกลางเสา */}
      <rect x={x - 17} y="236" width="34" height="3" rx="1" fill={C.metal} />
      <rect x={x - 13} y="230" width="20" height="6" rx="1.2" fill={C.body} stroke={C.edgeSoft} />
      <circle cx={x + 3.5} cy="233" r="0.9" fill="hsl(206 72% 70%)" />

      {/* ตัวจอ */}
      <rect x={x - 6} y={bottom - 2} width="12" height="6" rx="1" fill={C.metal} />
      <rect x={left} y={top} width={right - left} height={bottom - top} rx="3" fill="hsl(240 9% 5%)" stroke={C.edge} />
      <svg x={left + 3} y={top + 3} width={right - left - 6} height={bottom - top - 6} viewBox={STILL_VIEW} preserveAspectRatio="xMidYMid slice">
        <rect x="742" y="110" width="176" height="97" fill="url(#ss-still-bg)" />
        <use className="monitor-shot" href="#ss-still-art" />
        {/* แถบภาพย่อของโปรแกรมถ่ายเทเธอร์ */}
        <rect x="742" y="196" width="176" height="11" fill="hsl(240 9% 5%)" fillOpacity="0.85" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={760 + i * 30} y="198" width="22" height="7" rx="0.8" fill={i === 4 ? C.warm : 'hsl(30 20% 28%)'} fillOpacity={i === 4 ? 0.9 : 0.8} />
        ))}
      </svg>
      <path d={`M ${left + 4} ${top + 4} H ${left + 26} L ${left + 5} ${top + 24} Z`} fill="#fff" fillOpacity="0.05" />
    </g>
  )
}

/**
 * ช่างภาพโน้มตัวเข้าหากล้อง ตาแนบช่องมองภาพ มือซ้ายประคองใต้เลนส์
 * แขนขวา (อยู่ใกล้คนดู) แยกไปอยู่ใน NearArm เพราะต้องวาดทับกริปกล้อง
 * ยืนหลังไฟคีย์จึงไม่โดนไฟตรง ขอบด้านหลังติดแสงเย็นจากจอ ด้านหน้าติดแสงอุ่นเฉพาะตอนแฟลชยิง (.flash-rim)
 */
function Photographer() {
  return (
    <g className="person" data-origin={`304 ${GROUND}`}>
      {/* แขนซ้าย (อยู่ไกล หลังลำตัวและกล้อง) */}
      <path d="M 318 165 L 344 186 L 370 162" stroke={C.deep} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />

      {/* ขาหลัง งอเข่าเล็กน้อย */}
      <path d="M 292.5 212 C 289 232 287 258 284.5 289 L 294.5 289 C 296 262 300.5 238 306 214 Z" fill={C.trousers} stroke={C.edgeSoft} />
      <path d="M 282.5 289 H 296 C 299.5 289 302 291.3 302 294 V 296 H 281.5 Z" fill={C.deep} stroke={C.edgeSoft} />

      {/* ลำตัว เสื้อแจ็กเก็ต โน้มไปข้างหน้า ความหนาจากหลังถึงอก 0.25 เมตร */}
      <path
        d="M 316.5 151 C 305 154 298 168 295.5 186 C 294 197 293.5 206 293.5 213 L 316 216 C 318 201 322.5 188 329.5 175 C 332 170 331.5 162.5 327.5 158.5 C 325.5 156.5 324 153.5 324 152 Z"
        fill="url(#ss-jacket)" stroke={C.edge} strokeLinejoin="round"
      />
      <path d="M 300 200 C 305 202 311 203 316.5 203" stroke={C.edgeSoft} strokeWidth="1" />

      {/* ขาหน้า */}
      <path d="M 302 214 C 308.5 236 314 260 316.5 289 L 326 289 C 325 260 320.5 234 316 213 Z" fill={C.trousers} stroke={C.edgeSoft} />
      <path d="M 314.5 289 H 328 C 332 289 334.5 291.3 334.5 294 V 296 H 313.5 Z" fill={C.deep} stroke={C.edgeSoft} />

      {/* ศีรษะ: หน้าแนบช่องมองภาพ ผมสั้นด้านหลัง */}
      <circle cx="324.5" cy="143.5" r="10.5" fill={C.skin} stroke={C.edge} />
      <path d="M 314.3 144.5 C 314 136 319.5 132.6 325 132.8 C 330 133 333.5 136 334.2 139.5 L 328 138.3 C 323 137.8 318.5 139.8 317.2 145.5 Z" fill={C.hair} />
      <ellipse cx="321.5" cy="145" rx="1.6" ry="2.4" fill="hsl(22 18% 31%)" />

      {/* ขอบหลังติดแสงเย็นจากจอ */}
      <g stroke={C.cool} strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" fill="none">
        <path d="M 314 141 C 314.6 137 317 134.6 320 133.5" />
        <path d="M 311.5 154 C 302 160 297.5 173 295 190" />
        <path d="M 291.8 214 C 288.6 236 286.5 262 284.8 287" strokeOpacity="0.28" />
      </g>

      {/* ขอบหน้าติดแสงแฟลช เห็นแค่ช่วงที่แฟลชยิง */}
      <g className="flash-rim" stroke={C.hot} strokeWidth="1.3" strokeLinecap="round" fill="none">
        <path d="M 330.5 134.8 C 333.5 136.5 335 139 335 142" />
        <path d="M 328 159 C 331.5 162.5 331.8 167 330 172" />
      </g>
    </g>
  )
}

/**
 * แขนขวา วาดหลังกล้องเพราะอยู่ใกล้คนดูกว่ากริป
 * ปลายแขนกับมือหมุนรอบศอกตอนกดชัตเตอร์ (.shutter-arm)
 * ติดคลาส person ด้วย จังหวะหายใจจึงขยับไปพร้อมลำตัว ไหล่ไม่หลุดจากแขน
 */
function NearArm() {
  return (
    <g className="person" data-origin={`304 ${GROUND}`}>
      <path d="M 323 160 L 337 183" stroke={C.edge} strokeWidth="9.6" strokeLinecap="round" />
      <path d="M 323 160 L 337 183" stroke={C.jacket} strokeWidth="8" strokeLinecap="round" />
      <g className="shutter-arm" data-origin="337 183">
        <path d="M 337 183 L 352 162" stroke={C.edge} strokeWidth="8.8" strokeLinecap="round" />
        <path d="M 337 183 L 352 162" stroke={C.jacket} strokeWidth="7.2" strokeLinecap="round" />
        {/* มือกำกริป นิ้วชี้วางบนปุ่มชัตเตอร์ */}
        <path d="M 350.5 162.5 C 349.5 156.5 351 150.5 355 149.8 C 359 149.2 361.5 152.5 361.5 156 C 361.5 160.5 358.5 164 354.5 164 Z" fill={C.skin} stroke={C.edgeSoft} />
        <path d="M 356.4 150 L 357 145.2" stroke={C.skin} strokeWidth="2.2" strokeLinecap="round" />
      </g>
      <path className="flash-rim" d="M 324 157.5 L 335.5 176.5" stroke={C.hot} strokeOpacity="0.8" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  )
}

/**
 * กล้อง (สัดส่วน Panasonic S5 II ขยายราว 1.7 เท่าให้อ่านออก) บนหัวแพนและขาตั้งสามขา
 * แฟลช Godox V1 บนฮอตชู หัวเงยสะท้อนเพดาน ด้านที่เห็นคือด้านกริป กริปจึงอยู่หน้าตัวกล้อง
 * สายเทเธอร์ออกจากช่องด้านข้าง ลงไปตามขาตั้งแล้วลากพื้นไปหาจอ
 */
function CameraRig() {
  const [ax, ay] = TRIPOD_APEX
  const locks = [TRIPOD_FEET.back, TRIPOD_FEET.front].map((foot) => lerp(TRIPOD_APEX, foot, 0.5))
  return (
    <g>
      {/* สายเทเธอร์ */}
      <path
        d={`M 336 153.5 C 327 162 327 200 334 230 C 341 262 330 288 316 294.3 C 288 295.4 246 295.4 ${MONITOR.x + 12} 293.6`}
        stroke="hsl(24 70% 52%)" strokeOpacity="0.45" strokeWidth="1.15" strokeLinecap="round"
      />

      {/* มือซ้ายประคองใต้เลนส์ วาดก่อนเลนส์ เลนส์จึงทับขอบบนของมือ */}
      <ellipse cx="371.5" cy="158.6" rx="4.6" ry="3" fill={C.skin} stroke={C.edgeSoft} />

      {/* ขาตั้งกล้อง: ขาไกลก่อน แล้วขาหลัง ขาหน้า */}
      <path d={taper(TRIPOD_APEX, TRIPOD_FEET.far, 3.2, 2.1)} fill="hsl(240 5% 16%)" />
      <path d={taper(TRIPOD_APEX, TRIPOD_FEET.back, 4.4, 2.5)} fill="url(#ss-metal)" />
      <path d={taper(TRIPOD_APEX, TRIPOD_FEET.front, 4.4, 2.5)} fill="url(#ss-metal)" />
      {locks.map(([lx, ly], i) => (
        <rect key={i} x={lx - 2.8} y={ly - 1.8} width="5.6" height="3.6" rx="1" fill={C.body} stroke={C.edge} strokeWidth="0.8" />
      ))}
      {[TRIPOD_FEET.back, TRIPOD_FEET.front].map(([fx, fy], i) => (
        <ellipse key={i} cx={fx} cy={fy} rx="2.8" ry="1.3" fill={C.deep} />
      ))}
      <path d={`M ${ax - 6} ${ay - 6} H ${ax + 6} L ${ax + 4.5} ${ay} H ${ax - 4.5} Z`} fill={C.metal} stroke={C.edgeSoft} />
      <rect x={ax - 9} y="160" width="18" height="3.6" rx="1.2" fill={C.body} stroke={C.edge} strokeWidth="0.8" />

      {/* ตัวกล้อง ช่องมองภาพ ฮอตชู */}
      <path d="M 339 144 H 356 Q 359 144 359 147 V 157 Q 359 160 356 160 H 339 Q 336 160 336 157 V 147 Q 336 144 339 144 Z" fill="url(#ss-body)" stroke={C.edge} />
      <path d="M 340.5 144 L 342 139.5 H 349 L 350.5 144 Z" fill="url(#ss-body)" stroke={C.edge} strokeLinejoin="round" />
      <rect x="336.4" y="139.8" width="4.8" height="4.2" rx="1.2" fill={C.deep} stroke={C.edgeSoft} strokeWidth="0.8" />
      <rect x="342" y="138.2" width="6.5" height="1.4" rx="0.4" fill={C.metal} />
      <path d="M 338 146.5 H 350" stroke="hsl(40 20% 90% / 0.14)" strokeWidth="0.7" strokeLinecap="round" />
      <rect x="359" y="146" width="3.2" height="12" fill="url(#ss-metal)" />
      <circle cx="360.6" cy="147.4" r="0.7" fill="hsl(0 70% 50%)" />
      {/* กริปด้านใกล้ ปุ่มชัตเตอร์ ไฟบันทึก */}
      <path d="M 351 145.5 H 358 Q 361 145.5 361 148.5 V 158 Q 361 161 358 161 H 351 Z" fill={C.bodyHi} stroke={C.edge} />
      <rect x="354.5" y="143.6" width="4.6" height="1.8" rx="0.7" fill={C.metalHi} />
      <circle className="rec-dot" cx="352.2" cy="143.1" r="1.1" fill="hsl(0 70% 48%)" />

      {/* เลนส์: ตัวกระบอก วงแหวนซูมยาง วงแหวนโฟกัส ฮูด หน้าเลนส์สะท้อนไฟสองสี */}
      <rect x="362" y="146.5" width="19" height="11" rx="1.5" fill="hsl(240 7% 13%)" stroke={C.edge} />
      <rect x="365" y="146" width="7.4" height="12" rx="0.8" fill={C.deep} />
      <g className="lens-ring" stroke="hsl(240 4% 30%)" strokeWidth="0.6">
        {[366, 367.1, 368.2, 369.3, 370.4, 371.5].map((rx) => (
          <path key={rx} d={`M ${rx} 146.8 V 157.2`} />
        ))}
      </g>
      <rect x="374.2" y="146.3" width="3.6" height="11.4" rx="0.7" fill="hsl(240 6% 19%)" />
      <path d="M 362.5 147.4 H 380.5" stroke="hsl(40 20% 90% / 0.16)" strokeWidth="0.6" />
      <path d="M 381 147 L 390 144.5 Q 391 144.4 391 145.4 V 158.6 Q 391 159.6 390 159.5 L 381 157 Z" fill={C.deep} stroke={C.edge} strokeLinejoin="round" />
      <ellipse cx="390.8" cy="152" rx="1.2" ry="6.6" fill="url(#ss-lens-glass)" />

      {/* แฟลชบนฮอตชู หัวเงย 35 องศา หน้าเลนส์แฟลชคือจุดกำเนิดแสงวาบ */}
      <rect x="342.3" y="136.6" width="6" height="1.8" rx="0.4" fill={C.metal} />
      <path d="M 343 124 H 347.5 Q 349 124 349 125.5 V 135.6 Q 349 136.8 347.8 136.8 H 342.8 Q 341.5 136.8 341.5 135.6 V 125.5 Q 341.5 124 343 124 Z" fill="url(#ss-body)" stroke={C.edge} />
      <rect x="347.6" y="128" width="1.4" height="6" rx="0.4" fill="hsl(0 63% 38%)" />
      <rect x="343.3" y="121" width="4" height="3.4" fill={C.metal} />
      <path d={FLASH.head} fill="url(#ss-body)" stroke={C.edge} strokeLinejoin="round" />
      <path className="flash-tube" d={FLASH.face} stroke={C.hot} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </g>
  )
}

/**
 * ของที่กำลังถ่าย — ใช้ซ้ำสามที่ผ่าน <use>: บนโต๊ะ บนจอมอนิเตอร์ และในรูปที่ลอยออกมา
 * ภาพบนจอกับรูปที่ถ่ายได้จึงเป็นของชิ้นเดียวกับบนโต๊ะเสมอ ไม่มีทางวาดไม่ตรงกัน
 * แสงขอบตามทิศไฟจริง: ซ้ายอุ่นจากไฟคีย์ ขวาเย็นจากไฟฟิลล์ บนสว่างจากไฟบูม
 */
function StillLife() {
  return (
    <g id="ss-still-art">
      {/* กระปุกครีมฝาทอง */}
      <rect x="747" y={TABLE - 13} width="18" height="13" rx="2" fill="hsl(40 20% 88% / 0.14)" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1.1" />
      <rect x="746" y={TABLE - 18} width="20" height="5.5" rx="1.5" fill="url(#ss-gold)" />
      <path d={`M 747.6 ${TABLE - 11.5} V ${TABLE - 2}`} stroke={C.warm} strokeOpacity="0.8" strokeWidth="1" strokeLinecap="round" />

      {/* แท่นหมุน — ขีดบนขอบวิ่งไปรอบ ๆ ทำให้รู้ว่าแท่นกำลังหมุน */}
      <path
        d={`M ${PRODUCT_X - 58} ${TURNTABLE_TOP} V ${TURNTABLE_TOP + 4} A 58 6 0 0 0 ${PRODUCT_X + 58} ${TURNTABLE_TOP + 4} V ${TURNTABLE_TOP}`}
        fill="url(#ss-turntable-side)" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1"
      />
      <ellipse cx={PRODUCT_X} cy={TURNTABLE_TOP} rx="58" ry="6" fill="url(#ss-turntable)" stroke="hsl(var(--foreground) / 0.45)" strokeWidth="1" />
      <ellipse className="turntable-rim" cx={PRODUCT_X} cy={TURNTABLE_TOP} rx="52" ry="4.6" stroke="hsl(var(--accent) / 0.34)" strokeWidth="1" strokeDasharray="2 7" />
      <ellipse cx={PRODUCT_X} cy={BOTTLE_BASE + 0.5} rx="26" ry="2.5" fill="hsl(240 20% 2% / 0.45)" />

      {/* ขวดน้ำหอม: แก้ว น้ำหอม ฉลากโมโนแกรม คอขวด ห่วงทอง ฝาทอง */}
      <g id="ss-product-art">
        <path d={BOTTLE_BODY} fill="url(#ss-glass)" />
        <rect x="810.5" y="168" width="39" height={BOTTLE_BASE - 171} rx="3" fill="url(#ss-liquid)" />
        <path d="M 810.5 168.5 H 849.5" stroke="hsl(var(--accent))" strokeOpacity="0.8" strokeWidth="1" />
        <rect x="818" y="179" width="24" height="16" rx="1.5" fill="hsl(240 8% 7% / 0.85)" stroke="url(#ss-gold)" strokeWidth="0.8" />
        <text x={PRODUCT_X} y="191" textAnchor="middle" fontSize="10.5" fill="url(#ss-gold)" fontFamily="var(--font-display), serif">A</text>
        <rect x="811.5" y="157" width="3.5" height="44" rx="1.75" fill="#fff" fillOpacity="0.45" />
        <rect x="846" y="159" width="1.8" height="40" rx="0.9" fill="#fff" fillOpacity="0.2" />
        <path d={BOTTLE_BODY} stroke="hsl(var(--foreground) / 0.7)" strokeWidth="1.3" />
        {/* แสงขอบสองสีตามไฟสองข้าง */}
        <path d={`M 807.7 162 V ${BOTTLE_BASE - 3}`} stroke={C.warm} strokeWidth="1.2" strokeLinecap="round" />
        <path d={`M 852.3 162 V ${BOTTLE_BASE - 3}`} stroke={C.cool} strokeOpacity="0.85" strokeWidth="1.2" strokeLinecap="round" />
        <rect x="823" y="143.5" width="14" height="8" fill="hsl(var(--foreground) / 0.15)" stroke="hsl(var(--foreground) / 0.55)" strokeWidth="1" />
        <rect x="819.5" y="141" width="21" height="3.5" rx="1" fill="url(#ss-gold)" />
        <rect x="816" y="119" width="28" height="22.5" rx="3" fill="url(#ss-gold)" stroke="hsl(36 48% 32%)" strokeWidth="1" />
        <rect x="824" y="122" width="2" height="16" rx="1" fill="#fff" fillOpacity="0.55" />
        <path d="M 818 119.6 H 842" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* กล่องของขวัญผูกริบบิ้นทอง */}
      <rect x="893" y={TABLE - 23} width="26" height="23" rx="1.5" fill="hsl(18 28% 17%)" stroke="hsl(var(--foreground) / 0.4)" strokeWidth="1" />
      <path d={`M 893.8 ${TABLE - 21} V ${TABLE - 2}`} stroke={C.warm} strokeOpacity="0.55" strokeWidth="1" strokeLinecap="round" />
      <rect x="904" y={TABLE - 23} width="4" height="23" fill="url(#ss-gold)" />
      <rect x="893" y={TABLE - 15} width="26" height="3.5" fill="url(#ss-gold)" fillOpacity="0.85" />
      <path
        d={`M 906 ${TABLE - 23} C 900 ${TABLE - 30} 895 ${TABLE - 27} 899 ${TABLE - 23} M 906 ${TABLE - 23} C 912 ${TABLE - 30} 917 ${TABLE - 27} 913 ${TABLE - 23}`}
        stroke="hsl(42 72% 70%)" strokeWidth="1.6" strokeLinecap="round"
      />
      <path d={`M 918.7 ${TABLE - 21} V ${TABLE - 2}`} stroke={C.cool} strokeOpacity="0.8" strokeWidth="1.1" strokeLinecap="round" />
    </g>
  )
}
