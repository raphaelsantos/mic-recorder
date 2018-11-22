import Encoder from './encoder';

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
  deviceId?: string
  sampleRate?: number
}

class MicRecorder {
  private config: IConfig = {
    bitRate: 128,
    startRecordingAt: 300,
    deviceId: 'default',
    sampleRate: 44000
  }
  private activeStream: MediaStream | null = null
  private context: AudioContext | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private processor: ScriptProcessorNode | null = null
  private startTime: number = 0
  private timerToStart: number = -1
  private lameEncoder: Encoder | null = null
  constructor(config?: IConfig) {
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

    // Set up Web Audio API to process data from the media stream (microphone).
    this.microphone =
      this.context && this.context.createMediaStreamSource(stream)

    // Settings a bufferSize of 0 instructs the browser to choose the best bufferSize
    this.processor = this.context && this.context.createScriptProcessor(0, 1, 1)

    // Add all buffers from LAME into an array.
    this.processor &&
      (this.processor.onaudioprocess = (event: AudioProcessingEvent) => {
        if (this.timerToStart) {
          return
        }
        // Send microphone data to LAME for MP3 encoding while recording.
        this.lameEncoder &&
          this.lameEncoder.encode(event.inputBuffer.getChannelData(0))
      })

    // Begin retrieving microphone data.
    this.microphone && this.processor && this.microphone.connect(this.processor)
    this.processor &&
      this.context &&
      this.processor.connect(this.context.destination)
  }

  /**
   * Disconnect microphone, processor and remove activeStream
   */
  stop(): this {
    if (this.processor && this.microphone) {
      // Clean up the Web Audio API resources.
      this.microphone.disconnect()
      this.processor.disconnect()

      // If all references using this.context are destroyed, context is closed
      // automatically. DOMException is fired when trying to close again
      if (this.context && this.context.state !== 'closed') {
        this.context.close()
      }

      this.processor.onaudioprocess = null

      // Stop all audio tracks. Also, removes recording icon from chrome tab
      this.activeStream &&
        this.activeStream.getAudioTracks().forEach(track => track.stop())
    }

    return this
  }

  /**
   * Requests access to the microphone and start recording
   * @return Promise
   */
  start(): Promise<MediaStream> {
    this.context = new AudioContext()
    this.config.sampleRate = this.context.sampleRate
    this.lameEncoder = new Encoder(this.config)
    const audio = { deviceId: { exact: this.config.deviceId } }
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia({ audio })
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
  getMp3(): Promise<[Array<Int8Array>, Blob]> {
    const finalBuffer = this.lameEncoder && this.lameEncoder.finish()
    return new Promise((resolve, reject) => {
      if (finalBuffer && finalBuffer.length === 0) {
        reject(new Error('No buffer to send'))
      } else if (finalBuffer === null) {
        reject(new Error('Invalid final buffer'))
      } else {
        const res: [Array<Int8Array>, Blob] = [
          finalBuffer,
          new Blob(finalBuffer, { type: 'audio/mp3' })
        ]
        resolve(res)
        this.lameEncoder && this.lameEncoder.clearBuffer()
      }
    })
  }
};

export default MicRecorder;
