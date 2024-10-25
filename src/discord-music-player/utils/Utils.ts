Object.defineProperty(exports, "__esModule", { value: true });
import * as __1 from '../types/types';
import * as isomorphic_unfetch_1 from "isomorphic-unfetch";
import * as ytsr_1 from "ytsr";
import * as spotify_url_info_1 from "./spotify-url-info";
import * as apple_music_metadata_1 from "apple-music-metadata";
import * as youtubei_1 from "youtubei";
import * as discord_js_1 from "discord.js";
import { PlayOptions } from '../types/types';
import { Queue } from '../managers/Queue';
import { Song } from '../managers/Song';
import { DMPErrors } from '../managers/DMPError';
import { Playlist } from '../managers/Playlist';
let YouTube = new youtubei_1.Client();
const { getData, getPreview } = (0, spotify_url_info_1.default)(isomorphic_unfetch_1.default);
export class Utils {
    static regex_list: {
        youtube_video: RegExp;
        youtube_video_id: RegExp;
        youtube_playlist: RegExp;
        youtube_playlist_id: RegExp;
        spotify: RegExp;
        spotify_playlist: RegExp;
        apple: RegExp;
        apple_playlist: RegExp;
    };
    constructor() {}

    static parse_video(url: string) {
        const match = url.match(this.regex_list.youtube_video_id);
        return match ? match[7] : null;
    }

    static parse_video_timecode(url: string) {
        const match = url.match(this.regex_list.youtube_video);
        return match ? match[10] : null;
    }

    static parse_playlist(url: string) {
        const match = url.match(this.regex_list.youtube_playlist_id);
        return match ? match[1] : null;
    }

    static async search(Search: string, SOptions: PlayOptions = __1.DefaultPlayOptions, Queue: Queue, Limit: number = 1): Promise<Song[]> {
        SOptions = Object.assign({}, __1.DefaultPlayOptions, SOptions);
        let Filters;
        try {
            // Default Options - Type: Video
            let FiltersTypes = await ytsr_1.default.getFilters(Search);
            Filters = FiltersTypes.get('Type')!.get('Video');
            // Custom Options - Upload date: null
            if (SOptions?.uploadDate !== null)
                Filters = Array.from((await ytsr_1.default.getFilters(Filters!.url!))
                    .get('Upload date')!, ([name, value]) => ({ name, url: value.url }))
                    .find(o => o.name.toLowerCase().includes(SOptions?.uploadDate!))
                    ?? Filters;
            // Custom Options - Duration: null
            if (SOptions?.duration !== null)
                Filters = Array.from((await ytsr_1.default.getFilters(Filters!.url!))
                    .get('Duration')!, ([name, value]) => ({ name, url: value.url }))
                    .find(o => o.name.toLowerCase().startsWith(SOptions?.duration!))
                    ?? Filters;
            // Custom Options - Sort by: relevance
            if (SOptions?.sortBy !== null && SOptions?.sortBy !== 'relevance')
                Filters = Array.from((await ytsr_1.default.getFilters(Filters!.url!))
                    .get('Sort by')!, ([name, value]) => ({ name, url: value.url }))
                    .find(o => o.name.toLowerCase().includes(SOptions?.sortBy!))
                    ?? Filters;
            let Result = await (0, ytsr_1.default)(Filters!.url!, {
                limit: Limit,
            });
            let items = Result.items;
            let songs = items.map(item => {
                if (item?.type?.toLowerCase() !== 'video')
                    return null;
                const yitem = <ytsr_1.Video>item;
                return new Song({
                    name: yitem.title,
                    url: yitem.url,
                    duration: yitem.duration!,
                    author: yitem.author?.name!,
                    isLive: yitem.isLive,
                    thumbnail: yitem.bestThumbnail.url!,
                }, Queue, SOptions.requestedBy!);
            }).filter(I => I) as Song[];
            return songs;
        }
        catch (e) {
            throw DMPErrors.SEARCH_NULL;
        }
    }

    static async link(Search: string, SOptions: PlayOptions = __1.DefaultPlayOptions, Queue: Queue): Promise<Song|null> {
        let SpotifyLink = this.regex_list.spotify.test(Search);
        let YouTubeLink = this.regex_list.youtube_video.test(Search);
        let AppleLink = this.regex_list.apple.test(Search);
        if (AppleLink) {
            try {
                let AppleResult = await (0, apple_music_metadata_1.getSong)(Search);
                if (AppleResult) {
                    let SearchResult = await this.search(`${AppleResult.artist} - ${AppleResult.title}`, SOptions, Queue);
                    return SearchResult[0];
                }
            }
            catch (e) {
                throw DMPErrors.INVALID_APPLE;
            }
        }
        else if (SpotifyLink) {
            try {
                let SpotifyResult = await getPreview(Search, {});
                let SearchResult = await this.search(`${SpotifyResult.artist} - ${SpotifyResult.title}`, SOptions, Queue);
                return SearchResult[0];
            }
            catch (e) {
                throw DMPErrors.INVALID_SPOTIFY;
            }
        }
        else if (YouTubeLink) {
            let VideoID = this.parse_video(Search);
            if (!VideoID)
                throw DMPErrors.SEARCH_NULL;
            YouTube = new youtubei_1.Client({
                requestOptions: {
                    localAddress: SOptions.localAddress
                }
            });
            let VideoResult = await YouTube.getVideo(VideoID);
            if (!VideoResult)
                throw DMPErrors.SEARCH_NULL;
            let VideoTimecode = this.parse_video_timecode(Search);
            return new Song({
                name: VideoResult.title,
                url: Search,
                duration: this.ms_to_time(((<youtubei_1.Video>VideoResult).duration ?? 0) * 1000),
                author: VideoResult.channel.name,
                isLive: VideoResult.isLiveContent,
                thumbnail: VideoResult.thumbnails.best!,
                seekTime: SOptions.timecode && VideoTimecode ? Number(VideoTimecode) * 1000 : null!,
            }, Queue, SOptions.requestedBy!);
        }
        return null;
    }

