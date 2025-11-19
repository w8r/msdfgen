import { describe, it, expect } from 'vitest'
import { Bitmap } from './Bitmap'
import { YAxisOrientation } from './YAxisOrientation'

describe('Bitmap', () => {
  describe('constructor', () => {
    it('should create empty bitmap with zero dimensions', () => {
      const bmp = new Bitmap(Float32Array, 1, 0, 0)
      expect(bmp.width()).toBe(0)
      expect(bmp.height()).toBe(0)
      expect(bmp.channelCount()).toBe(1)
    })

    it('should create bitmap with specified dimensions', () => {
      const bmp = new Bitmap(Float32Array, 3, 10, 20)
      expect(bmp.width()).toBe(10)
      expect(bmp.height()).toBe(20)
      expect(bmp.channelCount()).toBe(3)
    })

    it('should use default Y-axis orientation when not specified', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5)
      expect(bmp.getYOrientation()).toBe(YAxisOrientation.Y_UPWARD)
    })

    it('should use specified Y-axis orientation', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5, YAxisOrientation.Y_DOWNWARD)
      expect(bmp.getYOrientation()).toBe(YAxisOrientation.Y_DOWNWARD)
    })

    it('should create Float64Array bitmap', () => {
      const bmp = new Bitmap(Float64Array, 1, 5, 5)
      expect(bmp.data()).toBeInstanceOf(Float64Array)
    })

    it('should create Uint8Array bitmap', () => {
      const bmp = new Bitmap(Uint8Array, 1, 5, 5)
      expect(bmp.data()).toBeInstanceOf(Uint8Array)
    })

    it('should create Uint8ClampedArray bitmap', () => {
      const bmp = new Bitmap(Uint8ClampedArray, 4, 5, 5)
      expect(bmp.data()).toBeInstanceOf(Uint8ClampedArray)
    })

    it('should allocate correct array size for single channel', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10)
      expect(bmp.data().length).toBe(100)
    })

    it('should allocate correct array size for three channels', () => {
      const bmp = new Bitmap(Float32Array, 3, 10, 10)
      expect(bmp.data().length).toBe(300)
    })

    it('should allocate correct array size for four channels', () => {
      const bmp = new Bitmap(Float32Array, 4, 10, 10)
      expect(bmp.data().length).toBe(400)
    })
  })

  describe('pixel operations', () => {
    it('should set and get pixel values (single channel)', () => {
      const bmp = new Bitmap(Float32Array, 1, 5, 5)
      bmp.setPixel(2, 3, [42.5])
      expect(bmp.getChannel(2, 3, 0)).toBe(42.5)
    })

    it('should set and get pixel values (three channels)', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.setPixel(1, 2, [1.0, 2.0, 3.0])
      expect(bmp.getChannel(1, 2, 0)).toBe(1.0)
      expect(bmp.getChannel(1, 2, 1)).toBe(2.0)
      expect(bmp.getChannel(1, 2, 2)).toBe(3.0)
    })

    it('should get pixel as typed array view', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.setPixel(2, 1, [10, 20, 30])
      const pixel = bmp.getPixel(2, 1)
      expect(pixel.length).toBe(3)
      expect(pixel[0]).toBe(10)
      expect(pixel[1]).toBe(20)
      expect(pixel[2]).toBe(30)
    })

    it('should set individual channel values', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.setChannel(0, 0, 0, 1.5)
      bmp.setChannel(0, 0, 1, 2.5)
      bmp.setChannel(0, 0, 2, 3.5)
      expect(bmp.getChannel(0, 0, 0)).toBe(1.5)
      expect(bmp.getChannel(0, 0, 1)).toBe(2.5)
      expect(bmp.getChannel(0, 0, 2)).toBe(3.5)
    })

    it('should handle corner pixels correctly', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10)
      bmp.setPixel(0, 0, [1])
      bmp.setPixel(9, 0, [2])
      bmp.setPixel(0, 9, [3])
      bmp.setPixel(9, 9, [4])
      expect(bmp.getChannel(0, 0, 0)).toBe(1)
      expect(bmp.getChannel(9, 0, 0)).toBe(2)
      expect(bmp.getChannel(0, 9, 0)).toBe(3)
      expect(bmp.getChannel(9, 9, 0)).toBe(4)
    })
  })

  describe('fill operations', () => {
    it('should fill entire bitmap with single value', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.fill(42.0)
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 5; x++) {
          for (let c = 0; c < 3; c++) {
            expect(bmp.getChannel(x, y, c)).toBe(42.0)
          }
        }
      }
    })

    it('should fill bitmap with channel-specific values', () => {
      const bmp = new Bitmap(Float32Array, 3, 3, 3)
      bmp.fillChannels([1.0, 2.0, 3.0])
      for (let y = 0; y < 3; y++) {
        for (let x = 0; x < 3; x++) {
          expect(bmp.getChannel(x, y, 0)).toBe(1.0)
          expect(bmp.getChannel(x, y, 1)).toBe(2.0)
          expect(bmp.getChannel(x, y, 2)).toBe(3.0)
        }
      }
    })
  })

  describe('copy operations', () => {
    it('should copy from another bitmap of same size', () => {
      const bmp1 = new Bitmap(Float32Array, 3, 5, 5)
      bmp1.setPixel(2, 2, [1, 2, 3])

      const bmp2 = new Bitmap(Float32Array, 3, 5, 5)
      bmp2.copyFrom(bmp1)

      expect(bmp2.getChannel(2, 2, 0)).toBe(1)
      expect(bmp2.getChannel(2, 2, 1)).toBe(2)
      expect(bmp2.getChannel(2, 2, 2)).toBe(3)
    })

    it('should reallocate when copying from different size bitmap', () => {
      const bmp1 = new Bitmap(Float32Array, 3, 5, 5)
      bmp1.fill(42)

      const bmp2 = new Bitmap(Float32Array, 3, 10, 10)
      bmp2.copyFrom(bmp1)

      expect(bmp2.width()).toBe(5)
      expect(bmp2.height()).toBe(5)
      expect(bmp2.getChannel(0, 0, 0)).toBe(42)
    })

    it('should preserve Y-axis orientation when copying', () => {
      const bmp1 = new Bitmap(Float32Array, 1, 5, 5, YAxisOrientation.Y_DOWNWARD)
      const bmp2 = new Bitmap(Float32Array, 1, 5, 5)
      bmp2.copyFrom(bmp1)

      expect(bmp2.getYOrientation()).toBe(YAxisOrientation.Y_DOWNWARD)
    })
  })

  describe('ref and section conversion', () => {
    it('should create a BitmapRef', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.setPixel(1, 1, [10, 20, 30])

      const ref = bmp.ref()
      expect(ref.width).toBe(5)
      expect(ref.height).toBe(5)
      expect(ref.getChannel(1, 1, 0)).toBe(10)
    })

    it('should create a BitmapSection', () => {
      const bmp = new Bitmap(Float32Array, 3, 5, 5)
      bmp.setPixel(2, 2, [1, 2, 3])

      const section = bmp.section()
      expect(section.width).toBe(5)
      expect(section.height).toBe(5)
      expect(section.getChannel(2, 2, 0)).toBe(1)
    })

    it('should create a sub-section of bitmap', () => {
      const bmp = new Bitmap(Float32Array, 1, 10, 10)
      for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
          bmp.setPixel(x, y, [x + y * 10])
        }
      }

      const section = bmp.getSection(2, 3, 5, 7)
      expect(section.width).toBe(3)
      expect(section.height).toBe(4)

      // (2, 3) in original should be (0, 0) in section
      expect(section.getChannel(0, 0, 0)).toBe(2 + 3 * 10)
    })
  })

  describe('data access', () => {
    it('should provide direct access to underlying typed array', () => {
      const bmp = new Bitmap(Float32Array, 3, 2, 2)
      const data = bmp.data()

      expect(data).toBeInstanceOf(Float32Array)
      expect(data.length).toBe(12) // 2 * 2 * 3
    })

    it('should reflect changes made to data array', () => {
      const bmp = new Bitmap(Float32Array, 1, 3, 3)
      const data = bmp.data()
      data[0] = 99

      expect(bmp.getChannel(0, 0, 0)).toBe(99)
    })
  })

  describe('edge cases', () => {
    it('should handle 1x1 bitmap', () => {
      const bmp = new Bitmap(Float32Array, 3, 1, 1)
      bmp.setPixel(0, 0, [1, 2, 3])
      expect(bmp.getChannel(0, 0, 0)).toBe(1)
      expect(bmp.getChannel(0, 0, 1)).toBe(2)
      expect(bmp.getChannel(0, 0, 2)).toBe(3)
    })

    it('should handle large bitmaps', () => {
      const bmp = new Bitmap(Float32Array, 3, 100, 100)
      expect(bmp.data().length).toBe(30000)
      bmp.setPixel(99, 99, [1, 2, 3])
      expect(bmp.getChannel(99, 99, 1)).toBe(2)
    })

    it('should handle Uint8Array clamping correctly', () => {
      const bmp = new Bitmap(Uint8ClampedArray, 1, 5, 5)
      bmp.setPixel(0, 0, [300]) // Should clamp to 255
      bmp.setPixel(1, 0, [-10]) // Should clamp to 0
      expect(bmp.getChannel(0, 0, 0)).toBe(255)
      expect(bmp.getChannel(1, 0, 0)).toBe(0)
    })
  })
})
