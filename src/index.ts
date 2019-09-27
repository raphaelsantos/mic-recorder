import Mp3Encoder from './mp3-encoder';
import WavEncoder from './wav-encoder';
import { IEncoder } from './types'

interface IConfig {
  /**
   * 128 or 160 kbit/s – mid-range bitrate quality
   */
  bitRate?: number
  /**
   * There is a known issue with some macOS machines, where the recording
   * will sometimes have a loud 'pop' or 'pop-click' sound. This flag
   * prevents getting audio from the microphone a few milliseconds after
   * the begining of the recording. It also helps to remove the mouse
   * "click" sound from the output mp3 file.
   */
  startRecordingAt?: number
  sampleRate?: number
  encoder?: 'mp3' | 'wav'
}

class MicRecorder {
  private config: IConfig = {
    bitRate: 128,
    startRecordingAt: 300,
    sampleRate: 44100, // default to 44100, but will be changed to the actual used AudioContext samplerate
    encoder: 'mp3'
  }
  private activeStream: MediaStream | null = null
  private context: AudioContext
  private microphone: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private startTime: number = 0
  private timerToStart: number = -1
  private __encoder: IEncoder | null = null
  private __Context?:  {
    new (contextOptions?: AudioContextOptions | undefined): AudioContext;
    prototype: AudioContext;
  }
  constructor(config?: IConfig) {
    // @ts-ignore: 检测是否支持旧版的audioContext
    let Context = window.AudioContext || window.webkitAudioContext
    if (Context) {
      this.__Context = Context
      this.context = new Context()
    } else {
      throw new Error('Cannot initlize audio context!')
    }

    // TODO: because lamejs does not support mp3 resamping now, so it's required to set the input
    // sample rate to the context sample rate
    this.config.sampleRate = this.context.sampleRate
    if (config) {
      Object.assign(this.config, config)
    }
  }

  /**
   * Starts to listen for the microphone sound
   * @param {MediaStream} stream
   */
  addMicrophoneListener(stream: MediaStream) {
    this.activeStream = stream

    // This prevents the weird noise once you start listening to the microphone
    this.timerToStart = setTimeout(() => {
      delete this.timerToStart
    }, this.config.startRecordingAt)

    if (!this.context) {
      throw new Error('Invalid context')
    }
    // Set up Web Audio API to process data from the media stream (microphone).
    this.microphone = this.context.createMediaStreamSource(stream)

    // Settings a bufferSize of 0 instructs the browser to choose the best bufferSize
    this.processor = this.context.createScriptProcessor(0, 1, 1)
    if (!this.processor) {
      throw new Error('Invalid processor')
    }
    // Add all buffers from LAME into an array.
    this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
      if (this.timerToStart) {
        return
      }
      // Send microphone data to LAME for MP3 encoding while recording.
      if (!this.__encoder) {
        throw new Error('Invalid internal encoder')
      }
      this.__encoder.encode(event.inputBuffer.getChannelData(0))
    }

    // Begin retrieving microphone data.
    if (!this.microphone) {
      throw new Error('Invalid microphone')
    }
    this.microphone.connect(this.processor)
    this.processor.connect(this.context.destination)
  }

  /**
   * Disconnect microphone, processor and remove activeStream
   */
  stop(): this {
    if (!this.processor) {
      throw new Error('Invalid processor')
    }
    if (!this.context) {
      throw new Error('Invalid context')
    }
    if (!this.activeStream) {
      throw new Error('Invalid activesteam')
    }
    if (!this.microphone) {
      throw new Error('Invalid microphone')
    }
    // Clean up the Web Audio API resources.
    this.microphone.disconnect()
    this.processor.disconnect()
    // If all references using this.context are destroyed, context is closed
    // automatically. DOMException is fired when trying to close again
    if (this.context.state !== 'closed') {
      this.context.close()
    }
    this.processor.onaudioprocess = null
    // Stop all audio tracks. Also, removes recording icon from chrome tab
    this.activeStream.getAudioTracks().forEach(track => track.stop())
    return this
  }

  /**
   * Requests access to the microphone and start recording
   * @return Promise
   */
  start(): Promise<MediaStream> {
    // @ts-ignore: 检测是否支持旧版的audioContext
    this.context = new this.__Context()

    if (this.config.encoder === 'mp3') {
      this.__encoder = new Mp3Encoder(this.config) as IEncoder
    } else if (this.config.encoder === 'wav') {
      this.__encoder = new WavEncoder(this.config) as IEncoder
    }
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(stream => {
          this.addMicrophoneListener(stream)
          resolve(stream)
        })
        .catch(function(err) {
          reject(err)
        })
    })
  }

  /**
   * Return Mp3 Buffer and Blob with type mp3
   * @return {Promise<[Array<Int8Array>, Blob]>}
   */
  async getAudio(): Promise<[Array<Int8Array>, Blob]> {
    if (!this.__encoder) {
      throw new Error('Invalid encoder')
    }
    const finalBuffer = await this.__encoder.finish()
    if (finalBuffer && finalBuffer.length === 0) {
      throw new Error('No buffer to send')
    } else if (finalBuffer === null) {
      throw new Error('Invalid final buffer')
    } else {
      const res: [Int8Array[], Blob] = [
        finalBuffer,
        new Blob(finalBuffer, { type: `audio/${this.config.encoder}` })
      ]
      this.__encoder.clearBuffer()
      return res
    }
  }
};

export default MicRecorder;
