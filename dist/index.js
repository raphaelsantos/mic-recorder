var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import Mp3Encoder from './mp3-encoder';
import WavEncoder from './wav-encoder';
class MicRecorder {
    constructor(config) {
        this.config = {
            bitRate: 128,
            startRecordingAt: 300,
            deviceId: 'default',
            sampleRate: 44000,
            encoder: 'mp3'
        };
        this.activeStream = null;
        this.microphone = null;
        this.processor = null;
        this.startTime = 0;
        this.timerToStart = -1;
        this.__encoder = null;
        this.context = new AudioContext();
        if (config) {
            Object.assign(this.config, config);
        }
    }
    /**
     * Starts to listen for the microphone sound
     * @param {MediaStream} stream
     */
    addMicrophoneListener(stream) {
        this.activeStream = stream;
        // This prevents the weird noise once you start listening to the microphone
        this.timerToStart = setTimeout(() => {
            delete this.timerToStart;
        }, this.config.startRecordingAt);
        if (!this.context) {
            throw new Error('Invalid context');
        }
        // Set up Web Audio API to process data from the media stream (microphone).
        this.microphone = this.context.createMediaStreamSource(stream);
        // Settings a bufferSize of 0 instructs the browser to choose the best bufferSize
        this.processor = this.context.createScriptProcessor(0, 1, 1);
        if (!this.processor) {
            throw new Error('Invalid processor');
        }
        // Add all buffers from LAME into an array.
        this.processor.onaudioprocess = (event) => {
            if (this.timerToStart) {
                return;
            }
            // Send microphone data to LAME for MP3 encoding while recording.
            if (!this.__encoder) {
                throw new Error('Invalid internal encoder');
            }
            this.__encoder.encode(event.inputBuffer.getChannelData(0));
        };
        // Begin retrieving microphone data.
        if (!this.microphone) {
            throw new Error('Invalid microphone');
        }
        this.microphone.connect(this.processor);
        this.processor.connect(this.context.destination);
    }
    /**
     * Disconnect microphone, processor and remove activeStream
     */
    stop() {
        if (!this.processor) {
            throw new Error('Invalid processor');
        }
        if (!this.context) {
            throw new Error('Invalid context');
        }
        if (!this.activeStream) {
            throw new Error('Invalid activesteam');
        }
        if (!this.microphone) {
            throw new Error('Invalid microphone');
        }
        // Clean up the Web Audio API resources.
        this.microphone.disconnect();
        this.processor.disconnect();
        // If all references using this.context are destroyed, context is closed
        // automatically. DOMException is fired when trying to close again
        if (this.context.state !== 'closed') {
            this.context.close();
        }
        this.processor.onaudioprocess = null;
        // Stop all audio tracks. Also, removes recording icon from chrome tab
        this.activeStream.getAudioTracks().forEach(track => track.stop());
        return this;
    }
    /**
     * Requests access to the microphone and start recording
     * @return Promise
     */
    start() {
        this.context = new AudioContext();
        this.config.sampleRate = this.context.sampleRate;
        if (this.config.encoder === 'mp3') {
            this.__encoder = new Mp3Encoder(this.config);
        }
        else if (this.config.encoder === 'wav') {
            this.__encoder = new WavEncoder(this.config);
        }
        const audio = { deviceId: { exact: this.config.deviceId } };
        return new Promise((resolve, reject) => {
            navigator.mediaDevices
                .getUserMedia({ audio })
                .then(stream => {
                this.addMicrophoneListener(stream);
                resolve(stream);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    }
    /**
     * Return Mp3 Buffer and Blob with type mp3
     * @return {Promise<[Array<Int8Array>, Blob]>}
     */
    getAudio() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.__encoder) {
                throw new Error('Invalid encoder');
            }
            const finalBuffer = yield this.__encoder.finish();
            if (finalBuffer && finalBuffer.length === 0) {
                throw new Error('No buffer to send');
            }
            else if (finalBuffer === null) {
                throw new Error('Invalid final buffer');
            }
            else {
                const res = [
                    finalBuffer,
                    new Blob(finalBuffer, { type: `audio/${this.config.encoder}` })
                ];
                this.__encoder.clearBuffer();
                return res;
            }
        });
    }
}
;
export default MicRecorder;
//# sourceMappingURL=index.js.map