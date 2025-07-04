/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-throw-literal */
/* eslint-disable no-restricted-syntax */
import { tmpdir } from 'os';
import { readFile } from 'fs';
import { fromCallback } from 'bluebird';
import { forEachLimit } from 'async';
import { TikTokScraper } from './core';
import {
    TikTokConstructor,
    Options,
    ScrapeType,
    Result,
    UserMetadata,
    HashtagMetadata,
    History,
    HistoryItem,
    MusicMetadata,
} from './types';
import CONST from './constant';
import { makeVerifyFp } from './helpers';

const getInitOptions = () => {
    return {
        number: 30,
        since: 0,
        download: false,
        zip: false,
        asyncDownload: 5,
        asyncScraping: 3,
        proxy: '',
        filepath: '',
        filetype: 'na',
        progress: false,
        event: false,
        by_user_id: false,
        noWaterMark: false,
        hdVideo: false,
        timeout: 0,
        tac: '',
        signature: '',
        verifyFp: makeVerifyFp(),
        headers: {
            'user-agent': CONST.userAgent(),
            referer: 'https://www.tiktok.com/',
        },
    };
};

/**
 * Load proxys from a file
 * @param file
 */
const proxyFromFile = async (file: string) => {
    try {
        const data = (await fromCallback(cb => readFile(file, { encoding: 'utf-8' }, cb))) as string;
        const proxyList = data.split('\n');
        if (!proxyList.length) {
            throw new Error('Proxy file is empty');
        }
        return proxyList;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Unknown error occurred while reading proxy file');
    }
};

/**
 * Load session list from a file
 * @param file
 */
const sessionFromFile = async (file: string) => {
    try {
        const data = (await fromCallback(cb => readFile(file, { encoding: 'utf-8' }, cb))) as string;
        const proxyList = data.split('\n');
        if (!proxyList.length || proxyList[0] === '') {
            throw new Error('Session file is empty');
        }
        return proxyList;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Unknown error occurred while reading session file');
    }
};

const promiseScraper = async (input: string, type: ScrapeType, options = {} as Options): Promise<Result> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }

    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }

    const constructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type, input } };

    const scraper = new TikTokScraper(constructor);

    const result = await scraper.scrape();
    return result;
};

const eventScraper = (input: string, type: ScrapeType, options = {} as Options): TikTokScraper => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type, input, event: true } };
    return new TikTokScraper(contructor);
};

export const hashtag = async (input: string, options?: Options): Promise<Result> => promiseScraper(input, 'hashtag', options);
export const user = async (input: string, options?: Options): Promise<Result> => promiseScraper(input, 'user', options);
export const trend = async (input: string, options?: Options): Promise<Result> => promiseScraper(input, 'trend', options);
export const music = async (input: string, options?: Options): Promise<Result> => promiseScraper(input, 'music', options);

export const hashtagEvent = (input: string, options: Options): TikTokScraper => eventScraper(input, 'hashtag', options);
export const userEvent = (input: string, options: Options): TikTokScraper => eventScraper(input, 'user', options);
export const musicEvent = (input: string, options: Options): TikTokScraper => eventScraper(input, 'music', options);
export const trendEvent = (input: string, options: Options): TikTokScraper => eventScraper(input, 'trend', options);

export const getHashtagInfo = async (input: string, options = {} as Options): Promise<HashtagMetadata> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }
    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'signle_hashtag' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const result = await scraper.getHashtagInfo();
    return result;
};

export const getMusicInfo = async (input: string, options = {} as Options): Promise<MusicMetadata> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }
    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'single_music' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const result = await scraper.getMusicInfo();
    return result;
};

export const getUserProfileInfo = async (input: string, options = {} as Options): Promise<UserMetadata> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'sinsgle_user' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const result = await scraper.getUserProfileInfo();
    return result;
};

export const signUrl = async (input: string, options = {} as Options): Promise<string> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }
    if (options.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'signature' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const result = await scraper.signUrl();
    return result;
};

export const getVideoMeta = async (input: string, options = {} as Options): Promise<Result> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'video_meta' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const videoMeta = await scraper.getVideoMeta();
    return {
        headers: scraper.headers,
        collector: [videoMeta],
    };
};

export const video = async (input: string, options = {} as Options): Promise<Result> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    if (options?.proxyFile) {
        options.proxy = await proxyFromFile(options?.proxyFile);
    }
    if (options?.sessionFile) {
        options.sessionList = await sessionFromFile(options?.sessionFile);
    }
    const contructor: TikTokConstructor = { ...getInitOptions(), ...options, ...{ type: 'video' as ScrapeType, input } };
    const scraper = new TikTokScraper(contructor);

    const videoMeta = await scraper.getVideoMeta();
    return {
        headers: scraper.headers,
        collector: [videoMeta],
    };
};

export const history = async (input: string, options = {} as Options): Promise<HistoryItem> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    const historyPath = options?.historyPath || `${tmpdir()}/tiktok-scraper-history.json`;

    try {
        const data = (await fromCallback(cb => readFile(historyPath, { encoding: 'utf-8' }, cb))) as string;
        const json = JSON.parse(data) as History;
        const historyItem = json.history.find(item => item.id === input);
        if (!historyItem) {
            throw new Error('Item not found in history');
        }
        return historyItem;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Unknown error occurred while reading history file');
    }
};

interface Batcher {
    type: string;
    input: string;
    by_user_id?: boolean;
}

const batchProcessor = (batch: Batcher[], options = {} as Options): Promise<Result[]> => {
    return new Promise((resolve, reject) => {
        const result: Result[] = [];
        forEachLimit(
            batch,
            options?.asyncScraping || 3,
            async (item: Batcher, cb) => {
                try {
                    let data: Result;
                    switch (item.type) {
                        case 'user':
                            data = await user(item.input, { ...options, by_user_id: item.by_user_id });
                            break;
                        case 'hashtag':
                            data = await hashtag(item.input, options);
                            break;
                        case 'music':
                            data = await music(item.input, options);
                            break;
                        case 'video':
                            data = await video(item.input, options);
                            break;
                        default:
                            throw new Error('Type must be user or hashtag');
                    }
                    result.push(data);
                    cb(null);
                } catch (error) {
                    cb(error as Error);
                }
            },
            err => {
                if (err) {
                    reject(err);
                }
                resolve(result);
            },
        );
    });
};

export const fromfile = async (input: string, options = {} as Options): Promise<Result[]> => {
    if (options && typeof options !== 'object') {
        throw new TypeError('Object is expected');
    }

    try {
        const data = (await fromCallback(cb => readFile(input, { encoding: 'utf-8' }, cb))) as string;
        const batch = data.split('\n').map(line => {
            const [type, value, by_user_id] = line.split(':');
            return {
                type,
                input: value,
                by_user_id: by_user_id === 'true',
            };
        });

        if (!batch.length) {
            throw new Error('Input file is empty');
        }

        const result = await batchProcessor(batch, options);
        return result;
    } catch (error: unknown) {
        if (error instanceof Error) {
            throw new Error(error.message);
        }
        throw new Error('Unknown error occurred while reading input file');
    }
};