    static async best(Search:Song|string, SOptions:PlayOptions = __1.DefaultPlayOptions, Queue:Queue): Promise<Song> {
        let _Song;
        if (Search instanceof Song)
            return Search;
        _Song = await this.link(Search, SOptions, Queue).catch(error => {
            if (!(error instanceof TypeError)) {
                throw DMPErrors.UNKNOWN; //Ignore typeError
            }
        });
        if (!_Song)
            _Song = (await this.search(Search, SOptions, Queue))[0];
        return _Song;
    }
    /**
     * Search for Playlist
     * @param {string} Search
     * @param {PlaylistOptions} SOptions
     * @param {Queue} Queue
     * @return {Promise<Playlist>}
     */
    static async playlist(Search: string, SOptions: PlayOptions = __1.DefaultPlaylistOptions, Queue: Queue): Promise<Playlist> {
        if (<any>Search instanceof Playlist)
            return <Playlist><unknown>Search;
        let Limit = (<any>SOptions).maxSongs ?? -1;
        let SpotifyPlaylistLink = this.regex_list.spotify_playlist.test(Search);
        let YouTubePlaylistLink = this.regex_list.youtube_playlist.test(Search);
        let ApplePlaylistLink = this.regex_list.apple_playlist.test(Search);
        if (ApplePlaylistLink) {
            let AppleResultData = await (0, apple_music_metadata_1.getPlaylist)(Search).catch(() => null);
            if (!AppleResultData)
                throw DMPErrors.INVALID_PLAYLIST;
            let AppleResult = {
                name: AppleResultData.name,
                author: AppleResultData.author,
                url: Search,
                songs: [],
                type: AppleResultData.type
            };
            (<any>AppleResult).songs = (await Promise.all(AppleResultData.tracks.map(async (track, index) => {
                if (Limit !== -1 && index >= Limit)
                    return null;
                const Result = await this.search(`${track.artist} - ${track.title}`, SOptions, Queue).catch(() => null);
                if (Result && Result[0]) {
                    Result[0].data = (<any>SOptions).data;
                    return Result[0];
                }
                else
                    return null;
            })))
                .filter((V) => V !== null);
            if (AppleResult.songs.length === 0)
                throw DMPErrors.INVALID_PLAYLIST;
            if ((<any>SOptions).shuffle)
                (<any>AppleResult).songs = this.shuffle(AppleResult.songs);
            return new Playlist(AppleResult, Queue, SOptions.requestedBy!);
        }
        else if (SpotifyPlaylistLink) {
            let SpotifyResultData = await getData(Search, {}).catch(() => null);
            if (!SpotifyResultData || !['playlist', 'album'].includes(SpotifyResultData.type))
                throw DMPErrors.INVALID_PLAYLIST;
            let SpotifyResult = {
                name: SpotifyResultData.name,
                author: SpotifyResultData.type === 'playlist' ? SpotifyResultData.owner.display_name : SpotifyResultData.artists[0].name,
                url: Search,
                songs: [],
                type: SpotifyResultData.type
            };
            (<any>SpotifyResult).songs = (await Promise.all((SpotifyResultData.tracks?.items ?? []).map(async (track: any, index: number) => {
                if (Limit !== -1 && index >= Limit)
                    return null;
                if (SpotifyResult.type === 'playlist')
                    track = track.track;
                const Result = await this.search(`${track.artists[0].name} - ${track.name}`, SOptions, Queue).catch(() => null);
                if (Result && Result[0]) {
                    Result[0].data = (<any>SOptions).data;
                    return Result[0];
                }
                else
                    return null;
            })))
                .filter((V) => V !== null);
            if (SpotifyResult.songs.length === 0)
                throw DMPErrors.INVALID_PLAYLIST;
            if ((<any>SOptions).shuffle)
                (<any>SpotifyResult).songs = this.shuffle(SpotifyResult.songs);
            return new Playlist(SpotifyResult, Queue, SOptions.requestedBy!);
        }
        else if (YouTubePlaylistLink) {
            let PlaylistID = this.parse_playlist(Search);
            if (!PlaylistID)
                throw DMPErrors.INVALID_PLAYLIST;
            YouTube = new youtubei_1.Client({
                requestOptions: {
                    localAddress: SOptions.localAddress
                }
            });
            let YouTubeResultData = await YouTube.getPlaylist(PlaylistID);
            if (!YouTubeResultData || Object.keys(YouTubeResultData).length === 0)
                throw DMPErrors.INVALID_PLAYLIST;
            let YouTubeResult = {
                name: YouTubeResultData.title,
                author: YouTubeResultData instanceof youtubei_1.Playlist ? YouTubeResultData.channel?.name ?? 'YouTube Mix' : 'YouTube Mix',
                url: Search,
                songs: [],
                type: 'playlist'
            };
            if (YouTubeResultData instanceof youtubei_1.Playlist && YouTubeResultData.videoCount > 100 && (Limit === -1 || Limit > 100))
                await YouTubeResultData.next(Math.floor((Limit === -1 || Limit > YouTubeResultData.videoCount ? YouTubeResultData.videoCount : Limit - 1) / 100));
            (<any>YouTubeResult).songs = YouTubeResultData.videos.map((video, index) => {
                if (Limit !== -1 && index >= Limit)
                    return null;
                let song = new Song({
                    name: video.title,
                    url: `https://youtube.com/watch?v=${video.id}`,
                    duration: this.ms_to_time((video.duration ?? 0) * 1000),
                    author: video.channel?.name!,
                    isLive: video.isLive,
                    thumbnail: video.thumbnails.best!,
                }, Queue, SOptions.requestedBy!);
                song.data = (<any>SOptions).data;
                return song;
            })
                .filter((V) => V !== null);
            if (YouTubeResult.songs.length === 0)
                throw DMPErrors.INVALID_PLAYLIST;
            if ((<any>SOptions).shuffle)
                (<any>YouTubeResult).songs = this.shuffle(YouTubeResult.songs);
            return new Playlist(YouTubeResult, Queue, SOptions.requestedBy);
        }
        throw DMPErrors.INVALID_PLAYLIST;
    }

