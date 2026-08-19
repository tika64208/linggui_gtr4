let timeSensor = null
let batterySensor = null
let minuteListener = null
let batteryListener = null
let turtleTimer = null
let turtleStep = 0
let uiRefs = {}
let pointRefs = []
let turtleRefs = []

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

function updateTurtles() {
  if (turtleRefs.length === 0) return
  const orbitSteps = 600
  for (let i = 0; i < TURTLE_CONFIGS.length; i += 1) {
    const config = TURTLE_CONFIGS[i]
    const orbitStep = mod(turtleStep - config.delay, orbitSteps)
    const angle = orbitStep * Math.PI * 2 / orbitSteps
    const radius = config.radius + 3 * Math.sin(angle * 2)
    const centerX = 233 + radius * Math.sin(angle)
    const centerY = 233 - radius * Math.cos(angle)
    const heading = orbitStep * 360 / orbitSteps + 90
    const pose = mod(turtleStep + config.poseOffset, 8)
    const halfSize = config.size / 2
    turtleRefs[i].setProperty(hmUI.prop.MORE, {
      x: px(Math.round(centerX - halfSize)),
      y: px(Math.round(centerY - halfSize)),
      w: px(config.size),
      h: px(config.size),
      center_x: px(halfSize),
      center_y: px(halfSize),
      angle: Math.round(heading),
      src: config.path + pose + '.png',
    })
  }
  turtleStep = (turtleStep + 1) % orbitSteps
}

function updateNeedles() {
  if (!timeSensor || !uiRefs.hourNeedle || !uiRefs.minuteNeedle) return
  const hourAngle = (timeSensor.hour % 12) * 30 + timeSensor.minute * 0.5
  const minuteAngle = timeSensor.minute * 6
  uiRefs.hourNeedle.setProperty(hmUI.prop.MORE, {
    x: px(0), y: px(0), w: px(466), h: px(466),
    center_x: px(231), center_y: px(231),
    angle: hourAngle,
    src: 'images/final/needles/hour.png',
  })
  uiRefs.minuteNeedle.setProperty(hmUI.prop.MORE, {
    x: px(0), y: px(0), w: px(466), h: px(466),
    center_x: px(231), center_y: px(231),
    angle: minuteAngle,
    src: 'images/final/needles/minute.png',
  })
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
  updateNeedles()
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
    turtleTimer = timer.createTimer(100, 100, updateTurtles, {})

    // Realistic acupuncture needles always render above text and turtles.
    uiRefs.hourNeedle = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(0), y: px(0), w: px(466), h: px(466),
      center_x: px(231), center_y: px(231), angle: 0,
      src: img('final/needles/hour.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.minuteNeedle = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(0), y: px(0), w: px(466), h: px(466),
      center_x: px(231), center_y: px(231), angle: 0,
      src: img('final/needles/minute.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })
    uiRefs.needlePivot = hmUI.createWidget(hmUI.widget.IMG, {
      x: px(0), y: px(0), w: px(466), h: px(466),
      src: img('final/needles/pivot.png'),
      show_level: hmUI.show_level.ONLY_NORMAL,
    })

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
