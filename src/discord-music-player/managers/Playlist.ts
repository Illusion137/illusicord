import { User } from "discord.js";
import { RawPlaylist } from "../types/types";
import { Queue } from "./Queue";
// import { Player } from "discord-music-player";
import { Song } from "./Song";
import { Player } from "../Player";

Object.defineProperty(exports, "__esModule", { value: true });
export class Playlist {
    player: Player;
    queue: Queue;
    name: string;
    author: string;
    url: string;
    songs: Song[];
    /**
     * Playlist constructor
     * @param {RawPlaylist} raw
     * @param {Queue} queue
     * @param {User} [requestedBy]
     */
    constructor(raw: RawPlaylist, queue: Queue, requestedBy: User) {
        /**
         * Playlist instance
         * @name Playlist#player
         * @type {Player}
         * @readonly
         */
        /**
         * Playlist instance
         * @name Playlist#queue
         * @type {Queue}
         */
        /**
         * Playlist name
         * @name Playlist#name
         * @type {string}
         */
        /**
         * Playlist author
         * @name Playlist#author
         * @type {string}
         */
        /**
         * Playlist url
         * @name Playlist#url
         * @type {string}
         */
        /**
         * Playlist songs
         * @name Playlist#songs
         * @type {string}
         */
        this.player = queue.player;
        this.queue = queue;
        this.name = raw.name;
        this.author = raw.author;
        this.url = raw.url;
        this.songs = raw.songs;
    }
    /**
     * Playlist name and author in string representation
     * @returns {string}
     */
    toString() {
        return `${this.name} | ${this.author}`;
    }
}