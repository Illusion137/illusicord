import getAudioDurationInSeconds from "get-audio-duration";
import { Track } from "./lib-origin/Illusive/src/types";

function make_media(name: string, duration?: number): Track{
    return {
        uid: name,
        title: name,
        artists: [{name: "Sudo", uri: null}],
        duration: duration ?? 0,
        imported_id: "discord-imported-media"
    }
}
//ls media
//\d{7} (.+?)\n
export const MEDIA = [
    make_media("A Wendy’s Christmas.m4a"),
    make_media("BoutMyMoneyMaster.m4a"),
    make_media("BrolyTiming(otherset).m4a"),
    make_media("CherryBlossom(LD).m4a"),
    make_media("FreddyKreuger(luhrevision).m4a"),
    make_media("FreeCrankyKong.m4a"),
    make_media("FrightNight.m4a"),
    make_media("Fuck SSSniperwolf (Zayboy final verse).m4a"),
    make_media("fucksniperwolf(fnl).m4a"),
    make_media("Gmail Perc.m4a"),
    make_media("Gogeta 2.mp3"),
    make_media("IRLMoneyGlitch.m4a"),
    make_media("IRLMoneyGlitch(Good_).m4a"),
    make_media("It’s A Popeyes Christmas.m4a"),
    make_media("Krampus (Mastered 2).m4a"),
    make_media("Miscellaneous Christmas rap.m4a"),
    make_media("moose-final.m4a"),
    make_media("Naught List (mastered).m4a"),
    make_media("No more.m4a"),
    make_media("No_Liver.m4a"),
    make_media("no_sleep - final.wav"),
    make_media("PinkEye.m4a"),
    make_media("Salsa 2.mp3"),
    make_media("Scarface v2 2.m4a"),
    make_media("Shinythnznjd9uyy8jc9ao482tt8jj9izurb1lqdycw-ma.wav"),
    make_media("skunky_gun - final.wav"),
    make_media("SkunkyGun.m4a"),
    make_media("triple threat done pt1.mp3"),
    make_media("Broly_Timing(feat. Kanesta).m4a"),
    make_media("Clappin-mhuhwihi77quenz48xd7wk84v38ldu4rmb8i1i.m4a"),
    make_media("WhereyaAuntie.m4a"),
    make_media("petethecat.m4a"),
    make_media("LafouandMorty.m4a")
]