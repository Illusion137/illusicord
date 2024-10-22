Object.defineProperty(exports, "__esModule", { value: true });
import * as discord_js_1 from "discord.js";
import { Client, Collection, Snowflake, VoiceState } from "discord.js";
import { PlayerOptions } from "./types/types";
import * as events_1 from "events";
import { Queue } from "./managers/Queue";
import { DMPErrors } from "./managers/DMPError";
import { DMPError } from "./managers/DMPError";
const Queue_1 = require("./managers/Queue");
const types_1 = require("./types/types");
export class Player<OptionsData = any> extends events_1.EventEmitter {
    client: Client;
    queues: Collection<Snowflake, Queue<OptionsData>>;
    options: PlayerOptions;

    constructor(client: Client, options: PlayerOptions = {}) {
        super();
        this.queues = new discord_js_1.Collection();
        this.options = types_1.DefaultPlayerOptions;
        /**
         * Client object (discord.js)
         * @type {object}
         * @readonly
         */
        this.client = client;
        /**
         * Player options
         * @type {PlayerOptions}
         */
        this.options = Object.assign({}, this.options, options);
        /**
         * Player queues
         * @type {Collection<Snowflake, Queue>}
         */
        this.queues = new discord_js_1.Collection();
        this.client.on('voiceStateUpdate', (oldState, newState) => {
            this._voice_update(oldState, newState);
        });
    }

    create_queue<D extends OptionsData>(guild_id: Snowflake, options: PlayerOptions&{data?: D} = this.options): Queue<D> {
        options = Object.assign({}, this.options, options);
        let guild = this.client.guilds.resolve(guild_id);
        if (!guild)
            throw new DMPError(DMPErrors.INVALID_GUILD);
        if (this.has_queue(guild_id) && !this.get_queue(guild_id)?.destroyed)
            return <Queue<D>>this.get_queue(guild_id)!;
        let { data } = options;
        delete options.data;
        const queue = new Queue_1.Queue(this, guild, options);
        queue.data = data;
        this.set_queue(guild_id, queue);
        return queue;
    }

    has_queue(guild_id: Snowflake) {
        return !!this.queues.get(guild_id);
    }

    get_queue(guild_id: Snowflake): Queue<OptionsData> | undefined {
        return this.queues.get(guild_id);
    }

    set_queue(guild_id: Snowflake, queue: Queue<OptionsData>) {
        this.queues.set(guild_id, queue);
    }

    delete_queue(guild_id: Snowflake) {
        this.queues.delete(guild_id);
    }

    _voice_update(old_state: VoiceState, new_state: VoiceState) {
        let queue = this.queues.get(old_state.guild.id);
        if (!queue || !queue.connection)
            return;
        let { deafenOnJoin, leaveOnEmpty, timeout } = queue.options;
        if (!new_state.channelId && this.client.user?.id === old_state.member?.id) {
            queue.leave();
            return void this.emit('clientDisconnect', queue);
        }
        else if (deafenOnJoin && old_state.serverDeaf && !new_state.serverDeaf) {
            this.emit('clientUndeafen', queue);
        }
        if (old_state.channelId === new_state.channelId)
            return;
        if (!leaveOnEmpty || queue.connection.channel.members.size > 1)
            return;
        setTimeout(() => {
            if (queue.connection!.channel.members.size > 1)
                return;
            if (queue.connection!.channel.members.has(this.client.user!.id)) {
                queue.leave();
                this.emit('channelEmpty', queue);
            }
        }, timeout);
    }
}
exports.Player = Player;
