import { IConfig, IEncoder } from './types'
import WavEncoder from 'wav-encoder'
import resampler from './resampler'

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
      if (this.config.sampleRate !== 41000) {
        data = await resampler(new File([data], Date.now() + '.wav'), this.config.sampleRate!)
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