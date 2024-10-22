import { dotenv } from "./config";
import { Player } from "./discord-music-player/Player";
import { RepeatMode } from "./discord-music-player/types/types";
import * as Discord from "discord.js";

const client: Discord.Client & { player: Player } = <any>new Discord.Client({
    intents: [Discord.GatewayIntentBits.Guilds, Discord.GatewayIntentBits.GuildMessages, Discord.GatewayIntentBits.GuildVoiceStates, Discord.GatewayIntentBits.MessageContent]
});

const player = new Player(client, {
    leaveOnEmpty: false, // This options are optional.
});
// You can define the Player as *client.player* to easily access it.

client.player = player;

// Init the event listener only once (at the top of your code).
client.player
    // Emitted when channel was empty.
    .on('channelEmpty', (queue) =>
        console.log(`Everyone left the Voice Channel, queue ended.`))
    // Emitted when a song was added to the queue.
    .on('songAdd', (queue, song) =>
        console.log(`Song ${song} was added to the queue.`))
    // Emitted when a playlist was added to the queue.
    .on('playlistAdd', (queue, playlist) =>
        console.log(`Playlist ${playlist} with ${playlist.songs.length} was added to the queue.`))
    // Emitted when there was no more music to play.
    .on('queueDestroyed', (queue) =>
        console.log(`The queue was destroyed.`))
    // Emitted when the queue was destroyed (either by ending or stopping).    
    .on('queueEnd', (queue) =>
        console.log(`The queue has ended.`))
    // Emitted when a song changed.
    .on('songChanged', (queue, newSong, oldSong) =>
        console.log(`${newSong} is now playing.`))
    // Emitted when a first song in the queue started playing.
    .on('songFirst', (queue, song) =>
        console.log(`Started playing ${song}.`))
    // Emitted when someone disconnected the bot from the channel.
    .on('clientDisconnect', (queue) =>
        console.log(`I was kicked from the Voice Channel, queue ended.`))
    // Emitted when deafenOnJoin is true and the bot was undeafened
    .on('clientUndeafen', (queue) =>
        console.log(`I got undefeanded.`))
    // Emitted when a song was moved in the queue to a new position
    // .on('songMoved', (queue, song, oldIndex, newIndex) =>
        // console.log(`Song ${song} was moved from ${oldIndex} to ${newIndex}.`))
    // Emitted when there was an error in runtime
    .on('error', (error, queue) => {
        console.log(`Error: ${error} in ${queue.guild.name}`);
    });


client.on("ready", () => {
    console.log("I am ready to Play with DMP 🎶");
});

const settings_prefix = "!";

client.on('messageCreate', async (message) => {
    console.log("msg: " ,message.content);
    const args = message.content.slice(settings_prefix.length).trim().split(/ +/g);
    const command = args.shift();
    let guild_queue = client.player.get_queue(message.guild!.id)!;

    if (command === 'play') {
        let queue = client.player.create_queue(message.guild!.id);
        await queue.join(message.member!.voice.channel!).catch(err => { console.log(err); });
        let song = await queue.play(args.join(' ')).catch(err => { console.log(err); if (!guild_queue) queue.stop(); });
    }
    if (command === 'lafou') {
        let queue = client.player.create_queue(message.guild!.id);
        await queue.join(message.member!.voice.channel!).catch(err => { console.log(err); });
        let song = await queue.play_lafou(args.join(' ')).catch(err => { console.log(err); if (!guild_queue) queue.stop(); });
    }

    // if (command === 'playlist') {
    //     let queue = client.player.create_queue(message.guild!.id);
    //     await queue.join(message.member!.voice.channel!);
    //     let song = await queue.playlist(args.join(' ')).catch(err => { console.log(err); if (!guildQueue) queue.stop(); });
    // }
    if (command === 'skip') { guild_queue.skip(); }
    if (command === 'stop') { guild_queue.stop(); }
    if (command === 'removeLoop') { guild_queue.setRepeatMode(RepeatMode.DISABLED); } // or 0 instead of RepeatMode.DISABLED
    if (command === 'toggleLoop') { guild_queue.setRepeatMode(RepeatMode.SONG); } // or 1 instead of RepeatMode.SONG
    if (command === 'toggleQueueLoop') { guild_queue.setRepeatMode(RepeatMode.QUEUE); } // or 2 instead of RepeatMode.QUEUE
    if (command === 'setVolume') { guild_queue.setVolume(parseInt(args[0])); }
    if (command === 'seek') { guild_queue.seek(parseInt(args[0]) * 1000); }
    if (command === 'clearQueue') { guild_queue.clearQueue(); }
    if (command === 'shuffle') { guild_queue.shuffle(); }
    if (command === 'getQueue') { console.log(guild_queue); }
    if (command === 'getVolume') { console.log(guild_queue.volume); }
    if (command === 'nowPlaying') { console.log(`Now playing: ${guild_queue.nowPlaying}`); }
    if (command === 'pause') { guild_queue.setPaused(true); }
    if (command === 'resume') { guild_queue.setPaused(false); }
    if (command === 'remove') { guild_queue.remove(parseInt(args[0])); }
    if (command === 'createProgressBar') { const ProgressBar = guild_queue.createProgressBar({}); console.log(ProgressBar.prettier); }
    if (command === 'move') {} // guild_queue.move(parseInt(args[0]), parseInt(args[1]));
})


// const client = new Client({
//     intents: ["Guilds", "GuildMessages", "DirectMessages"],
// });

// client.once("ready", (d) => {
//     console.log("Discord bot is ready! 🤖");
// });

// client.on("guildCreate", async (guild) => {
//     await deploy_commands({ guildId: guild.id });
// });

// client.on("interactionCreate", async (interaction) => {
//     if (!interaction.isCommand()) {
//         return;
//     }
//     const { commandName } = interaction;
//     if (commands[commandName as keyof typeof commands]) {
//         commands[commandName as keyof typeof commands].execute(interaction);
//     }
// });


client.login(dotenv.TOKEN);