/**
 * ---------------------------------------------------------------------------
 *  SIGNATURE PAD — HTML5 Canvas
 * ---------------------------------------------------------------------------
 *  Works with EVERY input device:
 *      * finger        (touch)
 *      * tablet stylus / active pen (pointerType === 'pen', pressure aware)
 *      * mouse / trackpad
 *      * Apple Pencil, Samsung S-Pen, Wacom, Surface Pen
 *
 *  It uses Pointer Events, which unify mouse / touch / pen in one API, with a
 *  mouse + touch fallback for older browsers.
 *
 *  Details that matter in practice at a trade-show booth:
 *      * the page never scrolls or zooms while somebody is drawing
 *        (touch-action: none + preventDefault + a body scroll lock)
 *      * the canvas is HiDPI-correct, so the line is crisp on a retina tablet
 *      * the canvas is re-sized on rotation without losing the drawing
 *      * quadratic smoothing makes even a shaky finger signature look clean
 *      * pen pressure changes the stroke width when the device reports it
 *      * the drawing is lifted into the PARENT's state after every stroke, so
 *        stepping Back and Forward through the form never loses a signature
 * ---------------------------------------------------------------------------
 */
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef
} from 'react'
import { useI18n } from '../../i18n'

const SignaturePad = forwardRef(function SignaturePad(
  {
    height = 230,
    penColor = '#1E1E1E',
    minWidth = 1.1,
    maxWidth = 3.2,
    /** PNG data URL to restore (so Back / Next never loses the signature) */
    value = null,
    /** called with the PNG data URL after every stroke, or null after Clear */
    onChange,
    disabled = false
  },
  ref
) {
  const { t } = useI18n()
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const ctxRef = useRef(null)
  const drawingRef = useRef(false)
  const pointsRef = useRef([])
  const lastWidthRef = useRef((minWidth + maxWidth) / 2)
  const strokesRef = useRef([]) // kept so a resize can redraw
  const baseImageRef = useRef(null) // restored drawing (from `value`)
  const emptyRef = useRef(true)
  const onChangeRef = useRef(onChange)
  const [isEmpty, setIsEmpty] = useState(!value)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  /* ------------------------------------------------------------- sizing -- */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const width = wrap.clientWidth || 600
    canvas.width = Math.floor(width * ratio)
    canvas.height = Math.floor(height * ratio)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    const ctx = canvas.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(ratio, ratio)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = penColor
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)
    ctxRef.current = ctx

    // 1) a previously restored image (coming back to this step)
    if (baseImageRef.current) {
      try {
        ctx.drawImage(baseImageRef.current, 0, 0, width, height)
      } catch {
        /* ignore */
      }
    }

    // 2) strokes drawn in this session
    strokesRef.current.forEach((stroke) => {
      for (let i = 1; i < stroke.length; i += 1) {
        const a = stroke[i - 1]
        const b = stroke[i]
        ctx.beginPath()
        ctx.lineWidth = b.w
        ctx.moveTo(a.x, a.y)
        ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
    })
  }, [height, penColor])

  useEffect(() => {
    redraw()
    const onResize = () => redraw()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [redraw])

  /* ------------------------------------------------- restore from `value` -- */
  useEffect(() => {
    if (!value) {
      baseImageRef.current = null
      return
    }
    // Only restore once, on mount / when a different image arrives.
    if (baseImageRef.current?.dataUrl === value) return
    const img = new Image()
    img.onload = () => {
      img.dataUrl = value
      baseImageRef.current = img
      emptyRef.current = false
      setIsEmpty(false)
      redraw()
    }
    img.src = value
  }, [value, redraw])

  /* ------------------------------------------------------------ drawing -- */

  const pointFromEvent = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0
    // pressure: pens report 0..1; mouse/finger report 0 or 0.5 -> treat as mid
    let pressure = typeof e.pressure === 'number' ? e.pressure : 0
    if (!pressure || pressure <= 0) pressure = 0.5
    return { x: clientX - rect.left, y: clientY - rect.top, p: pressure }
  }

  const widthFor = (pressure) => {
    const target = minWidth + (maxWidth - minWidth) * Math.min(pressure * 1.4, 1)
    const w = lastWidthRef.current * 0.6 + target * 0.4
    lastWidthRef.current = w
    return w
  }

  const emit = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const url = emptyRef.current ? null : canvas.toDataURL('image/png')
    onChangeRef.current?.(url)
  }, [])

  const clear = useCallback(() => {
    strokesRef.current = []
    pointsRef.current = []
    baseImageRef.current = null
    emptyRef.current = true
    setIsEmpty(true)
    redraw()
    onChangeRef.current?.(null)
  }, [redraw])

  /* ------------------------- refs holding the latest props for the listeners */
  const disabledRef = useRef(disabled)
  const penColorRef = useRef(penColor)
  const minWidthRef = useRef(minWidth)
  const maxWidthRef = useRef(maxWidth)
  const widthForRef = useRef(widthFor)
  const emitRef = useRef(emit)
  useEffect(() => {
    disabledRef.current = disabled
    penColorRef.current = penColor
    minWidthRef.current = minWidth
    maxWidthRef.current = maxWidth
    widthForRef.current = widthFor
    emitRef.current = emit
  })

  /* --------------------------------------------------- native listeners -- */
  // Registered natively (not via React props) so we can use passive:false and
  // reliably call preventDefault on touch devices. Registered ONCE — all the
  // mutable state lives in refs, so the listeners never need re-binding (a
  // re-bind would drop the body scroll-lock in the middle of a signature).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return () => {}

    const supportsPointer = typeof window !== 'undefined' && 'PointerEvent' in window

    const startStroke = (e) => {
      if (disabledRef.current) return
      const ctx = ctxRef.current
      if (!ctx) return
      drawingRef.current = true
      lastWidthRef.current = (minWidthRef.current + maxWidthRef.current) / 2
      const pt = pointFromEvent(e)
      pt.w = widthForRef.current(pt.p)
      pointsRef.current = [pt]
      strokesRef.current.push(pointsRef.current)

      // a single tap should still leave a dot
      ctx.beginPath()
      ctx.fillStyle = penColorRef.current
      ctx.arc(pt.x, pt.y, pt.w / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'

      if (emptyRef.current) {
        emptyRef.current = false
        setIsEmpty(false)
      }
      document.body.classList.add('cm-no-scroll')
    }

    const moveStroke = (e) => {
      if (!drawingRef.current) return
      const ctx = ctxRef.current
      if (!ctx) return
      const pts = pointsRef.current
      const prev = pts[pts.length - 1]
      if (!prev) return
      const pt = pointFromEvent(e)
      const dist = Math.hypot(pt.x - prev.x, pt.y - prev.y)
      if (dist < 0.7) return
      pt.w = widthForRef.current(pt.p)
      pts.push(pt)

      const mid = { x: (prev.x + pt.x) / 2, y: (prev.y + pt.y) / 2 }
      ctx.beginPath()
      ctx.lineWidth = pt.w
      ctx.moveTo(prev.x, prev.y)
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y)
      ctx.lineTo(pt.x, pt.y)
      ctx.stroke()
    }

    const endStroke = () => {
      drawingRef.current = false
      pointsRef.current = []
      document.body.classList.remove('cm-no-scroll')
      emitRef.current()
    }

    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      if (supportsPointer && canvas.setPointerCapture && e.pointerId !== undefined) {
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          /* ignore */
        }
      }
      startStroke(e)
    }
    const move = (e) => {
      if (!drawingRef.current) return
      e.preventDefault()
      if (typeof e.getCoalescedEvents === 'function') {
        const list = e.getCoalescedEvents()
        if (list && list.length) {
          list.forEach((ce) => moveStroke(ce))
          return
        }
      }
      moveStroke(e)
    }
    const up = (e) => {
      if (!drawingRef.current) return
      e.preventDefault()
      endStroke()
    }

    if (supportsPointer) {
      canvas.addEventListener('pointerdown', down, { passive: false })
      canvas.addEventListener('pointermove', move, { passive: false })
      window.addEventListener('pointerup', up, { passive: false })
      window.addEventListener('pointercancel', up, { passive: false })
    } else {
      canvas.addEventListener('mousedown', down)
      canvas.addEventListener('mousemove', move)
      window.addEventListener('mouseup', up)
      canvas.addEventListener('touchstart', down, { passive: false })
      canvas.addEventListener('touchmove', move, { passive: false })
      window.addEventListener('touchend', up, { passive: false })
    }

    return () => {
      if (supportsPointer) {
        canvas.removeEventListener('pointerdown', down)
        canvas.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        window.removeEventListener('pointercancel', up)
      } else {
        canvas.removeEventListener('mousedown', down)
        canvas.removeEventListener('mousemove', move)
        window.removeEventListener('mouseup', up)
        canvas.removeEventListener('touchstart', down)
        canvas.removeEventListener('touchmove', move)
        window.removeEventListener('touchend', up)
      }
      document.body.classList.remove('cm-no-scroll')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* --------------------------------------------------------------- API -- */
  const toDataURL = useCallback(() => {
    if (emptyRef.current) return null
    const canvas = canvasRef.current
    if (!canvas) return null
    return canvas.toDataURL('image/png')
  }, [])

  useImperativeHandle(
    ref,
    () => ({ clear, toDataURL, isEmpty: () => emptyRef.current }),
    [clear, toDataURL]
  )

  /* ------------------------------------------------------------- render -- */
  return (
    <div className="cm-sig-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="cm-sig-canvas"
        style={{ height }}
        aria-label={t('kiosk.signHere')}
      />
      {isEmpty && (
        <>
          <div className="cm-sig-baseline" />
          <div className="cm-sig-placeholder">{t('kiosk.signHere')}</div>
        </>
      )}
      <div className="cm-sig-bar">
        <span className="cm-small cm-faint">{t('kiosk.signHint')}</span>
        <button
          type="button"
          className="cm-btn cm-btn-ghost cm-btn-sm"
          onClick={clear}
          disabled={isEmpty || disabled}
        >
          {t('kiosk.clearSignature')}
        </button>
      </div>
    </div>
  )
})

export default SignaturePad
