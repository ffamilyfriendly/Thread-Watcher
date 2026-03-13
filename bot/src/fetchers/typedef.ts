import { Result } from 'neverthrow';

export type Fetcher<TOut, TIn> = (data: TIn) => Promise<Result<TOut, Error>>;
