let timeSensor = null
let batterySensor = null
let minuteListener = null
let batteryListener = null
let turtleTimer = null
let turtleStep = 0
let uiRefs = {}
let pointRefs = []
let turtleRefs = []
let easterEggTurtleRefs = []
let easterEggActive = false
let easterEggTick = 0
let easterEggBaseStep = 0
let easterEggMinuteAngle = 0
let easterEggOverlapCount = 0

const TURTLE_CONFIGS = [
  { size: 120, radius: 177, delay: 0, poseOffset: 0, path: 'images/final/turtle/pose_' },
  { size: 72, radius: 179, delay: 60, poseOffset: 2, path: 'images/final/turtle/child1/pose_' },
  { size: 54, radius: 181, delay: 100, poseOffset: 4, path: 'images/final/turtle/child2/pose_' },
]

const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const POINTS = [
  { key: 'shenmai', name: '申脉', nums: [1], meridian: '通阳跷脉', pair: '后溪', pairMeridian: '通督脉' },
  { key: 'zhaohai', name: '照海', nums: [2, 5], meridian: '通阴跷脉', pair: '列缺', pairMeridian: '通任脉' },
  { key: 'waiguan', name: '外关', nums: [3], meridian: '通阳维脉', pair: '足临泣', pairMeridian: '通带脉' },
  { key: 'zulinqi', name: '足临泣', nums: [4], meridian: '通带脉', pair: '外关', pairMeridian: '通阳维脉' },
  { key: 'gongsun', name: '公孙', nums: [6], meridian: '通冲脉', pair: '内关', pairMeridian: '通阴维脉' },
  { key: 'houxi', name: '后溪', nums: [7], meridian: '通督脉', pair: '申脉', pairMeridian: '通阳跷脉' },
  { key: 'neiguan', name: '内关', nums: [8], meridian: '通阴维脉', pair: '公孙', pairMeridian: '通冲脉' },
  { key: 'lieque', name: '列缺', nums: [9], meridian: '通任脉', pair: '照海', pairMeridian: '通阴跷脉' },
]
const POINT_LAYOUT = [
  { key: 'lieque', name: '列缺', x: 201, y: 16 },
  { key: 'shenmai', name: '申脉', x: 339, y: 74 },
  { key: 'zhaohai', name: '照海', x: 402, y: 216 },
  { key: 'waiguan', name: '外关', x: 342, y: 352 },
  { key: 'zulinqi', name: '足临泣', x: 201, y: 411 },
  { key: 'gongsun', name: '公孙', x: 56, y: 352 },
  { key: 'houxi', name: '后溪', x: 0, y: 216 },
  { key: 'neiguan', name: '内关', x: 56, y: 74 },
]

