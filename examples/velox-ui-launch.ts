import { createVideo, scene, shape, text, uiDemo } from '@velox-video/core'

const ink = '#08090f'
const paper = '#f7f4ff'
const muted = '#a5a1b3'
const violet = '#927bff'

const scenes = [
  scene(4)
    .background(ink)
    .camera('slowPush')
    .story({ chapter: 'The idea', focus: 'A simple idea becomes motion' })
    .add(
      shape.line(680).pos(640, 170).color('rgba(146,123,255,0.56)').thickness(2).in('expandX', 0.65),
      text('Skip the timeline.')
        .pos(640, 316).size(78).weight(760).color(paper).in('slideUp', 0.7),
      text('Describe what you want to see.')
        .pos(640, 414).size(27).color(muted).in('fadeIn', 0.55, { delay: 0.18 }),
      shape.circle(8).pos(640, 544).color(violet).in('spring', 0.4, { delay: 0.35 }),
    ),

  scene(9)
    .background('#0b0c13')
    .camera('slowPush')
    .mood('cinematic')
    .overlay({ vignetteOpacity: 0.18, grainOpacity: 0 })
    .story({ chapter: 'The interaction', focus: 'A cursor builds and renders a video' })
    .add(uiDemo({
      app: 'Velox Studio',
      title: 'Create a launch video',
      prompt: 'Make a premium product launch video with a moving camera.',
      action: 'Render video',
      result: 'Your video is ready',
      accent: violet,
      theme: 'dark',
    }).center()),

  scene(4)
    .background(ink)
    .camera('slowPush')
    .story({ chapter: 'The authoring', focus: 'One short call creates the interaction' })
    .add(
      text('One small instruction.')
        .pos(640, 272).size(52).weight(720).color(paper).in('slideUp', 0.55),
      shape.rect(790, 84).pos(640, 414).color('#151520').radius(18).in('zoomIn', 0.42, { delay: 0.18 }),
      text('uiDemo({ prompt: "Make a launch video." })')
        .pos(640, 414).size(25).font('monospace').color('#c8bbff').in('typewriter', 0.8, { delay: 0.25 }),
    ),

  scene(4)
    .background(ink)
    .story({ chapter: 'The finish', focus: 'Velox turns ideas into moving product stories' })
    .add(
      text('Make the next cut yours.')
        .pos(640, 308).size(65).weight(760).color(paper).in('slideUp', 0.65),
      shape.line(208).pos(640, 394).color(violet).thickness(3).in('expandX', 0.55, { delay: 0.15 }),
      text('pnpm add -D velox-video')
        .pos(640, 482).size(25).font('monospace').color(muted).in('typewriter', 0.75, { delay: 0.28 }),
    ),
]

scenes.slice(0, -1).forEach((shot, index) => {
  shot.transition(index % 2 === 0 ? 'blurDissolve' : 'zoomSmooth', 0.45)
})

export default createVideo({
  size: '720p',
  fps: 30,
  theme: 'obsidian',
  background: ink,
  motionQuality: 'standard',
  visualWorld: {
    name: 'Velox violet studio',
    material: 'matte graphite',
    lighting: 'violet edge light',
    texture: 'fine grain',
    motif: 'a cursor moving from idea to result',
    depth: 'layered',
    palette: { background: ink, foreground: paper, accent: violet, muted },
  },
  scenes,
})
