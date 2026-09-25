import { gsap } from 'gsap'

/**
 * การเคลื่อนไหวของฉากสตูดิโอหน้าแรก (GSAP)
 *
 * StudioStage โหลดไฟล์นี้ด้วย import() หลังหน้าพร้อมใช้งานแล้ว GSAP จึงไม่อยู่ใน JavaScript ก้อนแรก
 * และไม่หน่วงหัวเรื่องซึ่งเป็น LCP ของหน้า ฉากนิ่งแสดงครบเองได้ถ้าไฟล์นี้ไม่มา (ดู StudioScene)
 *
 * จังหวะทั้งหมด
 *   เปิดฉาก (ครั้งแรกครั้งเดียว): ห้องมืด แผ่นความลึกค่อย ๆ ประกบเข้าที่เหมือนกล้องดอลลี่เข้า
 *     แล้วไฟติดทีละดวง คีย์ → ฟิลล์ → บูม → แสงสะท้อน แสงวาบพาดผ่านขวด
 *   วนตลอด: ลำแสงหายใจ ฝุ่นลอย แท่นหมุนหมุน ช่างภาพหายใจ โคมบูมแกว่ง
 *   ถ่ายภาพทุก ~9 วินาที: กรอบโฟกัสหดเข้าหาขวด → ล็อก → กดชัตเตอร์ → แฟลช
 *     → ภาพขึ้นจอมอนิเตอร์ → เว้นหนึ่งรอบมีรูปลอยออกมาแบบฟิล์มอินสแตนต์
 *   ความลึก: แผ่นใกล้ขยับมากกว่าแผ่นไกลตามเมาส์ (เฉพาะเมาส์จริง) และตามการเลื่อนหน้า
 *     ทั้งฉากเอียงในมุมมองสามมิติเล็กน้อย
 *
 * ขยับเฉพาะ transform กับ opacity ทั้งหมด ไม่มีการเปลี่ยนขนาดกล่องหรือเบลอใหม่ทุกเฟรม
 * คนที่ตั้งค่าลดการเคลื่อนไหวไม่ได้อะไรเลยจากไฟล์นี้ (gsap.matchMedia คืนสภาพให้เองถ้าเปลี่ยนค่ากลางทาง)
 */

export type StudioMotion = {
  /** หยุด/เล่นต่อ — StudioStage เรียกเมื่อฉากพ้นจอหรือผู้ใช้กดปุ่มหยุด */
  setRunning(running: boolean): void
  destroy(): void
}

type Origin = string

const originOf = (el: Element | undefined): Origin => (el as SVGElement | undefined)?.dataset.origin ?? '0 0'
const depthOf = (el: Element) => Number((el as SVGElement).dataset.depth ?? 0)

/** ขยับตามเมาส์สุดขอบได้เท่านี้ (px) ที่แผ่นใกล้สุด แผ่นอื่นลดตามความลึก */
const POINTER_X = 18
const POINTER_Y = 6
/** เลื่อนหน้าพ้นฉากแล้วแผ่นใกล้สุดลอยขึ้นเท่านี้ (px) และฉากเอียงไปเท่านี้ (องศา) */
const SCROLL_Y = 26
const SCROLL_TILT = 9
/** ถ่ายภาพห่างกันเท่านี้ (วินาที) ถี่กว่านี้จะดึงสายตาจากเนื้อหาเหนือฉาก */
const SHOT_EVERY = 9

