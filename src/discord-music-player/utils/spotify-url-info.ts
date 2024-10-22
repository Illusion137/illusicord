'use strict'

const spotifyURI = require('spotify-uri')
const { parse } = require('himalaya')

const TYPE = {
    ALBUM: 'album',
    ARTIST: 'artist',
    EPISODE: 'episode',
    PLAYLIST: 'playlist',
    TRACK: 'track'
}

const ERROR = {
    REPORT:
        'Please report the problem at https://github.com/microlinkhq/spotify-url-info/issues.',
    NOT_DATA: "Couldn't find any data in embed page that we know how to parse.",
    NOT_SCRIPTS: "Couldn't find scripts to get the data."
}

const SUPPORTED_TYPES = Object.values(TYPE)

export const throwError = (message: string, html: string) => {
    const error: any = new TypeError(`${message}\n${ERROR.REPORT}`)
    error.html = html
    throw error
}

export const parseData = (html: string) => {
    const embed = parse(html)

    let scripts = embed.find((el: HTMLElement) => el.tagName === 'html')
    if (scripts === undefined) return throwError(ERROR.NOT_SCRIPTS, html)

    scripts = scripts.children
        .find((el: HTMLElement) => el.tagName === 'body')
        .children.filter(({ tagName }: any) => tagName === 'script')

    let script = scripts.find((script: any) =>
        script.attributes.some(({ value }: any) => value === 'resource')
    )

    if (script !== undefined) {
        return normalizeData({
            data: JSON.parse(Buffer.from(script.children[0].content, 'base64').toString())
        })
    }

    script = scripts.find((script: any) =>
        script.attributes.some(({ value }: any) => value === 'initial-state')
    )

    if (script !== undefined) {
        const data = JSON.parse(Buffer.from(script.children[0].content, 'base64').toString())
            .data.entity
        return normalizeData({ data })
    }

    script = scripts.find((script: any) =>
        script.attributes.some(({ value }: any) => value === '__NEXT_DATA__')
    )

    if (script !== undefined) {
        const string = Buffer.from(script.children[0].content).toString()
        const data = JSON.parse(string).props.pageProps.state?.data.entity
        if (data !== undefined) return normalizeData({ data })
    }

    return throwError(ERROR.NOT_DATA, html)
}

const createGetData = (fetch: any) => async (url: string, opts: object) => {
    const parsedUrl = getParsedUrl(url)
    const embedURL = spotifyURI.formatEmbedURL(parsedUrl)
    const response = await fetch(embedURL, opts)
    const text = await response.text()
    return parseData(text)
}

function getParsedUrl(url: string) {
    try {
        const parsedURL = spotifyURI.parse(url)
        if (!parsedURL.type) throw new TypeError()
        return spotifyURI.formatEmbedURL(parsedURL)
    } catch (_) {
        throw new TypeError(`Couldn't parse '${url}' as valid URL`)
    }
}

const getImages = (data: any) => data.coverArt?.sources || data.images

const getDate = (data: any) => data.releaseDate?.isoString || data.release_date

const getLink = (data: any) => spotifyURI.formatOpenURL(data.uri)

function getArtistTrack(track: any) {
    return track.show
        ? track.show.publisher
        : []
            .concat(track.artists)
            .filter(Boolean)
            .map((a: any) => a.name)
            .reduce(
                (acc, name, index, array) =>
                    index === 0
                        ? name
                        : acc + (array.length - 1 === index ? ' & ' : ', ') + name,
                ''
            )
}

const getTracks = (data: any) =>
    data.trackList ? data.trackList.map(toTrack) : [toTrack(data)]

function getPreview(data: any) {
    const [track] = getTracks(data)
    const date = getDate(data)

    return {
        date: date ? new Date(date).toISOString() : date,
        title: data.name,
        type: data.type,
        track: track.name,
        description: data.description || data.subtitle || track.description,
        artist: track.artist,
        image: getImages(data).reduce((a: any, b: any) => (a.width > b.width ? a : b)).url,
        audio: track.previewUrl,
        link: getLink(data),
        embed: `https://embed.spotify.com/?uri=${data.uri}`
    }
}

const toTrack = (track: any) => ({
    artist: getArtistTrack(track) || track.subtitle,
    duration: track.duration,
    name: track.title,
    previewUrl: track.isPlayable ? track.audioPreview.url : undefined,
    uri: track.uri
})

const normalizeData = ({ data }: any) => {
    if (!data || !data.type || !data.name) {
        throw new Error("Data doesn't seem to be of the right shape to parse")
    }

    if (!SUPPORTED_TYPES.includes(data.type)) {
        throw new Error(
            `Not an ${SUPPORTED_TYPES.join(', ')}. Only these types can be parsed`
        )
    }

    data.type = data.uri.split(':')[1]

    return data
}

export default (fetch: any) => {
    const getData = createGetData(fetch)
    return {
        getLink,
        getData,
        getPreview: (url: string, opts: object) => getData(url, opts).then(getPreview),
        getTracks: (url: string, opts: object) => getData(url, opts).then(getTracks),
        getDetails: (url: string, opts: object) =>
            getData(url, opts).then(data => ({
                preview: getPreview(data),
                tracks: getTracks(data)
            }))
    }
}