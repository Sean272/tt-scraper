import { ScrapeType } from '.';

export interface HistoryItem {
    id: string;
    type: ScrapeType;
    input: string;
    downloaded_posts: number;
    last_change: Date;
    file_location: string;
}

export interface History {
    [key: string]: HistoryItem;
}
