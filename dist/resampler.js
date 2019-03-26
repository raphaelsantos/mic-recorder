import resampler from 'audio-resampler';
export default function (inputFile, targetSampleRate) {
    return new Promise((resolve, reject) => {
        resampler(inputFile, targetSampleRate, event => {
            event.getAudioBuffer((buffer) => {
                resolve(buffer.getChannelData(0));
            });
        });
    });
}
//# sourceMappingURL=resampler.js.map