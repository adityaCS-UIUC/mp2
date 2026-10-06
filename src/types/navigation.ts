import type { MarsRoverPhoto, NasaImageItem } from './nasa'

export type DetailState =
  | { kind: 'library'; items: NasaImageItem[]; index: number }
  | { kind: 'rover'; items: MarsRoverPhoto[]; index: number }
