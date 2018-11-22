import Encoder from './encoder';
var MicRecorder = /** @class */ (function () {
    function MicRecorder(config) {
        this.config = {
            bitRate: 128,
            startRecordingAt: 300,
            deviceId: 'default',
            sampleRate: 44000
        };
        this.activeStream = null;
        this.context = null;
        this.microphone = null;
        this.processor = null;
        this.startTime = 0;
        this.timerToStart = -1;
        this.lameEncoder = null;
        if (config) {
            Object.assign(this.config, config);
        }
    }
    /**
     * Starts to listen for the microphone sound
     * @param {MediaStream} stream
     */
    MicRecorder.prototype.addMicrophoneListener = function (stream) {
        var _this = this;
        this.activeStream = stream;
        // This prevents the weird noise once you start listening to the microphone
        this.timerToStart = setTimeout(function () {
            delete _this.timerToStart;
        }, this.config.startRecordingAt);
        // Set up Web Audio API to process data from the media stream (microphone).
        this.microphone =
            this.context && this.context.createMediaStreamSource(stream);
        // Settings a bufferSize of 0 instructs the browser to choose the best bufferSize
        this.processor = this.context && this.context.createScriptProcessor(0, 1, 1);
        // Add all buffers from LAME into an array.
        this.processor &&
            (this.processor.onaudioprocess = function (event) {
                if (_this.timerToStart) {
                    return;
                }
                // Send microphone data to LAME for MP3 encoding while recording.
                _this.lameEncoder &&
                    _this.lameEncoder.encode(event.inputBuffer.getChannelData(0));
            });
        // Begin retrieving microphone data.
        this.microphone && this.processor && this.microphone.connect(this.processor);
        this.processor &&
            this.context &&
            this.processor.connect(this.context.destination);
    };
    /**
     * Disconnect microphone, processor and remove activeStream
     */
    MicRecorder.prototype.stop = function () {
        if (this.processor && this.microphone) {
            // Clean up the Web Audio API resources.
            this.microphone.disconnect();
            this.processor.disconnect();
            // If all references using this.context are destroyed, context is closed
            // automatically. DOMException is fired when trying to close again
            if (this.context && this.context.state !== 'closed') {
                this.context.close();
            }
            this.processor.onaudioprocess = null;
            // Stop all audio tracks. Also, removes recording icon from chrome tab
            this.activeStream &&
                this.activeStream.getAudioTracks().forEach(function (track) { return track.stop(); });
        }
        return this;
    };
    /**
     * Requests access to the microphone and start recording
     * @return Promise
     */
    MicRecorder.prototype.start = function () {
        var _this = this;
        this.context = new AudioContext();
        this.config.sampleRate = this.context.sampleRate;
        this.lameEncoder = new Encoder(this.config);
        var audio = { deviceId: { exact: this.config.deviceId } };
        return new Promise(function (resolve, reject) {
            navigator.mediaDevices
                .getUserMedia({ audio: audio })
                .then(function (stream) {
                _this.addMicrophoneListener(stream);
                resolve(stream);
            })
                .catch(function (err) {
                reject(err);
            });
        });
    };
    /**
     * Return Mp3 Buffer and Blob with type mp3
     * @return {Promise<[Array<Int8Array>, Blob]>}
     */
    MicRecorder.prototype.getMp3 = function () {
        var _this = this;
        var finalBuffer = this.lameEncoder && this.lameEncoder.finish();
        return new Promise(function (resolve, reject) {
            if (finalBuffer && finalBuffer.length === 0) {
                reject(new Error('No buffer to send'));
            }
            else if (finalBuffer === null) {
                reject(new Error('Invalid final buffer'));
            }
            else {
                var res = [
                    finalBuffer,
                    new Blob(finalBuffer, { type: 'audio/mp3' })
                ];
                resolve(res);
                _this.lameEncoder && _this.lameEncoder.clearBuffer();
            }
        });
    };
    return MicRecorder;
}());
;
export default MicRecorder;
//# sourceMappingURL=index.js.map