function pad2(value) {
  return value < 10 ? '0' + value : '' + value
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

function dayNumber(year, month, day) {
  const a = Math.floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  return day + Math.floor((153 * m + 2) / 5) + 365 * y +
    Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045
}

function calculate(year, month, day, hour) {
  const dayIndex = mod(dayNumber(year, month, day) - dayNumber(2026, 8, 18), 60)
  const dayStem = dayIndex % 10
  const dayBranch = dayIndex % 12
  const hourBranch = Math.floor(((hour + 1) % 24) / 2)
  const hourStem = ((dayStem % 5) * 2 + hourBranch) % 10
  const dayStemNums = [10, 9, 7, 8, 7, 10, 9, 7, 8, 7]
  const dayBranchNums = [7, 10, 8, 8, 10, 7, 7, 10, 9, 9, 10, 7]
  const hourStemNums = [9, 8, 7, 6, 5, 9, 8, 7, 6, 5]
  const hourBranchNums = [9, 8, 7, 6, 5, 4, 9, 8, 7, 6, 5, 4]
  const total = dayStemNums[dayStem] + dayBranchNums[dayBranch] +
    hourStemNums[hourStem] + hourBranchNums[hourBranch]
  const divisor = dayStem % 2 === 0 ? 9 : 6
  let remainder = total % divisor
  if (remainder === 0) remainder = divisor
  let point = POINTS[0]
  for (let i = 0; i < POINTS.length; i += 1) {
    if (POINTS[i].nums.indexOf(remainder) >= 0) {
      point = POINTS[i]
      break
    }
  }
  return { dayStem, dayBranch, hourStem, hourBranch, divisor, remainder, point }
}

function textWidget(x, y, w, h, text, size, color, align) {
  return hmUI.createWidget(hmUI.widget.TEXT, {
    x: px(x), y: px(y), w: px(w), h: px(h),
    text: text,
    color: color,
    text_size: px(size),
    text_style: hmUI.text_style.NONE,
    align_h: align === undefined ? hmUI.align.CENTER_H : align,
    align_v: hmUI.align.CENTER_V,
    show_level: hmUI.show_level.ONLY_NORMAL,
  })
}

function setText(widget, text, color) {
  if (!widget) return
  const options = { text: text }
  if (color) options.color = color
  widget.setProperty(hmUI.prop.MORE, options)
}

function signedAngleDifference(angle, target) {
  return mod(angle - target + 180, 360) - 180
}

function smoothProgress(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function updateEasterEggTurtles() {
  const baseAngle = easterEggBaseStep * 360 / 600
  const needleAngle = easterEggMinuteAngle
  const waitingOffsets = [0, -7, -13]
  const landingOffsets = [16, 10, 4]
  // Do not restore the normal (under-hand) layer until even the smallest
  // turtle is safely beyond both hands and their normal crossing effects.
  // With the 60-degree child delay, +92 leaves the smallest turtle at +32.
  const exitBaseAngle = needleAngle + 92
  const tick = easterEggTick

  for (let i = 0; i < TURTLE_CONFIGS.length; i += 1) {
    const config = TURTLE_CONFIGS[i]
    const delayAngle = config.delay * 360 / 600
    const startAngle = baseAngle - delayAngle
    let angle = startAngle
    let radius = config.radius
    let movementHeading = angle + 90
    let playfulTurn = 0
    let liftScale = 1

    if (tick < 30) {
      // The mother stops while both children close the gap behind her.
      const progress = smoothProgress(tick / 30)
      const waitingAngle = baseAngle + waitingOffsets[i]
      angle = startAngle + (waitingAngle - startAngle) * progress
      movementHeading = angle + 90
    } else if (tick < 110) {
      // Cross over the minute hand instead of travelling along it. The mother
      // goes first and each child follows a little later.
      const stagger = i * 8
      const progress = smoothProgress((tick - 30 - stagger) / (80 - stagger))
      const waitingAngle = baseAngle + waitingOffsets[i]
      const landingAngle = needleAngle + landingOffsets[i]
      angle = waitingAngle + signedAngleDifference(landingAngle, waitingAngle) * progress
      const lift = Math.sin(progress * Math.PI)
      radius = config.radius + lift * (i === 0 ? 13 : (i === 1 ? 9 : 7))
      movementHeading = angle + 90
      playfulTurn = Math.sin(progress * Math.PI * 3 + i) * lift * (i === 0 ? 5 : 8)
      liftScale = 1 + lift * (i === 0 ? 0.08 : 0.06)
    } else {
      // Land, fan back into the normal spacing and keep moving clockwise.
      const progress = smoothProgress((tick - 110) / 69)
      const finalAngle = exitBaseAngle - delayAngle
      const landingAngle = needleAngle + landingOffsets[i]
      angle = landingAngle + signedAngleDifference(finalAngle, landingAngle) * progress
      const finalRadians = finalAngle * Math.PI / 180
      const finalRadius = config.radius + 3 * Math.sin(finalRadians * 2)
      radius = config.radius + (finalRadius - config.radius) * progress
      movementHeading = angle + 90
      playfulTurn = Math.sin(progress * Math.PI * 2 + i) * (1 - progress) * 4
    }

    const radians = angle * Math.PI / 180
    const centerX = 233 + radius * Math.sin(radians)
    const centerY = 233 - radius * Math.cos(radians)
    const renderedSize = Math.round(config.size * liftScale)
    const halfSize = renderedSize / 2
    const exitStep = mod(exitBaseAngle * 600 / 360, 600)
    const animatedPose = mod(Math.floor(easterEggBaseStep + tick * 0.5) + config.poseOffset, 8)
    // Match the exact normal-orbit pose on the final visible overlay frame.
    const pose = tick >= 179
      ? mod(Math.floor(exitStep) + config.poseOffset, 8)
      : animatedPose
    easterEggTurtleRefs[i].setProperty(hmUI.prop.MORE, {
      x: px(Math.round(centerX - halfSize)),
      y: px(Math.round(centerY - halfSize)),
      w: px(renderedSize),
      h: px(renderedSize),
      center_x: px(halfSize),
      center_y: px(halfSize),
      angle: Math.round(movementHeading + playfulTurn),
      src: config.path + pose + '.png',
    })
  }

  easterEggTick += 1
  if (easterEggTick >= 180) {
    turtleStep = mod(exitBaseAngle * 600 / 360, 600)
    easterEggActive = false
    // Draw the normal layer at the exact hand-off coordinates before hiding
    // the overlay. This removes the previous one-timer-tick blank flash.
    updateTurtles()
    for (let i = 0; i < easterEggTurtleRefs.length; i += 1) {
      easterEggTurtleRefs[i].setProperty(hmUI.prop.MORE, { x: px(-500), y: px(-500) })
    }
  }
}

function turtleCrossingEffect(turtleIndex, orbitAngle) {
  if (!timeSensor) return { angleOffset: 0, radial: 0, turn: 0, scaleX: 1, scaleY: 1 }

  const hourAngle = (timeSensor.hour % 12) * 30 + timeSensor.minute * 0.5
  const hourDelta = signedAngleDifference(orbitAngle, hourAngle)
  const minuteAngle = timeSensor.minute * 6
  const minuteDelta = signedAngleDifference(orbitAngle, minuteAngle)
  const strength = turtleIndex === 0 ? 1 : (turtleIndex === 1 ? 0.72 : 0.60)
  const nervous = turtleIndex === 2 ? 1 : (turtleIndex === 0 ? 0.25 : 0)

  // The hour-hand story takes priority whenever both hands are close.
  if (hourDelta >= -24 && hourDelta <= 20) {
    if (hourDelta < -18) {
      const probe = (hourDelta + 24) / 6
      const hesitation = Math.sin(probe * Math.PI)
      return {
        angleOffset: -hesitation * (1.5 + nervous * 4),
        radial: 0,
        turn: Math.sin(probe * Math.PI * 4) * (4 + nervous * 8),
        scaleX: 1 - hesitation * 0.02 * nervous,
        scaleY: 1 - hesitation * 0.02 * nervous,
      }
    }

    if (hourDelta < -3) {
      const climb = (hourDelta + 18) / 15
      const stair = Math.min(1, Math.floor(climb * 4) / 3)
      const visualDelta = -18 + climb * 6
      return {
        angleOffset: (visualDelta - hourDelta) * strength - Math.sin(climb * Math.PI) * 3 * nervous,
        radial: stair * 14 * strength,
        turn: -Math.sin(climb * Math.PI * 3) * 8 * strength +
          Math.sin(climb * Math.PI * 6) * 6 * nervous,
        scaleX: 1 + stair * 0.07 * strength,
        scaleY: 1 + stair * 0.07 * strength,
      }
    }

    if (hourDelta < 9) {
      const leap = (hourDelta + 3) / 12
      const eased = leap * leap * (3 - 2 * leap)
      const visualDelta = -12 + eased * 20
      const height = Math.sin(leap * Math.PI)
      return {
        angleOffset: (visualDelta - hourDelta) * strength - height * 4 * nervous,
        radial: ((1 - leap) * 14 + height * 8) * strength,
        turn: -height * 11 * strength + Math.sin(leap * Math.PI * 2) * 8 * nervous,
        scaleX: 1 + ((1 - leap) * 0.07 + height * 0.14) * strength,
        scaleY: 1 + ((1 - leap) * 0.07 + height * 0.14) * strength,
      }
    }

    // Rotate between a clean landing, a stumble and a small overshoot so the
    // family does not repeat exactly the same performance every minute.
    const landing = (hourDelta - 9) / 11
    const eased = landing * landing * (3 - 2 * landing)
    const visualDelta = 8 + eased * 12
    const impact = Math.sin(landing * Math.PI)
    const ending = timeSensor.minute % 3
    const stumble = ending === 1 ? 1 : (ending === 2 ? 0.65 : 0.38)
    const overshoot = ending === 2 ? impact * 5 : 0
    const landingScale = 1 + impact * 0.04 * strength
    return {
      angleOffset: (visualDelta - hourDelta) * strength + overshoot,
      radial: -impact * (5 + stumble * 3) * strength,
      turn: Math.sin(landing * Math.PI * (3 + nervous * 2)) *
        (1 - landing) * 30 * stumble * (1 + nervous * 0.45),
      scaleX: landingScale,
      scaleY: landingScale,
    }
  }

  // Under the minute hand the turtles briefly accelerate without deformation.
  // The movement starts and ends on the normal orbit, so it never drifts.
  if (minuteDelta >= -8 && minuteDelta <= 8) {
    const duck = (minuteDelta + 8) / 16
    const envelope = Math.sin(duck * Math.PI)
    return {
      angleOffset: envelope * (2.5 + turtleIndex * 0.5),
      radial: -envelope * 3 * strength,
      turn: Math.sin(duck * Math.PI * 2) * 4 * strength,
      scaleX: 1,
      scaleY: 1,
    }
  }

  return { angleOffset: 0, radial: 0, turn: 0, scaleX: 1, scaleY: 1 }
}

function updateTurtles() {
  if (turtleRefs.length === 0) return
  const orbitSteps = 600

  if (timeSensor && !easterEggActive) {
    const hourAngle = (timeSensor.hour % 12) * 30 + timeSensor.minute * 0.5
    const minuteAngle = timeSensor.minute * 6
    const handGap = Math.abs(signedAngleDifference(hourAngle, minuteAngle))
    if (handGap >= 10) easterEggOverlapCount = 0

    const motherAngle = mod(turtleStep, orbitSteps) * 360 / orbitSteps
    // Start two minute marks before the minute hand. The mother pauses here
    // for the children, then the family crosses over the hand together.
    const gatheringAngle = mod(minuteAngle - 12, 360)
    const motherAtGate = Math.abs(signedAngleDifference(motherAngle, gatheringAngle)) < 4
    if (easterEggOverlapCount < 3 && handGap < 10 && motherAtGate) {
      easterEggActive = true
      easterEggTick = 0
      easterEggBaseStep = turtleStep
      easterEggMinuteAngle = minuteAngle
      easterEggOverlapCount += 1
      for (let i = 0; i < turtleRefs.length; i += 1) {
        turtleRefs[i].setProperty(hmUI.prop.MORE, { x: px(-500), y: px(-500) })
      }
    }
  }

  if (easterEggActive) {
    updateEasterEggTurtles()
    return
  }

  for (let i = 0; i < TURTLE_CONFIGS.length; i += 1) {
    const config = TURTLE_CONFIGS[i]
    const orbitStep = mod(turtleStep - config.delay, orbitSteps)
    const orbitAngle = orbitStep * 360 / orbitSteps
    const crossing = turtleCrossingEffect(i, orbitAngle)
    const visualOrbitAngle = orbitAngle + crossing.angleOffset
    const visualAngle = visualOrbitAngle * Math.PI / 180
    const radius = config.radius + 3 * Math.sin(visualAngle * 2) + crossing.radial
    const centerX = 233 + radius * Math.sin(visualAngle)
    const centerY = 233 - radius * Math.cos(visualAngle)
    const heading = visualOrbitAngle + 90 + crossing.turn
    const pose = mod(Math.floor(turtleStep) + config.poseOffset, 8)
    const renderedWidth = Math.round(config.size * crossing.scaleX)
    const renderedHeight = Math.round(config.size * crossing.scaleY)
    const halfWidth = renderedWidth / 2
    const halfHeight = renderedHeight / 2
    turtleRefs[i].setProperty(hmUI.prop.MORE, {
      x: px(Math.round(centerX - halfWidth)),
      y: px(Math.round(centerY - halfHeight)),
      w: px(renderedWidth),
      h: px(renderedHeight),
      center_x: px(halfWidth),
      center_y: px(halfHeight),
      angle: Math.round(heading),
      src: config.path + pose + '.png',
    })
  }
  turtleStep = (turtleStep + 0.5) % orbitSteps
}

function refresh() {
  if (!timeSensor) return
  const result = calculate(timeSensor.year, timeSensor.month, timeSensor.day, timeSensor.hour)
  setText(uiRefs.shichen, BRANCHES[result.hourBranch] + '时 · ' + STEMS[result.hourStem] + BRANCHES[result.hourBranch])
  if (uiRefs.point) uiRefs.point.setProperty(hmUI.prop.SRC, 'images/final/main/' + result.point.key + '.png')
  setText(uiRefs.meridian, result.point.meridian + ' · 余数 ' + result.remainder)
  if (uiRefs.pair) uiRefs.pair.setProperty(hmUI.prop.SRC, 'images/final/pair/' + result.point.key + '.png')
  setText(uiRefs.date, pad2(timeSensor.month) + '月' + pad2(timeSensor.day) + '日 ' + WEEKDAYS[timeSensor.week - 1])
  setText(uiRefs.day, STEMS[result.dayStem] + BRANCHES[result.dayBranch] + '日 · ' + (result.divisor === 9 ? '阳' : '阴'))
  for (let i = 0; i < pointRefs.length; i += 1) {
    const active = pointRefs[i].name === result.point.name
    pointRefs[i].widget.setProperty(
      hmUI.prop.SRC,
      'images/final/points/' + pointRefs[i].key + (active ? '-active.png' : '-idle.png')
    )
  }
  if (batterySensor) setText(uiRefs.battery, '电量 ' + batterySensor.current + '%')
  if (uiRefs.aodPoint) {
    uiRefs.aodPoint.setProperty(hmUI.prop.SRC, 'images/final/aod/main/' + result.point.key + '.png')
  }
  setText(uiRefs.aodDate, pad2(timeSensor.month) + '月' + pad2(timeSensor.day) + '日 ' + WEEKDAYS[timeSensor.week - 1])
}

function createAodView(img) {
  // AOD is deliberately static: no turtle timer and no animated widgets.
  hmUI.createWidget(hmUI.widget.IMG, {
    x: px(0), y: px(0), w: px(466), h: px(466),
    src: img('final/aod/background.png'),
    show_level: hmUI.show_level.ONAL_AOD,
  })

  const timeDigits = []
  for (let digit = 0; digit < 10; digit += 1) {
    timeDigits.push(img('final/aod/time/' + digit + '.png'))
  }
  uiRefs.aodTime = hmUI.createWidget(hmUI.widget.IMG_TIME, {
    hour_zero: 1,
    hour_startX: px(139), hour_startY: px(92),
    hour_array: timeDigits, hour_space: 0,
    minute_zero: 1,
    minute_startX: px(251), minute_startY: px(92),
    minute_array: timeDigits, minute_space: 0,
    show_level: hmUI.show_level.ONAL_AOD,
  })
  hmUI.createWidget(hmUI.widget.IMG, {
    x: px(224), y: px(92), w: px(18), h: px(70),
    src: img('final/aod/time/colon.png'),
    show_level: hmUI.show_level.ONAL_AOD,
  })

  uiRefs.aodPoint = hmUI.createWidget(hmUI.widget.IMG, {
    x: px(103), y: px(272), w: px(260), h: px(66),
    src: img('final/aod/main/shenmai.png'),
    show_level: hmUI.show_level.ONAL_AOD,
  })
  uiRefs.aodDate = hmUI.createWidget(hmUI.widget.TEXT, {
    x: px(143), y: px(365), w: px(180), h: px(30),
    text: '08月18日 周二',
    color: 0x426C5A,
    text_size: px(15),
    text_style: hmUI.text_style.NONE,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V,
    show_level: hmUI.show_level.ONAL_AOD,
  })

  // Native TIME_POINTER keeps both hands accurate while AOD JavaScript sleeps.
  uiRefs.aodNeedles = hmUI.createWidget(hmUI.widget.TIME_POINTER, {
    hour_centerX: px(231), hour_centerY: px(231),
    hour_posX: px(231), hour_posY: px(231),
    hour_path: img('final/aod/needles/hour.png'),
    minute_centerX: px(231), minute_centerY: px(231),
    minute_posX: px(231), minute_posY: px(231),
    minute_path: img('final/aod/needles/minute.png'),
    minute_cover_path: img('final/aod/needles/pivot.png'),
    minute_cover_x: px(0), minute_cover_y: px(0),
    show_level: hmUI.show_level.ONAL_AOD,
  })

  try {
    timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
    minuteListener = function () { refresh() }
    timeSensor.addEventListener(timeSensor.event.MINUTEEND, minuteListener)
    refresh()
  } catch (error) {
    console.log('灵龟息屏数据初始化失败：' + error)
  }
}

WatchFace({
  init_view() {
    const img = function (path) { return 'images/' + path }

    // Zepp OS 1.0 returns a loosely typed screen value on GTR 4.
    if (hmSetting.getScreenType() == hmSetting.screen_type.AOD) {
      createAodView(img)
      return
    }

    // Bitmap rendering stays on the verified official Timer path; only the asset changes.
    hmUI.createWidget(hmUI.widget.IMG, {
      x: px(0), y: px(0), w: px(466), h: px(466),
      src: img('final/bg.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })

    for (let i = 0; i < POINT_LAYOUT.length; i += 1) {
      const item = POINT_LAYOUT[i]
      const widget = hmUI.createWidget(hmUI.widget.IMG, {
        x: px(item.x), y: px(item.y), w: px(64), h: px(40),
        src: img('final/points/' + item.key + '-idle.png'),
        show_level: hmUI.show_level.ONLY_NORMAL,
      })
      pointRefs.push({
        key: item.key,
        name: item.name,
        widget: widget,
      })
    }

    // Fixed-width bitmaps preserve the original design font and optical spacing.
    const timeDigits = []
    for (let digit = 0; digit < 10; digit += 1) timeDigits.push(img('final/time/' + digit + '.png'))
    uiRefs.time = hmUI.createWidget(hmUI.widget.IMG_TIME, {
      hour_zero: 1,
      hour_startX: px(139), hour_startY: px(91),
      hour_array: timeDigits, hour_space: 0,
      minute_zero: 1,
      minute_startX: px(251), minute_startY: px(91),
      minute_array: timeDigits, minute_space: 0,
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.colon = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(224), y: px(91), w: px(18), h: px(70),
      src: img('final/time/colon.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    hmUI.createWidget(hmUI.widget.IMG, {
      x: px(185), y: px(70), w: px(8), h: px(8),
      src: img('final/live-dot.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.shichen = textWidget(177, 57, 150, 32, '酉时 · 癸酉', 15, '0xFFB9F5D9')
    uiRefs.title = textWidget(83, 186, 300, 25, '灵龟八法 · 此时开穴', 14, '0xFF8FA99B')
    uiRefs.point = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(103), y: px(214), w: px(260), h: px(66),
      src: img('final/main/houxi.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.meridian = textWidget(103, 286, 260, 29, '通阳跷脉 · 余数 1', 15, '0xFF8FA99B')
    uiRefs.pair = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(155), y: px(323), w: px(156), h: px(38),
      src: img('final/pair/shenmai.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.date = textWidget(86, 383, 112, 24, '08月18日 周二', 12, '0xFF8FA99B', hmUI.align.LEFT)
    uiRefs.day = textWidget(183, 383, 120, 24, '甲子日 · 阳', 13, '0xFFD8E8DF')
    uiRefs.battery = textWidget(298, 383, 82, 24, '电量 --%', 12, '0xFF8FA99B', hmUI.align.RIGHT)

    // The hour hand remains mechanically intact below the turtle family.
    uiRefs.hourNeedle = hmUI.createWidget(hmUI.widget.TIME_POINTER, {
      hour_centerX: px(231), hour_centerY: px(231),
      hour_posX: px(231), hour_posY: px(231),
      hour_path: img('final/needles/hour.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })

    // Mother turtle leads clockwise; two smaller turtles follow on the same orbit.
    for (let i = 0; i < TURTLE_CONFIGS.length; i += 1) {
      const config = TURTLE_CONFIGS[i]
      const halfSize = config.size / 2
      turtleRefs.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: px(233 - halfSize), y: px(53 - halfSize),
        w: px(config.size), h: px(config.size),
        center_x: px(halfSize), center_y: px(halfSize), angle: 90,
        src: config.path + '0.png',
        show_level: hmUI.show_level.ONLY_NORMAL,
      }))
    }
    updateTurtles()

    // The minute hand stays above the turtles; only the hour hand is occluded.
    uiRefs.minuteNeedle = hmUI.createWidget(hmUI.widget.TIME_POINTER, {
      minute_centerX: px(231), minute_centerY: px(231),
      minute_posX: px(231), minute_posY: px(231),
      minute_path: img('final/needles/minute.png'),
      minute_cover_path: img('final/needles/pivot.png'),
      minute_cover_x: px(0), minute_cover_y: px(0),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })

    // During the minute-hand easter egg, a second turtle layer is shown above
    // the hand so the family appears to stand on and crawl along the needle.
    for (let i = 0; i < TURTLE_CONFIGS.length; i += 1) {
      const config = TURTLE_CONFIGS[i]
      const halfSize = config.size / 2
      easterEggTurtleRefs.push(hmUI.createWidget(hmUI.widget.IMG, {
        x: px(-500), y: px(-500),
        w: px(config.size), h: px(config.size),
        center_x: px(halfSize), center_y: px(halfSize), angle: 90,
        src: config.path + '0.png',
        show_level: hmUI.show_level.ONLY_NORMAL,
      }))
    }
    turtleTimer = timer.createTimer(50, 50, updateTurtles, {})

    try {
      timeSensor = hmSensor.createSensor(hmSensor.id.TIME)
      batterySensor = hmSensor.createSensor(hmSensor.id.BATTERY)
      minuteListener = function () { refresh() }
      batteryListener = function () { refresh() }
      timeSensor.addEventListener(timeSensor.event.MINUTEEND, minuteListener)
      batterySensor.addEventListener(hmSensor.event.CHANGE, batteryListener)
      refresh()
    } catch (error) {
      console.log('灵龟动态数据初始化失败：' + error)
    }
  },

  onInit() {
    console.log('灵龟八法 API 1.0 init')
  },

  build() {
    this.init_view()
  },

  onDestroy() {
    if (timeSensor && minuteListener) timeSensor.removeEventListener(timeSensor.event.MINUTEEND, minuteListener)
    if (batterySensor && batteryListener) batterySensor.removeEventListener(hmSensor.event.CHANGE, batteryListener)
    if (turtleTimer) timer.stopTimer(turtleTimer)
  },
})
