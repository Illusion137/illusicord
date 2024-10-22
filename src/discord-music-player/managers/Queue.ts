Object.defineProperty(exports, "__esModule", { value: true });
import * as StreamConnection_1 from "../voice/StreamConnection";
import * as voice_1 from "@discordjs/voice";
// import * as discord_ytdl_core_1 from "discord-ytdl-core";
import * as __1 from "../types/types";
import * as ytdl from '../../lib-origin/origin/src/youtube_dl/index';
// import { PlayerOptions, ProgressBar, ProgressBarOptions, RepeatMode, Song } from "discord-music-player";
import { Guild, GuildChannelResolvable } from "discord.js";
import { Utils } from "../utils/Utils";
import { DMPErrors, DMPError } from "./DMPError";
import { Playlist } from "./Playlist";
import { Player } from "../Player";
import { Song } from "./Song";
import { ProgressBar } from "./ProgressBar";
import { urlid } from "../../lib-origin/origin/src/utils/util";
import { SoundCloud, SoundCloudDL } from "../../lib-origin/origin/src";
import { CookieJar } from "../../lib-origin/origin/src/utils/cookie_util";
import { dotenv } from "../../config";
export class Queue<T = unknown> {
    player: Player;
    guild: Guild;
    connection: StreamConnection_1.StreamConnection | undefined;
    songs: Song[];
    isPlaying: boolean;
    data?: T;
    options: __1.PlayerOptions;
    repeatMode: __1.RepeatMode;
    destroyed: boolean;
    /**
     * Queue constructor
     * @param {Player} player
     * @param {Guild} guild
     * @param {PlayerOptions} options
     */
    constructor(player: Player, guild: Guild, options: __1.PlayerOptions) {
        /**
         * Player instance
         * @name Queue#player
         * @type {Player}
         * @readonly
         */
        this.songs = [];
        this.isPlaying = false;
        this.options = __1.DefaultPlayerOptions;
        this.repeatMode = __1.RepeatMode.DISABLED;
        this.destroyed = false;
        /**
         * Guild instance
         * @name Queue#guild
         * @type {Guild}
         * @readonly
         */
        /**
         * Queue connection
         * @name Queue#connection
         * @type {?StreamConnection}
         * @readonly
         */
        /**
         * Queue songs
         * @name Queue#songs
         * @type {Song[]}
         */
        /**
         * If Song is playing on the Queue
         * @name Queue#isPlaying
         * @type {boolean}
         * @readonly
         */
        /**
         * Queue custom data
         * @name Queue#data
         * @type {any}
         */
        /**
         * Queue options
         * @name Queue#options
         * @type {PlayerOptions}
         */
        /**
         * Queue repeat mode
         * @name Queue#repeatMode
         * @type {RepeatMode}
         */
        /**
         * If the queue is destroyed
         * @name Queue#destroyed
         * @type {boolean}
         * @readonly
         */
        this.player = player;
        this.guild = guild;
        this.options = { ...__1.DefaultPlayerOptions, ...options };
    }
    /**
     * Gets the current volume
     * @type {number}
     */
    get volume() {
        if (!this.connection)
            return __1.DefaultPlayerOptions.volume;
        return this.connection.volume;
    }
    /**
     * Gets the paused state of the player
     * @type {boolean}
     */
    get paused() {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        if (!this.isPlaying)
            throw new DMPError(DMPErrors.NOTHING_PLAYING);
        return this.connection.paused;
    }
    /**
     * Returns current playing song
     * @type {?Song}
     */
    get nowPlaying() {
        return this.connection?.resource?.metadata ?? this.songs[0];
    }
    /**
     * Joins a voice channel
     * @param {GuildChannelResolvable} channelId
     * @returns {Promise<Queue>}
     */
    async join(channelId: GuildChannelResolvable) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (this.connection)
            return this;
        const channel = this.guild.channels.resolve(channelId);
        if (!channel)
            throw new DMPError(DMPErrors.UNKNOWN_VOICE);
        if (!Utils.is_voice_channel(<any>channel))
            throw new DMPError(DMPErrors.CHANNEL_TYPE_INVALID);
        let connection = (0, voice_1.joinVoiceChannel)(<any>{
            guildId: channel.guild.id,
            channelId: channel.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            selfDeaf: this.options.deafenOnJoin
        });
        let _connection;
        try {
            connection = await (0, voice_1.entersState)(connection, voice_1.VoiceConnectionStatus.Ready, 15 * 1000);
            _connection = new StreamConnection_1.StreamConnection(connection, <any>channel);
        }
        catch (err) {
            connection.destroy();
            throw new DMPError(DMPErrors.VOICE_CONNECTION_ERROR);
        }
        this.connection = _connection;
        if (Utils.is_stage_voice_channel(<any>channel)) {
            const _guild = channel.guild;
            const me = (<any>_guild).me ? (<any>_guild).me : _guild.members.me;
            await me.voice.setSuppressed(false).catch(async (_: any) => {
                return await channel.guild.members.me!.voice.setRequestToSpeak(true).catch(() => null);
            });
        }
        this.connection!
            .on('start', (resource) => {
            this.isPlaying = true;
            if (resource?.metadata?.isFirst && resource?.metadata?.seekTime === 0)
                this.player.emit('songFirst', this, this.nowPlaying);
        })
            .on('end', async (resource) => {
            if (this.destroyed) {
                this.player.emit('queueDestroyed', this);
                return;
            }
            this.isPlaying = false;
            let oldSong = this.songs.shift();
            if (this.songs.length === 0 && this.repeatMode === __1.RepeatMode.DISABLED) {
                this.player.emit('queueEnd', this);
                if (this.options.leaveOnEnd)
                    setTimeout(() => {
                        if (!this.isPlaying)
                            this.leave();
                    }, this.options.timeout);
                return;
            }
            else {
                if (this.repeatMode === __1.RepeatMode.SONG) {
                    this.songs.unshift(oldSong!);
                    this.songs[0]._setFirst(false);
                    this.player.emit('songChanged', this, this.songs[0], oldSong);
                    return this.play(this.songs[0], <any>{ immediate: true });
                }
                else if (this.repeatMode === __1.RepeatMode.QUEUE) {
                    this.songs.push(oldSong!);
                    this.songs[this.songs.length - 1]._setFirst(false);
                    this.player.emit('songChanged', this, this.songs[0], oldSong);
                    return this.play(this.songs[0], <any>{ immediate: true });
                }
                this.player.emit('songChanged', this, this.songs[0], oldSong);
                return this.play(this.songs[0], <any>{ immediate: true });
            }
        })
            .on('error', (err) => this.player.emit('error', err.message, this));
        return this;
    }
    /**
     * Plays or Queues a song (in a VoiceChannel)
     * @param {Song | string} search
     * @param {PlayOptions} [options=DefaultPlayOptions]
     * @returns {Promise<Song>}
     */
    async play(search: Song|string, options: any = __1.DefaultPlayOptions) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        options = Object.assign({}, __1.DefaultPlayOptions, options);
        let { data } = <any>options;
        delete options.data;
        let song = await Utils.best(search, options, <any>this)
            .catch(error => {
            throw new DMPError(error);
        });
        if (!(<any>options).immediate)
            song.data = data;
        let songLength = this.songs.length;
        if (!options?.immediate && songLength !== 0) {
            if (options?.index >= 0 && ++options.index <= songLength)
                this.songs.splice(options.index, 0, song);
            else
                this.songs.push(song);
            this.player.emit('songAdd', this, song);
            return song;
        }
        else if (!options?.immediate) {
            song._setFirst();
            if (options?.index >= 0 && ++options.index <= songLength)
                this.songs.splice(options.index, 0, song);
            else
                this.songs.push(song);
            this.player.emit('songAdd', this, song);
        }
        else if (options.seek)
            this.songs[0].seekTime = options.seek;
        let quality = this.options.quality;
        song = this.songs[0];
        if (song.seekTime)
            options.seek = song.seekTime;
        let stream = await ytdl.YouTubeDL.ytdl(urlid(song.url, "youtube.com/", "watch?v="), {
            // requestOptions: this.player.options.ytdlRequestOptions ?? {},
            // opusEncoded: false,
            // seek: options.seek ? options.seek / 1000 : 0,
            // fmt: 's16le',
            // encoderArgs: [],
            quality: "18",
            // highWaterMark: 1 << 25,
            // filter: 'audioonly'
        })
        const resource = this.connection.createAudioStream(stream.url, {
            metadata: song,
            inputType: voice_1.StreamType.Raw
        });
        setTimeout((_: any) => {
            this.connection!.playAudioStream(resource)
                .then(__ => {
                this.setVolume(this.options.volume!);
            });
        });
        return song;
    }

    soundcloud_jar = CookieJar.fromString(dotenv.SOUNDCLOUD_COOKIES);
    async play_lafou(search: string){
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);

        const sc_search = await SoundCloud.search("TRACKS", {"query": search});
        if("error" in sc_search) throw sc_search;
        const song = sc_search.data.collection[0];

        const stream = await SoundCloudDL.get_download_info_from_permalink(song.permalink_url);
        if(typeof stream === "object") throw stream; 

        const resource = this.connection.createAudioStream(stream, {
            metadata: song,
            inputType: voice_1.StreamType.Raw
        });
        setTimeout((_: any) => {
            this.connection!.playAudioStream(resource)
                .then(__ => {
                this.setVolume(this.options.volume!);
            });
        });
        return song;
    }
    /**
     * Plays or Queues a playlist (in a VoiceChannel)
     * @param {Playlist | string} search
     * @param {PlaylistOptions} [options=DefaultPlaylistOptions]
     * @returns {Promise<Playlist>}
     */
    async playlist(search:Playlist|string, options: __1.PlaylistOptions = __1.DefaultPlaylistOptions) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        options = Object.assign({}, __1.DefaultPlaylistOptions, options);
        let playlist = await Utils.playlist(<string>search, options, <any>this)
            .catch((error: any) => {
            throw new DMPError(error);
        });
        let songLength = this.songs.length;
        if (options?.index! >= 0 && ++options.index! <= songLength)
            this.songs.splice(options.index!, 0, ...playlist.songs);
        else
            this.songs.push(...playlist.songs);
        this.player.emit('playlistAdd', this, playlist);
        if (songLength === 0) {
            playlist.songs[0]._setFirst();
            await this.play(playlist.songs[0], <any>{ immediate: true });
        }
        return playlist;
    }
    /**
     * Seeks the current playing Song
     * @param {number} time
     * @returns {boolean}
     */
    async seek(time: number) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.isPlaying)
            throw new DMPError(DMPErrors.NOTHING_PLAYING);
        if (isNaN(time))
            return;
        if (time < 1)
            time = 0;
        if (time >= this.nowPlaying.milliseconds)
            return this.skip();
        await this.play(<any>this.nowPlaying, <any>{
            immediate: true,
            seek: time
        });
        return true;
    }
    /**
     * Skips the current playing Song and returns it
     * @param {number} [index=0]
     * @returns {Song}
     */
    skip(index = 0) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        this.songs.splice(1, index);
        const skippedSong = this.songs[0];
        this.connection.stop();
        return skippedSong;
    }
    /**
     * Stops playing the Music and cleans the Queue
     * @returns {void}
     */
    stop() {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (this.options.leaveOnStop) {
            setTimeout(() => {
                this.leave();
            }, this.options.timeout);
        }
        else {
            this.clearQueue();
            this.skip();
        }
    }
    /**
     * Shuffles the Queue
     * @returns {Song[]}
     */
    shuffle() {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        let currentSong = this.songs.shift();
        this.songs = Utils.shuffle(this.songs);
        this.songs.unshift(currentSong!);
        return this.songs;
    }
    /**
     * Pause/resume the current Song
     * @param {boolean} [state=true] Pause state, if none it will pause the Song
     * @returns {boolean}
     */
    setPaused(state = true) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        if (!this.isPlaying)
            throw new DMPError(DMPErrors.NOTHING_PLAYING);
        return this.connection.setPauseState(state);
    }
    /**
     * Remove a Song from the Queue
     * @param {number} index
     * @returns {Song|undefined}
     */
    remove(index: number) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        return this.songs.splice(index, 1)[0];
    }
    /**
     * Sets the current volume
     * @param {number} volume
     * @returns {boolean}
     */
    setVolume(volume: number) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        this.options.volume = volume;
        return this.connection.setVolume(volume);
    }
    /**
     * Clears the Queue
     * @returns {void}
     */
    clearQueue() {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        let currentlyPlaying = this.songs.shift();
        this.songs = [currentlyPlaying!];
    }
    /**
     * Sets Queue repeat mode
     * @param {RepeatMode} repeatMode
     * @returns {boolean}
     */
    setRepeatMode(repeatMode: __1.RepeatMode) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (![__1.RepeatMode.DISABLED, __1.RepeatMode.QUEUE, __1.RepeatMode.SONG].includes(repeatMode))
            throw new DMPError(DMPErrors.UNKNOWN_REPEAT_MODE);
        if (repeatMode === this.repeatMode)
            return false;
        this.repeatMode = repeatMode;
        return true;
    }
    /**
     * Creates Progress Bar class
     * @param {ProgressBarOptions} [options]
     * @returns {ProgressBar}
     */
    createProgressBar(options: __1.ProgressBarOptions) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!this.isPlaying)
            throw new DMPError(DMPErrors.NOTHING_PLAYING);
        return new ProgressBar(<any>this, options);
    }
    /**
     * Set's custom queue data
     * @param {any} data
     * @returns {void}
     */
    setData(data: any) {
        if (this.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        this.data = data;
    }
    /**
     * Disconnects the player
     * @returns {void}
     */
    leave() {
        this.destroyed = true;
        this.connection?.leave();
        this.player.delete_queue(this.guild.id);
    }
}
exports.Queue = Queue;