export function startStudioMotion(stage: HTMLElement): StudioMotion {
  const hero = stage.closest<HTMLElement>('.home-hero') ?? stage
  const q = gsap.utils.selector(stage)
  const one = <T extends Element = Element>(selector: string) => q(selector)[0] as unknown as T | undefined

  let running = true
  let introDone = false
  let master: gsap.core.Timeline | null = null

  const mm = gsap.matchMedia()

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      pointer: '(hover: hover) and (pointer: fine)',
      wide: '(min-width: 640px)',
    },
    (context) => {
      const { motion, pointer, wide } = context.conditions as Record<string, boolean>
      if (!motion) return

      const world = one<HTMLElement>('.studio-world')
      const layers = q('.studio-layer').filter((el) => depthOf(el) > 0)
      const card = one<HTMLElement>('.studio-shot')
      const product = one('#ss-product-art')
      if (!world || !layers.length) return

      const timeline = gsap.timeline()
      master = timeline
      if (!running) timeline.pause()

      /* ─────────────── เปิดฉาก ─────────────── */
      // ฉากยังโปร่งใสอยู่ (CSS ซ่อนไว้รอ) = สคริปต์มาทัน เล่นเปิดฉากได้โดยไม่มีภาพกระตุก
      // ถ้า CSS เปิดฉากเองไปแล้ว (เครื่องช้า) ข้ามไปเล่นแบบวนเลย ไม่ดับไฟที่ผู้ใช้เห็นอยู่แล้วลงมาใหม่
      const hidden = parseFloat(getComputedStyle(stage).opacity) < 0.05
      const playIntro = !introDone && hidden
      introDone = true

      let loopAt = 0.6
      if (playIntro) {
        loopAt = 2.9
        const intro = gsap.timeline()
        gsap.set(stage, { animation: 'none', opacity: 0 })
        gsap.set(q('.beam, .glow'), { opacity: 0 })
        gsap.set(q('.diffuser'), { opacity: 0.12 })
        gsap.set(q('.ss-pool'), { opacity: 0, scaleX: 0.3, svgOrigin: originOf(one('.ss-pool')) })
        gsap.set(layers, { y: (_: number, el: Element) => 34 * depthOf(el) })
        gsap.set(world, { scale: 1.05, transformOrigin: '50% 85%' })

        intro
          .to(stage, { opacity: 1, duration: 1.1, ease: 'power1.out' }, 0)
          .to(layers, { y: 0, duration: 2.2, ease: 'expo.out', stagger: { each: 0.05, from: 'end' } }, 0.05)
          .to(world, { scale: 1, duration: 2.6, ease: 'expo.out' }, 0.05)

        // ไฟสตูดิโอติดแบบวูบ-ดับ-ติด เหมือนแฟลชโมเดลลิ่งที่กำลังชาร์จ แล้วลำแสงค่อยสว่างตาม
        const strike = (diffuser: string, lights: string, at: number) =>
          intro
            .to(q(diffuser), {
              keyframes: [
                { opacity: 1, duration: 0.06 },
                { opacity: 0.3, duration: 0.09 },
                { opacity: 1, duration: 0.16 },
              ],
              ease: 'none',
            }, at)
            .to(q(lights), { opacity: 1, duration: 1.4, ease: 'power2.out' }, at + 0.1)

        strike('.diff-key', '.beam-key, .glow-key', 0.55)
        intro.to(q('.ss-pool'), { opacity: 1, scaleX: 1, duration: 1.9, ease: 'expo.out' }, 0.65)
        strike('.diff-fill', '.beam-fill, .glow-fill', 1.05)
        strike('.diff-boom', '.beam-boom, .glow-boom', 1.45)
        intro.to(q('.beam-bounce'), { opacity: 1, duration: 1.6, ease: 'power2.out' }, 1.75)
        intro.add(glint(), 1.95)
        timeline.add(intro, 0)
      }

      /* ─────────────── วนตลอด ─────────────── */
      const ambient = gsap.timeline()

      // คาบหายใจของแต่ละดวงไม่เท่ากัน จังหวะจึงไม่มาตรงกันซ้ำ ๆ จนสายตาจับได้ว่าเป็นลูป
      const breathe = (selector: string, low: number, duration: number, delay: number) =>
        ambient.to(q(selector), { opacity: low, duration, ease: 'sine.inOut', yoyo: true, repeat: -1 }, delay)
      breathe('.beam-key, .glow-key', 0.7, 7, 0)
      breathe('.beam-fill, .glow-fill', 0.66, 11, 1.4)
      breathe('.beam-boom, .glow-boom', 0.72, 9, 0.9)
      breathe('.beam-bounce', 0.55, 13, 2.2)

      ambient.fromTo(
        q('.boom-swing, .beam-boom, .glow-boom'),
        { rotation: -0.5 },
        { rotation: 0.5, svgOrigin: originOf(one('.boom-swing')), duration: 17, ease: 'sine.inOut', yoyo: true, repeat: -1 },
        0,
      )
      ambient.to(q('.person'), {
        scaleY: 1.007, svgOrigin: originOf(one('.person')), duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1,
      }, 0)
      // ระยะเลื่อนเป็นจำนวนเต็มเท่าของลายเส้นประ (2 + 7) รอยต่อของรอบจึงไม่กระตุก
      ambient.to(q('.turntable-rim'), { attr: { 'stroke-dashoffset': -90 }, duration: 9, ease: 'none', repeat: -1 }, 0)
      ambient.to(q('.rec-dot'), { opacity: 0.15, duration: 0.01, ease: 'none', yoyo: true, repeat: -1, repeatDelay: 1.75 }, 0)
      ambient.add(gsap.timeline({ repeat: -1, repeatDelay: 7.5, delay: 4 }).add(glint()), 0)

      q('.mote').forEach((mote, index) => {
        const near = mote.closest('.studio-layer') && depthOf(mote.closest('.studio-layer')!) >= 1
        ambient.to(mote, {
          x: `random(${near ? -40 : -24}, ${near ? 40 : 24})`,
          y: `random(${near ? -80 : -64}, -18)`,
          opacity: 'random(0.1, 0.8)',
          duration: 'random(7, 14)',
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          repeatRefresh: true,
        }, index * 0.6)
      })
      timeline.add(ambient, playIntro ? 2.2 : 0)

      /* ─────────────── ถ่ายภาพ ─────────────── */
      let shot = 412
      const brackets = q('.hud-brackets')
      const burst = q('.flash-pop')

      const shoot = gsap.timeline({ repeat: -1, repeatDelay: SHOT_EVERY - 2.6 })
      shoot
        .set(q('.hud'), { opacity: 1 })
        .set(q('.hud-lock'), { opacity: 0 })
        .fromTo(brackets, { opacity: 0, scale: 1.34 }, {
          opacity: 1, scale: 1, svgOrigin: originOf(brackets[0]), duration: 0.6, ease: 'expo.out',
        })
        // เลนส์หาโฟกัส วงแหวนเลื่อนไปมาสองสามครั้งก่อนเข้าที่
        .to(q('.lens-ring'), { x: 1.6, duration: 0.11, ease: 'sine.inOut', yoyo: true, repeat: 3 }, '<')
        .to(brackets, { opacity: 0.25, duration: 0.07, ease: 'none', yoyo: true, repeat: 3 }, '>')
        .set(q('.hud-lock'), { opacity: 1 }, '<0.14')
        // ปลายแขนหมุนรอบศอก นิ้วกดลงบนปุ่มชัตเตอร์
        .to(q('.shutter-arm'), {
          rotation: 3, svgOrigin: originOf(one('.shutter-arm')), duration: 0.13, ease: 'power2.in',
        }, '+=0.12')
        .addLabel('fire')
        .set(q('.flash-tube'), { opacity: 1 }, 'fire')
        .fromTo(burst, { opacity: 1, scale: 0.5 }, {
          opacity: 0, scale: 1.3, svgOrigin: originOf(burst[0]), duration: 0.5, ease: 'power2.out',
        }, 'fire')
        .fromTo(q('.flash-room'), { opacity: 0 }, { opacity: 0.95, duration: 0.05, ease: 'none' }, 'fire')
        .to(q('.flash-room'), { opacity: 0, duration: 0.75, ease: 'power2.out' }, 'fire+=0.05')
        .fromTo(q('.flash-spill'), { opacity: 0.9 }, { opacity: 0, duration: 0.65, ease: 'power2.out' }, 'fire')
        .to(q('.flash-tube'), { opacity: 0.55, duration: 0.6 }, 'fire+=0.1')
        // แสงแฟลชสะท้อนเพดานตกกลับลงมาโดนหน้าและแขนช่างภาพแวบหนึ่ง
        .fromTo(q('.flash-rim'), { opacity: 1 }, { opacity: 0, duration: 0.55, ease: 'power2.out' }, 'fire')
        .to(q('.shutter-arm'), { rotation: 0, duration: 0.3, ease: 'power2.out' }, 'fire+=0.08')
        .add(() => {
          shot += 1
          const name = `ALX_${String(shot).padStart(4, '0')}`
          const frame = one('.hud-frame')
          if (frame) frame.textContent = name
          // เว้นหนึ่งรอบถึงมีรูปลอย ลอยทุกรอบจะรกและแย่งความสนใจจากหัวเรื่อง
          if (shot % 2 === 1 && card && product) timeline.add(flyCard(card, product, name, wide), timeline.time())
        }, 'fire')
        .fromTo(q('.monitor-shot'), { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 'fire+=0.3')
        .to(q('.hud'), { opacity: 0, duration: 0.5, ease: 'power1.in' }, 'fire+=1')
      timeline.add(shoot, loopAt)

      /* ─────────────── ความลึกตามเมาส์และการเลื่อน ─────────────── */
      // เริ่มหลังแผ่นประกบเข้าที่ ไม่งั้นสองคำสั่งแย่งค่า y ของแผ่นเดียวกัน
      let teardown = () => {}
      timeline.add(() => {
        teardown = depthControls(hero, world, layers, pointer, () => running)
      }, playIntro ? 2.25 : 0)

      function glint() {
        return gsap
          .timeline()
          .fromTo(q('.glint'), { x: 0 }, { x: 88, duration: 1.5, ease: 'power2.inOut' })
          .fromTo(q('.glint'), { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'sine.out', yoyo: true, repeat: 1, repeatDelay: 0.6 }, 0)
      }

      return () => {
        teardown()
        gsap.killTweensOf([world, ...layers])
        gsap.set([world, ...layers], { clearProps: 'transform' })
        if (card) {
          gsap.killTweensOf(card)
          gsap.set(card, { clearProps: 'all' })
        }
        master = null
      }
    },
  )

  return {
    setRunning(next) {
      running = next
      if (!master) return
      if (next) master.resume()
      else master.pause()
    },
    destroy() {
      mm.revert()
    },
  }
}

