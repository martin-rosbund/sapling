/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('node:fs')
const path = require('node:path')
const { createCanvas } = require('canvas')

const root = path.resolve(__dirname, '..')
const outputPath = path.join(root, 'src', 'assets', 'songbird-icon.png')
const size = 512
const canvas = createCanvas(size, size)
const ctx = canvas.getContext('2d')
const scale = size / 100

function sx(value) {
  return value * scale
}

function fillPath(points) {
  ctx.beginPath()
  for (const point of points) {
    if (point[0] === 'M') {
      ctx.moveTo(sx(point[1]), sx(point[2]))
    } else if (point[0] === 'L') {
      ctx.lineTo(sx(point[1]), sx(point[2]))
    } else if (point[0] === 'C') {
      ctx.bezierCurveTo(
        sx(point[1]),
        sx(point[2]),
        sx(point[3]),
        sx(point[4]),
        sx(point[5]),
        sx(point[6]),
      )
    } else if (point[0] === 'Q') {
      ctx.quadraticCurveTo(sx(point[1]), sx(point[2]), sx(point[3]), sx(point[4]))
    }
  }
  ctx.closePath()
  ctx.fill()
}

ctx.clearRect(0, 0, size, size)
ctx.fillStyle = '#ffffff'
ctx.imageSmoothingEnabled = true
ctx.imageSmoothingQuality = 'high'

// Notenkopf: groß und rund, damit die Note auch bei Button-Größe lesbar bleibt.
ctx.save()
ctx.translate(sx(28), sx(72))
ctx.rotate((-18 * Math.PI) / 180)
ctx.beginPath()
ctx.ellipse(0, 0, sx(17.5), sx(12.5), 0, 0, Math.PI * 2)
ctx.fill()
ctx.restore()

// Notenhals mit weicher Verbindung in Richtung Vogel.
ctx.beginPath()
ctx.roundRect(sx(39), sx(30), sx(10), sx(43), sx(4.6))
ctx.fill()

fillPath([
  ['M', 44, 31],
  ['C', 49, 32, 54, 36, 59, 41],
  ['C', 56, 43, 52, 45, 48, 45],
  ['C', 44, 44, 41, 42, 39, 40],
  ['L', 39, 34],
  ['C', 40, 32, 42, 31, 44, 31],
])

// Vogelkoerper mit Schnabel: eine einfache Silhouette, nicht detailreich.
fillPath([
  ['M', 48, 43],
  ['C', 58, 35, 70, 33, 82, 39],
  ['C', 86, 41, 90, 42, 94, 41],
  ['C', 91, 44, 88, 47, 84, 49],
  ['C', 80, 58, 70, 64, 57, 64],
  ['C', 50, 64, 44, 62, 39, 58],
  ['C', 44, 54, 48, 49, 48, 43],
])

// Grosser Fluegel: der musikalische Schwung geht in den Vogel ueber.
fillPath([
  ['M', 43, 21],
  ['C', 57, 26, 68, 34, 76, 45],
  ['C', 69, 45, 62, 43, 55, 39],
  ['C', 49, 35, 44, 29, 43, 21],
])

// Schwanzfedern, bewusst als zwei klare Zacken.
fillPath([
  ['M', 56, 63],
  ['L', 43, 82],
  ['L', 64, 68],
])

fillPath([
  ['M', 65, 62],
  ['L', 61, 87],
  ['L', 75, 66],
])

fs.writeFileSync(outputPath, canvas.toBuffer('image/png'))
console.log(outputPath)
