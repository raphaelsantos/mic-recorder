declare module 'lamejs' {
  export class Mp3Encoder {
    constructor(channels: number, samplerate: number, kbps: number)
    encodeBuffer(left: Int16Array, right?: Int16Array): Int8Array
    flush(): Int8Array
  }
}

declare module 'wav-encoder' {
  interface AudioData {
    sampleRate: number
    channelData: Float32Array[]
  }
  export function encode(data: AudioData): Promise<ArrayBuffer>
}

// declare module 'audio-resampler' {
//   type GetAudioBufferCallback = (buffer: AudioBuffer) => void
//   type GetFileCallback = (objectUrl: string) => void
//   export default function(
//     input: string | File | AudioBuffer,
//     targetSampleRate: number,
//     oncomplete: (event: {
//       getAudioBuffer: (cb: GetAudioBufferCallback) => void
//       getFile: (cb: GetFileCallback) => void
//     }) => void
//   ): void
// }

declare module 'audio-buffer-from' {
  interface IOptions {
    length?: number,
    context?: AudioContext
    channels?: number
    sampleRate?: number
    format?: string
  }
  export default function (data: Float32Array, options: IOptions):AudioBuffer
}