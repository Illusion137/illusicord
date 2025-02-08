import 'dotenv/config';

export const dotenv = <{
    APPLICATION_ID: string,
    PUBLIC_KEY: string,
    CLIENT_ID: string,
    CLIENT_SECRET: string,
    TOKEN: string,
    SOUNDCLOUD_COOKIES: string
    YOUTUBE_COOKIES: string
}> process.env;

export const invite_link = `https://discord.com/api/oauth2/authorize?client_id=${dotenv.CLIENT_ID}&permissions=8&scope=bot%20applications.commands` as const;