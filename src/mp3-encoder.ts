import { Mp3Encoder } from 'lamejs'
import { IConfig, IEncoder } from './types'
type Buffer = Int8Array

class Encoder implements IEncoder {
  private config: IConfig = {
    sampleRate: 44100,
    bitRate: 128
  }
  private mp3Encoder: Mp3Encoder
  /**
   * Audio is processed by frames of 1152 samples per audio channel
   * http://lame.sourceforge.net/tech-FAQ.txt
   */
  private maxSamples: number = 1152
  private samplesMono: Int16Array | null = null
  private dataBuffer: Array<Int8Array> = []

  constructor(config?: IConfig) {
    if (config) {
      Object.assign(this.config, config)
    }
    this.mp3Encoder = new Mp3Encoder(
      1,
      this.config.sampleRate!,
      this.config.bitRate!
    )
    this.clearBuffer()
  }

  /**
   * Clear active buffer
   */
  clearBuffer() {
    this.dataBuffer = []
  }

  /**
   * Append new audio buffer to current active buffer
   * @param {Buffer} buffer
   */
  appendToBuffer(buffer: Buffer) {
    this.dataBuffer.push(new Int8Array(buffer))
  }

  /**
   * Float current data to 16 bits PCM
   * @param {Float32Array} input
   * @param {Int16Array} output
   */
  floatTo16BitPCM(input: Float32Array, output: Int16Array) {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
  }

  /**
   * Convert buffer to proper format
   * @param {Float32Array} arrayBuffer
   */
  convertBuffer(arrayBuffer: Float32Array) {
    const data = new Float32Array(arrayBuffer)
    const out = new Int16Array(arrayBuffer.length)
    this.floatTo16BitPCM(data, out)
    return out
  }

  /**
   * Encode and append current buffer to dataBuffer
   * @param {Float32Array} arrayBuffer
   */
  encode(arrayBuffer: Float32Array) {
    this.samplesMono = this.convertBuffer(arrayBuffer)
    let remaining = this.samplesMono.length

    for (let i = 0; remaining >= 0; i += this.maxSamples) {
      const left = this.samplesMono.subarray(i, i + this.maxSamples)
      const mp3buffer = this.mp3Encoder.encodeBuffer(left)
      this.appendToBuffer(mp3buffer)
      remaining -= this.maxSamples
    }
  }

  /**
   * Return full dataBuffer
   */
  async finish() {
    this.appendToBuffer(this.mp3Encoder.flush())
    return this.dataBuffer
  }
}

export default Encoder
