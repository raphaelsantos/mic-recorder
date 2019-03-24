import { IConfig, IEncoder } from './types'
import WavEncoder from 'wav-encoder'

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

  finish(): Promise<Int8Array[]> {
    return WavEncoder.encode({
      sampleRate: this.config.sampleRate!,
      channelData: [
        Float32Array.from(this.dataBuffer)
      ]
    }).then(res => {
      return Promise.resolve([new Int8Array(res)])
    })
  }
}

export default Encoder