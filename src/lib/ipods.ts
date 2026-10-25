export const IPOD_IDS = [
  'classic4',
  'mini2',
  'nano3',
  'nano5',
  'classic160',
  'shuffle2',
] as const
export type IpodModelId = (typeof IPOD_IDS)[number]
export type IpodFinishId =
  | 'white'
  | 'silver'
  | 'black'
  | 'blue'
  | 'pink'
  | 'green'
  | 'red'
  | 'purple'
  | 'orange'
  | 'yellow'
export interface IpodSelection {
  model: IpodModelId
  finish: IpodFinishId
}
export interface IpodScreen {
  width: number
  height: number
  y: number
  color: boolean
  portrait?: boolean
  pixels: [number, number]
}
export interface IpodDefinition {
  id: IpodModelId
  name: string
  generation: string
  year: number
  description: string
  mm: [number, number, number]
  width: number
  height: number
  depth: number
  radius: number
  material: 'plastic' | 'aluminum' | 'polished'
  screen: IpodScreen | null
  wheel: { radius: number; y: number; center: number }
  finishes: IpodFinishId[]
  defaultFinish: IpodFinishId
  chromeBack: boolean
  capacity: string
  source: string
}
export const IPOD_FINISHES: Record<
  IpodFinishId,
  { name: string; color: string; wheel: string }
