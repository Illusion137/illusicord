Object.defineProperty(exports, "__esModule", { value: true });
import * as __1 from "../types/types";
import { Utils } from "../utils/Utils";
import { DMPError, DMPErrors } from "./DMPError";
import { Queue } from "./Queue";
export class ProgressBar {
    private queue;
    options: __1.ProgressBarOptions;
    bar: string;
    times: string;
    /**
     * ProgressBar constructor
     * @param {Queue} queue
     * @param {ProgressBarOptions} [options=DefaultProgressBarOptions]
     */
    constructor(queue: Queue, options: __1.ProgressBarOptions = __1.DefaultProgressBarOptions) {
        this.bar = ""
        this.times = ""
        /**
         * Guild instance
         * @name ProgressBar#guild
         * @type {Guild}
         * @private
         */
        this.options = __1.DefaultProgressBarOptions;
        /**
         * ProgressBar options
         * @name ProgressBar#options
         * @type {PlayerOptions}
         */
        /**
         * Progress Bar without timecodes
         * @name ProgressBar#bar
         * @type {string}
         */
        /**
         * Progress Bar timecodes
         * @name ProgressBar#times
         * @type {string}
         */
        if (queue.destroyed)
            throw new DMPError(DMPErrors.QUEUE_DESTROYED);
        if (!queue.connection)
            throw new DMPError(DMPErrors.NO_VOICE_CONNECTION);
        if (!queue.isPlaying)
            throw new DMPError(DMPErrors.NOTHING_PLAYING);
        this.queue = queue;
        this.options = Object.assign({}, this.options, options);
        this.create();
    }
    /**
     * Creates the Progress Bar
     * @private
     */
    create() {
        const { size, arrow, block } = this.options;
        const currentTime = this.queue.nowPlaying.seekTime + this.queue.connection!.time;
        const progress = Math.round((size! * currentTime / this.queue.nowPlaying.milliseconds));
        const emptyProgress = size! - progress;
        const progressString = block!.repeat(progress) + arrow + ' '.repeat(emptyProgress);
        this.bar = progressString;
        this.times = `${Utils.ms_to_time(currentTime)}/${this.queue.nowPlaying.duration}`;
    }
    /**
     * Progress Bar in a prettier representation
     * @type {string}
     */
    get prettier() {
        return `[${this.bar}][${this.times}]`;
    }
    /**
     * Progress Bar in string representation
     * @returns {string}
     */
    toString() {
        return this.options.time ? this.prettier : `[${this.bar}]`;
    }
}