/**
 * รูปที่ถ่ายได้ลอยออกจากตัวสินค้า หมุนแบบสามมิติมาหยุดลอยเหนือฉาก แล้วค่อย ๆ ปรากฏภาพ
 * ตำแหน่งเริ่มคำนวณจากกล่องของขวดบนจอจริง ไม่ใช่ค่าคงที่ เพราะฉากถูกตัดขอบต่างกันทุกขนาดจอ
 */
function flyCard(card: HTMLElement, product: Element, name: string, wide: boolean) {
  const stageBox = (card.offsetParent as HTMLElement | null)?.getBoundingClientRect()
  const box = product.getBoundingClientRect()
  const tl = gsap.timeline()
  if (!stageBox || !box.width) return tl

  const w = card.offsetWidth
  const h = card.offsetHeight
  const x0 = box.left - stageBox.left + box.width / 2 - w / 2
  const y0 = box.top - stageBox.top + box.height / 2 - h / 2
  const x1 = wide ? x0 + Math.min(stageBox.width * 0.09, 140) : x0 - w * 0.2
  const y1 = y0 - h * (wide ? 0.9 : 0.72) - (wide ? 30 : 8)
  const develop = card.querySelector('.studio-shot-develop')
  const label = card.querySelector('.studio-shot-name')

  return tl
    .add(() => {
      if (label) label.textContent = `${name}.RAW`
    })
    .set(card, {
      x: x0, y: y0, scale: 0.2, rotationX: 18, rotationY: -40, rotationZ: -8,
      transformPerspective: 900, autoAlpha: 0,
    })
    .set(develop, { opacity: 1 })
    .to(card, { autoAlpha: 1, duration: 0.14, ease: 'none' })
    .to(card, { x: x1, y: y1, scale: 1, rotationX: 6, rotationY: -16, rotationZ: 3, duration: 1.4, ease: 'expo.out' }, '<')
    // ภาพค่อยปรากฏจากขาวโพลนเหมือนฟิล์มอินสแตนต์ที่เพิ่งออกจากกล้อง
    .to(develop, { opacity: 0, duration: 1.8, ease: 'power1.inOut' }, '<0.3')
    .to(card, { y: y1 - 10, rotationY: -6, rotationZ: 1.5, duration: 2.6, ease: 'sine.inOut' }, '>-0.2')
    .to(card, {
      x: x1 + (wide ? 44 : 0), y: y1 - 34, scale: 0.9, rotationY: 14, autoAlpha: 0, duration: 0.9, ease: 'power2.in',
    })
}

