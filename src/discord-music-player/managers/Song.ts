Object.defineProperty(exports, "__esModule", { value: true });
// import { Player, RawSong } from "discord-music-player";
import * as __1 from "../types/types";
import { Queue } from "./Queue";
import { User } from "discord.js";
import { Utils } from "../utils/Utils";
import { Player } from "../Player";
import { MusicServiceType } from "../../lib-origin/Illusive/src/types";
export class Song {
    type?: MusicServiceType
    player: Player;
    queue: Queue;
    name: string;
    author: string;
    url: string;
    thumbnail: string;
    requestedBy?: User;
    duration: string;
    isLive: boolean;
    isFirst: boolean;
    seekTime: number;
    data?: any;
    /**
     * Song constructor
     * @param {RawSong} raw
     * @param {Queue} queue
     * @param {User} [requestedBy]
     */
    constructor(raw: __1.RawSong, queue: Queue, requestedBy: User) {
        /**
         * Player instance
         * @name Song#player
         * @type {Player}
         * @readonly
         */
        this.data = null;
        /**
         * Queue instance
         * @name Song#queue
         * @type {Queue}
         */
        /**
         * Song name
         * @name Song#name
         * @type {string}
         */
        /**
         * Song author
         * @name Song#author
         * @type {string}
         */
        /**
         * Song url
         * @name Song#url
         * @type {string}
         */
        /**
         * Song thumbnail
         * @name Song#thumbnail
         * @type {string}
         */
        /**
         * The User who requested the Song
         * @name Song#requestedBy
         * @type {string}
         */
        /**
         * Song duration
         * @name Song#duration
         * @type {string}
         */
        /**
         * If the song is a livestream
         * @name Song#isLive
         * @type {boolean}
         */
        /**
         * If the song is first in the queue
         * @name Song#isFirst
         * @type {boolean}
         * @readonly
         */
        /**
         * Song seekTime
         * @name Song#seekTime
         * @type {number}
         * @readonly
         */
        /**
         * Song custom data
         * @name Song#data
         * @type {any}
         */
        this.player = (<any>queue).player;
        this.type = raw.type;
        this.queue = queue;
        this.name = raw.name;
        this.author = raw.author;
        this.url = raw.url;
        this.thumbnail = raw.thumbnail;
        this.requestedBy = requestedBy;
        this.duration = raw.duration;
        this.isLive = raw.isLive;
        this.isFirst = false;
        this.seekTime = raw.seekTime ?? 0;
        this.data = null;
    }
    /**
     * Converts duration (HH:MM:SS) to milliseconds
     * @type {number}
     */
    get milliseconds() {
        return Utils.time_to_ms(this.duration);
    }
    /**
     * @param {?boolean} first
     * @private
     */
    _setFirst(first = true) {
        this.isFirst = first;
    }
    /**
     * Set's custom song data
     * @param {any} data
     * @returns {void}
     */
    setData(data: any) {
        this.data = data;
    }
    /**
     * Song name and author in string representation
     * @returns {string}
     */
    toString() {
        return `${this.name} | ${this.author}`;
    }
}