> = {
  white: { name: 'White', color: '#f6f5ed', wheel: '#e7e8df' },
  silver: { name: 'Silver', color: '#c6cbd0', wheel: '#eeeee9' },
  black: { name: 'Black', color: '#303239', wheel: '#242529' },
  blue: { name: 'Blue', color: '#64a9d6', wheel: '#f0f0e9' },
  pink: { name: 'Pink', color: '#dc83ab', wheel: '#f0f0e9' },
  green: { name: 'Green', color: '#a7c762', wheel: '#f0f0e9' },
  red: { name: '(PRODUCT) RED', color: '#bb344b', wheel: '#f0f0e9' },
  purple: { name: 'Purple', color: '#9673c6', wheel: '#202127' },
  orange: { name: 'Orange', color: '#e89744', wheel: '#f0f0e9' },
  yellow: { name: 'Yellow', color: '#e2c44f', wheel: '#f0f0e9' },
}
// One shared scale preserves the relative sizes of the actual devices.
const unit = 4.4 / 104.1
function dimensions(height: number, width: number, depth: number) {
  return {
    mm: [height, width, depth] as [number, number, number],
    width: width * unit,
    height: height * unit,
    depth: depth * unit,
  }
}
export const IPODS: IpodDefinition[] = [
  {
    id: 'classic4',
    name: 'iPod',
    generation: '4th generation',
    year: 2004,
    description:
      'The original white shell. Monochrome LCD. A proper Click Wheel.',
    ...dimensions(104.1, 60.9, 14.5),
    radius: 0.25,
    material: 'plastic',
    screen: {
      width: 2.0,
      height: 1.6,
      y: 1.02,
      color: false,
      pixels: [160, 128],
    },
    wheel: { radius: 0.79, y: -0.94, center: 0.287 },
    finishes: ['white'],
    defaultFinish: 'white',
    chromeBack: true,
    capacity: '20 GB',
    source: 'https://support.apple.com/en-us/103823',
  },
  {
    id: 'mini2',
    name: 'iPod mini',
    generation: '2nd generation',
    year: 2005,
    description:
      'Anodized aluminum, rounded sides, and a blue-white monochrome display.',
    ...dimensions(91.4, 50.8, 12.7),
    radius: 0.16,
    material: 'aluminum',
    screen: {
      width: 1.4,
      height: 1.116,
      y: 0.91,
      color: false,
      pixels: [138, 110],
    },
    wheel: { radius: 0.7, y: -0.77, center: 0.255 },
    finishes: ['silver', 'blue', 'pink', 'green'],
    defaultFinish: 'blue',
    chromeBack: false,
    capacity: '6 GB',
    source: 'https://support.apple.com/en-tm/112317',
  },
  {
    id: 'nano3',
    name: 'iPod nano',
    generation: '3rd generation',
    year: 2007,
    description:
      'The short, wide nano. A two-inch color screen and polished steel back.',
    ...dimensions(69.8, 52.3, 6.5),
    radius: 0.22,
    material: 'aluminum',
    screen: {
      width: 1.718,
      height: 1.289,
      y: 0.55,
      color: true,
      pixels: [320, 240],
    },
    wheel: { radius: 0.52, y: -0.82, center: 0.19 },
    finishes: ['silver', 'black', 'blue', 'green', 'red', 'pink'],
    defaultFinish: 'green',
    chromeBack: true,
    capacity: '8 GB',
    source:
      'https://www.apple.com/newsroom/2007/09/05Apple-Introduces-All-New-iPod-nano/',
  },
  {
    id: 'nano5',
    name: 'iPod nano',
    generation: '5th generation',
    year: 2009,
    description:
      'Curved polished aluminum, a tall color display, and the tiny rear camera.',
    ...dimensions(90.7, 38.7, 6.2),
    radius: 0.13,
    material: 'polished',
    screen: {
      width: 1.25,
      height: 1.96,
      y: 0.58,
      color: true,
      portrait: true,
      pixels: [240, 376],
    },
    wheel: { radius: 0.595, y: -1.16, center: 0.218 },
    finishes: [
      'silver',
      'black',
      'purple',
      'blue',
      'green',
      'yellow',
      'orange',
      'red',
      'pink',
    ],
    defaultFinish: 'purple',
    chromeBack: false,
    capacity: '16 GB',
    source:
      'https://www.apple.com/newsroom/2009/09/09Apple-Introduces-New-iPod-nano-With-Built-in-Video-Camera/',
  },
  {
    id: 'classic160',
    name: 'iPod classic',
    generation: '160 GB',
    year: 2009,
    description:
      'Brushed aluminum, a stainless steel back, and the split-pane color interface.',
    ...dimensions(103.5, 61.8, 10.5),
    radius: 0.23,
    material: 'aluminum',
    screen: {
      width: 2.147,
      height: 1.61,
      y: 1.04,
      color: true,
      pixels: [320, 240],
    },
    wheel: { radius: 0.82, y: -0.96, center: 0.3 },
    finishes: ['silver', 'black'],
    defaultFinish: 'silver',
    chromeBack: true,
    capacity: '160 GB',
    source: 'https://support.apple.com/en-il/112601',
  },
  {
    id: 'shuffle2',
    name: 'iPod shuffle',
    generation: '2nd generation',
    year: 2006,
    description:
      'A tiny aluminum clip, a physical control pad, and absolutely no screen.',
    ...dimensions(27.3, 41.2, 10.5),
    radius: 0.09,
    material: 'aluminum',
    screen: null,
    wheel: { radius: 0.45, y: 0, center: 0.255 },
    finishes: ['silver', 'blue', 'pink', 'green', 'orange'],
    defaultFinish: 'silver',
    chromeBack: false,
    capacity: '1 GB',
    source: 'https://support.apple.com/en-al/112321',
  },
]
export const DEFAULT_IPOD: IpodSelection = {
  model: 'classic4',
  finish: 'white',
}
export function ipodAppearance(selection: IpodSelection) {
  const finish = IPOD_FINISHES[selection.finish]
  const anodizedCenter = ['nano3', 'nano5', 'classic160'].includes(
    selection.model
  )
  const dark =
    selection.model === 'nano5'
      ? ['silver', 'black'].includes(selection.finish)
      : selection.finish === 'black'
  return {
    ...finish,
    wheel: dark ? '#242529' : '#eeeee8',
    center:
      anodizedCenter || selection.model === 'classic4'
        ? finish.color
        : '#eeeee8',
    ink: dark ? '#d4d7da' : '#69716c',
    dark,
  }
}
export function ipodDefinition(id: unknown): IpodDefinition {
  return IPODS.find((model) => model.id === id) || IPODS[0]
}
export function normalizeIpod(value: unknown): IpodSelection {
  const candidate = value as Partial<IpodSelection> | null
  const model = ipodDefinition(candidate?.model)
  return {
    model: model.id,
    finish: model.finishes.includes(candidate?.finish as IpodFinishId)
      ? candidate!.finish!
      : model.defaultFinish,
  }
}
