import resampler from 'audio-resampler'

export default function (inputFile: File, targetSampleRate: number): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    resampler(inputFile, targetSampleRate, event => {
      event.getAudioBuffer((buffer: AudioBuffer) => {
        resolve(buffer.getChannelData(0))
      })
    })
  });
}