    static shuffle(array: any[]) {
        if (!Array.isArray(array))
            return [];
        const clone = [...array];
        const shuffled = [];
        while (clone.length > 0)
            shuffled.push(clone.splice(Math.floor(Math.random() * clone.length), 1)[0]);
        return shuffled;
    }

    static ms_to_time(duration: number) {
        const seconds = Math.floor(duration / 1000 % 60);
        const minutes = Math.floor(duration / 60000 % 60);
        const hours = Math.floor(duration / 3600000);
        const secondsPad = `${seconds}`.padStart(2, '0');
        const minutesPad = `${minutes}`.padStart(2, '0');
        const hoursPad = `${hours}`.padStart(2, '0');
        return `${hours ? `${hoursPad}:` : ''}${minutesPad}:${secondsPad}`;
    }

    static time_to_ms(duration: string) {
        return duration.split(':')
            .reduceRight((prev, curr, i, arr) => prev + parseInt(curr) * 60 ** (arr.length - 1 - i), 0) * 1000;
    }
    static is_voice_channel(Channel: discord_js_1.GuildChannel) {
        let type = Channel.type;
        if (typeof type === 'string')
            return ['GUILD_VOICE', 'GUILD_STAGE_VOICE'].includes(type);
        else
            return [discord_js_1.ChannelType.GuildVoice, discord_js_1.ChannelType.GuildStageVoice].includes(type);
    }
    static is_stage_voice_channel(Channel: discord_js_1.GuildChannel) {
        let type = Channel.type;
        if (typeof type === 'string')
            return type === 'GUILD_STAGE_VOICE';
        else
            return type === discord_js_1.ChannelType.GuildStageVoice;
    }
}
exports.Utils = Utils;
Utils.regex_list = {
    youtube_video: /^((?:https?:)\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))((?!channel)(?!user)\/(?:[\w\-]+\?v=|embed\/|v\/)?)((?!channel)(?!user)[\w\-]+)(((.*(\?|\&)t=(\d+))(\D?|\S+?))|\D?|\S+?)$/,
    youtube_video_id: /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,
    youtube_playlist: /^((?:https?:)\/\/)?((?:www|m)\.)?((?:youtube\.com)).*(youtu.be\/|list=)([^#&?]*).*/,
    youtube_playlist_id: /[&?]list=([^&]+)/,
    spotify: /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:track\/|\?uri=spotify:track:)((\w|-)+)(?:(?=\?)(?:[?&]foo=(\d*)(?=[&#]|$)|(?![?&]foo=)[^#])+)?(?=#|$)/,
    spotify_playlist: /https?:\/\/(?:embed\.|open\.)(?:spotify\.com\/)(?:(album|playlist)\/|\?uri=spotify:playlist:)((\w|-)+)(?:(?=\?)(?:[?&]foo=(\d*)(?=[&#]|$)|(?![?&]foo=)[^#])+)?(?=#|$)/,
    apple: /https?:\/\/music\.apple\.com\/.+?\/.+?\/(.+?)\//,
    apple_playlist: /https?:\/\/music\.apple\.com\/.+?\/.+?\/(.+?)\//,
};
