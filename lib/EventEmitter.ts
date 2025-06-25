import { EventEmitter } from 'expo';

type BookEventsMap = {
    booksUpdated: () => void;
};

export const bookEventEmitter = new EventEmitter<BookEventsMap>();