/**
 * ความลึกแบบ 2.5 มิติ
 *
 * แผ่นใกล้เลื่อนตามเมาส์มากกว่าแผ่นไกล และทั้งฉากเอียงรอบแกนตั้งเล็กน้อย
 * เลื่อนหน้าลงแล้วฉากเอนไปด้านหลังและแผ่นใกล้ลอยขึ้นมากกว่า เห็นความลึกได้แม้บนมือถือที่ไม่มีเมาส์
 *
 * ใช้ quickTo ตัวเดียวต่อค่า ทุกเหตุการณ์แค่ส่งเป้าหมายใหม่ GSAP ไล่ค่าให้นุ่มเอง
 * การเลื่อนหน้าอ่านตำแหน่งครั้งเดียวต่อเฟรม ไม่อ่านทุกเหตุการณ์ scroll
 */
function depthControls(
  hero: HTMLElement,
  world: HTMLElement,
  layers: Element[],
  pointer: boolean,
  isRunning: () => boolean,
) {
  const ease = { duration: 1.2, ease: 'power3.out' }
  const rotY = gsap.quickTo(world, 'rotationY', ease)
  const rotX = gsap.quickTo(world, 'rotationX', ease)
  const moves = layers.map((el) => ({
    depth: depthOf(el),
    x: gsap.quickTo(el, 'x', ease),
    y: gsap.quickTo(el, 'y', ease),
  }))
  gsap.set(world, { transformOrigin: '50% 85%' })

  const state = { px: 0, py: 0, scroll: 0 }
  const apply = () => {
    if (!isRunning()) return
    rotY(state.px * 3.2)
    rotX(-state.py * 1.4 + state.scroll * SCROLL_TILT)
    for (const move of moves) {
      move.x(state.px * move.depth * POINTER_X)
      move.y(state.py * move.depth * POINTER_Y - state.scroll * move.depth * SCROLL_Y)
    }
  }

  const onPointer = (event: PointerEvent) => {
    const box = hero.getBoundingClientRect()
    state.px = ((event.clientX - box.left) / box.width) * 2 - 1
    state.py = ((event.clientY - box.top) / box.height) * 2 - 1
    apply()
  }
  const onLeave = () => {
    state.px = 0
    state.py = 0
    apply()
  }

  let frame = 0
  const readScroll = () => {
    frame = 0
    const box = hero.getBoundingClientRect()
    // 0 ตอนอยู่บนสุดของหน้า 1 ตอนเลื่อนพ้นส่วนเปิดหน้าไปทั้งหมดแล้ว
    state.scroll = gsap.utils.clamp(0, 1, -box.top / box.height)
    apply()
  }
  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(readScroll)
  }

  if (pointer) {
    hero.addEventListener('pointermove', onPointer, { passive: true })
    hero.addEventListener('pointerleave', onLeave, { passive: true })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  readScroll()

  return () => {
    hero.removeEventListener('pointermove', onPointer)
    hero.removeEventListener('pointerleave', onLeave)
    window.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
  }
}
