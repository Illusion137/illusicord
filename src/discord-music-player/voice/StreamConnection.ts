Object.defineProperty(exports, "__esModule", { value: true });
import * as events_1 from "events";
import * as voice_1 from "@discordjs/voice";
import * as util_1 from "util";
import * as __1 from "../types/types";
import { StageChannel, VoiceChannel } from "discord.js";
import { Song } from "../managers/Song";
import { DMPError } from "../managers/DMPError";
import { DMPErrors } from "../managers/DMPError";
const wait = (0, util_1.promisify)(setTimeout);
export class StreamConnection extends events_1.EventEmitter {
    readonly connection: voice_1.VoiceConnection;
    readonly player: voice_1.AudioPlayer;
    channel: VoiceChannel | StageChannel;
    resource?: voice_1.AudioResource<Song>;
    paused: boolean;
    private readyLock;

    /**
     * StreamConnection constructor
     * @param {VoiceConnection} connection
     * @param {VoiceChannel|StageChannel} channel
     */
    constructor(connection: voice_1.VoiceConnection, channel: VoiceChannel|StageChannel) {
        super();
        this.paused = false;
        this.readyLock = false;
        /**
         * The VoiceConnection
         * @type {VoiceConnection}
         */
        this.connection = connection;
        /**
         * The AudioPlayer
         * @type {AudioPlayer}
         */
        this.player = (0, voice_1.createAudioPlayer)();
        /**
         * The VoiceChannel or StageChannel
         * @type {VoiceChannel | StageChannel}
         */
        this.channel = channel;
        this.connection.on('stateChange', async (oldState, newState) => {
            if (newState.status === voice_1.VoiceConnectionStatus.Disconnected) {
                if (newState.reason === voice_1.VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    try {
                        // Attempting to re-join the voice channel, after possibly changing channels
                        await (0, voice_1.entersState)(this.connection, voice_1.VoiceConnectionStatus.Connecting, 5000);
                    }
                    catch {
                        // It was mannually disconnected and the connection is closed in Player.js _voiceUpdate
                    }
                }
                else if (this.connection.rejoinAttempts < 5) {
                    await wait((this.connection.rejoinAttempts + 1) * 5000);
                    this.connection.rejoin();
                }
                else {
                    this.leave();
                }
            }
            else if (newState.status === voice_1.VoiceConnectionStatus.Destroyed) {
                this.stop();
            }
            else if (!this.readyLock &&
                (newState.status === voice_1.VoiceConnectionStatus.Connecting || newState.status === voice_1.VoiceConnectionStatus.Signalling)) {
                this.readyLock = true;
                try {
                    await this._enterState();
                }
                catch {
                    this.leave();
                }
                finally {
                    this.readyLock = false;
                }
            }
        });
        this.player
            .on('stateChange', (oldState, newState) => {
            if (newState.status === voice_1.AudioPlayerStatus.Idle && oldState.status !== voice_1.AudioPlayerStatus.Idle) {
                if (!this.paused) {
                    this.emit('end', this.resource);
                    delete this.resource;
                    return;
                }
            }
            else if (newState.status === voice_1.AudioPlayerStatus.Playing) {
                if (!this.paused) {
                    this.emit('start', this.resource);
                    return;
                }
            }
        })
            .on('error', data => {
            this.emit('error', data);
        });
        this.connection.subscribe(this.player);
    }
    /**
     *
     * @param {Readable | string} stream
     * @param {{ inputType: StreamType, metadata: any|undefined }} options
     * @returns {AudioResource<Song>}
     */
    createAudioStream(stream: string, options: { inputType: voice_1.StreamType, metadata: any|undefined }) {
        this.resource = (0, voice_1.createAudioResource)(stream, {
            inputType: options.inputType,
            inlineVolume: true,
            metadata: options.metadata
        });
        return this.resource;
    }
    /**
     * @returns {void}
     * @private
     */
    async _enterState() {
        await (0, voice_1.entersState)(this.connection, voice_1.VoiceConnectionStatus.Ready, 20000);
    }
    /**
     *
     * @param {AudioResource<Song>} resource
     * @returns {Promise<StreamConnection>}
     */
    async playAudioStream(resource: voice_1.AudioResource<Song>) {
        if (!resource)
            throw new DMPError(DMPErrors.RESOURCE_NOT_READY);
        if (!this.resource)
            this.resource = resource;
        if (this.connection.state.status !== voice_1.VoiceConnectionStatus.Ready)
            await this._enterState();
        this.player.play(resource);
        return this;
    }
    /**
     * Pauses/Resumes the connection
     * @param {boolean} state
     * @returns {boolean}
     */
    setPauseState(state: boolean) {
        if (state) {
            this.player.pause(true);
            this.paused = true;
            return true;
        }
        else {
            this.player.unpause();
            this.paused = false;
            return false;
        }
    }
    /**
     * Stops and ends the connection
     * @returns {boolean}
     */
    stop() {
        return this.player.stop();
    }
    /**
     * Disconnect and leave from the voice channel
     * @returns {void}
     */
    leave() {
        this.player.stop(true);
        if (this.connection.state.status !== voice_1.VoiceConnectionStatus.Destroyed)
            this.connection.destroy();
    }
    /**
     * Gets the current volume
     * @type {number}
     */
    get volume() {
        if (!this.resource?.volume)
            return 100;
        const currentVol = this.resource.volume.volume;
        return Math.round(Math.pow(currentVol, 1 / 1.661) * 200);
    }
    /**
     * Gets the stream time
     * @type {number}
     */
    get time() {
        if (!this.resource)
            return 0;
        return this.resource.playbackDuration;
    }
    /**
     * Sets the current volume
     * @param {number} volume
     * @returns {boolean}
     */
    setVolume(volume: number) {
        if (!this.resource || this._invalidVolume(volume))
            return false;
        this.resource.volume?.setVolumeLogarithmic(volume / 200);
        return true;
    }
    /**
     *
     * @param {number} volume
     * @returns {boolean}
     * @private
     */
    _invalidVolume(volume: number) {
        return (isNaN(volume) ||
            volume >= Infinity ||
            volume < 0);
    }
}