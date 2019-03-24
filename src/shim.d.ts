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