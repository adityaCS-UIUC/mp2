/** A normalized image from the NASA Image and Video Library. */
export interface NasaImageItem {
  id: string
  title: string
  description: string
  dateCreated: string
  center: string
  imageUrl: string
  keywords: string[]
  location?: string
  photographer?: string
  secondaryCreator?: string
  source: 'library'
}

/** A normalized photo returned by a NASA Mars rover. */
export interface MarsRoverPhoto {
  id: string
  roverName: string
  cameraName: string
  cameraFullName: string
  earthDate: string
  imageUrl: string
  sol?: number
  roverStatus?: string
  launchDate?: string
  landingDate?: string
  source: 'rover'
}

export type UnifiedSpaceItem = NasaImageItem | MarsRoverPhoto
export type SortProperty = 'title' | 'date'
export type SortOrder = 'asc' | 'desc'
export type RoverName = 'curiosity' | 'perseverance' | 'opportunity' | 'spirit'
