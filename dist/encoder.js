import { Mp3Encoder } from 'lamejs';
var Encoder = /** @class */ (function () {
    function Encoder(config) {
        this.config = {
            sampleRate: 44100,
            bitRate: 128
        };
        /**
         * Audio is processed by frames of 1152 samples per audio channel
         * http://lame.sourceforge.net/tech-FAQ.txt
         */
        this.maxSamples = 1152;
        this.samplesMono = null;
        this.dataBuffer = [];
        if (config) {
            Object.assign(this.config, config);
        }
        this.mp3Encoder = new Mp3Encoder(1, this.config.sampleRate, this.config.bitRate);
        this.clearBuffer();
    }
    /**
     * Clear active buffer
     */
    Encoder.prototype.clearBuffer = function () {
        this.dataBuffer = [];
    };
    /**
     * Append new audio buffer to current active buffer
     * @param {Buffer} buffer
     */
    Encoder.prototype.appendToBuffer = function (buffer) {
        this.dataBuffer.push(new Int8Array(buffer));
    };
    /**
     * Float current data to 16 bits PCM
     * @param {Float32Array} input
     * @param {Int16Array} output
     */
    Encoder.prototype.floatTo16BitPCM = function (input, output) {
        for (var i = 0; i < input.length; i++) {
            var s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
    };
    /**
     * Convert buffer to proper format
     * @param {Float32Array} arrayBuffer
     */
    Encoder.prototype.convertBuffer = function (arrayBuffer) {
        var data = new Float32Array(arrayBuffer);
        var out = new Int16Array(arrayBuffer.length);
        this.floatTo16BitPCM(data, out);
        return out;
    };
    /**
     * Encode and append current buffer to dataBuffer
     * @param {Float32Array} arrayBuffer
     */
    Encoder.prototype.encode = function (arrayBuffer) {
        this.samplesMono = this.convertBuffer(arrayBuffer);
        var remaining = this.samplesMono.length;
        for (var i = 0; remaining >= 0; i += this.maxSamples) {
            var left = this.samplesMono.subarray(i, i + this.maxSamples);
            var mp3buffer = this.mp3Encoder.encodeBuffer(left);
            this.appendToBuffer(mp3buffer);
            remaining -= this.maxSamples;
        }
    };
    /**
     * Return full dataBuffer
     */
    Encoder.prototype.finish = function () {
        this.appendToBuffer(this.mp3Encoder.flush());
        return this.dataBuffer;
    };
    return Encoder;
}());
export default Encoder;
//# sourceMappingURL=encoder.js.map