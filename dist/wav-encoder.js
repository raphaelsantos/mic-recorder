import WavEncoder from 'wav-encoder';
class Encoder {
    constructor(config) {
        this.config = {
            sampleRate: 44100
        };
        this.dataBuffer = [];
        if (config) {
            Object.assign(this.config, config);
        }
        this.clearBuffer();
    }
    encode(arrayBuffer) {
        this.dataBuffer.push(...arrayBuffer.map(e => e));
    }
    clearBuffer() {
        this.dataBuffer = [];
    }
    finish() {
        return WavEncoder.encode({
            sampleRate: this.config.sampleRate,
            channelData: [
                Float32Array.from(this.dataBuffer)
            ]
        }).then(res => {
            return Promise.resolve([new Int8Array(res)]);
        });
    }
}
export default Encoder;
//# sourceMappingURL=wav-encoder.js.map