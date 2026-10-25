import type { CSSProperties } from 'react'

const glimmers = [
  [7, 21],
  [18, 74],
  [31, 11],
  [44, 89],
  [57, 37],
  [68, 9],
  [82, 61],
  [94, 27],
  [11, 91],
  [75, 86],
  [38, 55],
  [89, 46],
  [5, 53],
  [22, 34],
  [34, 82],
  [48, 17],
  [61, 72],
  [79, 23],
  [91, 80],
  [15, 13],
  [26, 94],
  [53, 64],
  [71, 48],
  [97, 58],
  [9, 68],
  [41, 31],
  [66, 92],
  [85, 6],
  [29, 60],
  [58, 4],
]

export default function Starfield() {
  return (
    <div className="space-motion" aria-hidden="true">
      {glimmers.map(([left, top], index) => (
        <i
          key={index}
          className="star-glimmer"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDuration: `${2.8 + (index % 5) * 0.65}s`,
            animationDelay: `${-index * 1.7}s`,
          }}
        />
      ))}
      {[0, 1, 2].map((index) => (
        <i
          key={`meteor-${index}`}
          className="shooting-star"
          style={
            {
              '--meteor-left': `${[94, 72, 108][index]}%`,
              '--meteor-top': `${[12, 5, 48][index]}%`,
              animationDuration: `${[19, 27, 33][index]}s`,
              animationDelay: `${[4, 13, 24][index]}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
}
