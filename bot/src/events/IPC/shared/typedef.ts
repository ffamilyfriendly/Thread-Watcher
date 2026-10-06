import { Result } from 'neverthrow';

export type FetcherPusherType<TOut, TIn> = (data: TIn) => Promise<Result<TOut, Error>>;
