import { IConfig, IEncoder } from './types'
import WavEncoder from 'wav-encoder'
import resampler from './resampler'
import createBuffer from 'audio-buffer-from'

class Encoder implements IEncoder {
  private config: IConfig = {
    sampleRate: 44100
  }
  private dataBuffer: number[] = []
  constructor(config?: IConfig) {
    if (config) {
      Object.assign(this.config, config)
    }
    this.clearBuffer()
  }

  encode(arrayBuffer: Float32Array) {
    this.dataBuffer.push(...arrayBuffer.map(e => e))
  }

  clearBuffer() {
    this.dataBuffer = []
  }

  async finish(): Promise<Int8Array[]> {
    try {
      let data = Float32Array.from(this.dataBuffer)
      // 如果并非默认的41000，则需要进行resample
      if (this.config.sampleRate !== 44100) {
        let inputBuffer = createBuffer(data, {
          sampleRate: 44100,
          channels: 1
        })
        let resampledBuffer = await resampler(inputBuffer, this.config.sampleRate!)
        data = resampledBuffer.getChannelData(0)
      }
      let resBuffer = await WavEncoder.encode({
        sampleRate: this.config.sampleRate!,
        channelData: [data]
      })
      return [new Int8Array(resBuffer)]
    } catch (error) {
      throw error
    }
  }
}

export default Encoder