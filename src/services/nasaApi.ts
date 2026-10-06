import axios from 'axios'
import { mockNasaItems, mockRoverPhotos } from '../assets/mockData'
import type { MarsRoverPhoto, NasaImageItem, RoverName } from '../types/nasa'
import {
  cacheCollection,
  clearCachedCollection,
  getCachedCollection,
} from './cache'

interface RawNasaData {
  nasa_id: string
  title: string
  description?: string
  description_508?: string
  date_created?: string
  center?: string
  keywords?: string[]
  location?: string
  photographer?: string
  secondary_creator?: string
}

interface RawNasaItem {
  data?: RawNasaData[]
  links?: Array<{ href: string; render?: string }>
}

interface RawNasaSearchResponse {
  collection: { items: RawNasaItem[] }
}

interface RawRoverPhoto {
  id: number
  sol?: number
  camera: { name: string; full_name: string }
  img_src: string
  earth_date: string
  rover: {
    name: string
    status?: string
    launch_date?: string
    landing_date?: string
  }
}

interface RawMarsResponse {
  latest_photos: RawRoverPhoto[]
}

const REQUEST_TIMEOUT_MS = 10_000

export interface NasaResponse<T> {
  data: T
  source: 'network' | 'cache' | 'fallback'
}

interface RequestOptions {
  forceRefresh?: boolean
}

const imageLibraryClient = axios.create({
  baseURL: 'https://images-api.nasa.gov',
  timeout: REQUEST_TIMEOUT_MS,
})

const marsClient = axios.create({
  baseURL: 'https://api.nasa.gov/mars-photos/api/v1',
  timeout: REQUEST_TIMEOUT_MS,
})

const pendingLibraryRequests = new Map<
  string,
  Promise<NasaResponse<NasaImageItem[]>>
>()
const pendingItemRequests = new Map<string, Promise<NasaImageItem | null>>()
const pendingRoverRequests = new Map<
  string,
  Promise<NasaResponse<MarsRoverPhoto[]>>
>()

function cleanContent(content: string): string {
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[—–]/g, ', ')
    .replace(/;/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
}

function reportFallback(endpoint: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    const reason = error.response?.status === 429
      ? 'NASA rate limit reached (HTTP 429)'
      : error.response
        ? `HTTP ${error.response.status}`
        : error.code ?? 'network unavailable'

    console.warn(`${endpoint}: ${reason}. Using local fallback data.`)
    return
  }

  console.warn(`${endpoint}: unexpected error. Using local fallback data.`, error)
}

function toNasaImageItem(item: RawNasaItem): NasaImageItem | null {
  const metadata = item.data?.[0]
  const image = item.links?.find((link) => link.render === 'image') ?? item.links?.[0]

  if (!metadata?.nasa_id || !metadata.title || !image?.href) return null

  return {
    id: metadata.nasa_id,
    title: cleanContent(metadata.title),
    description: cleanContent(
      metadata.description ?? metadata.description_508 ?? 'No description available.',
    ),
    dateCreated: metadata.date_created ?? '',
    center: cleanContent(metadata.center ?? 'NASA'),
    imageUrl: image.href,
    keywords: metadata.keywords?.map(cleanContent) ?? [],
    location: metadata.location ? cleanContent(metadata.location) : undefined,
    photographer: metadata.photographer ? cleanContent(metadata.photographer) : undefined,
    secondaryCreator: metadata.secondary_creator
      ? cleanContent(metadata.secondary_creator)
      : undefined,
    source: 'library',
  }
}

function toMarsRoverPhoto(photo: RawRoverPhoto): MarsRoverPhoto {
  return {
    id: String(photo.id),
    roverName: photo.rover.name,
    cameraName: photo.camera.name,
    cameraFullName: photo.camera.full_name,
    earthDate: photo.earth_date,
    imageUrl: photo.img_src.replace(/^http:/, 'https:'),
    sol: photo.sol,
    roverStatus: photo.rover.status,
    launchDate: photo.rover.launch_date,
    landingDate: photo.rover.landing_date,
    source: 'rover',
  }
}

/** Search NASA's image library and return normalized application models. */
export async function searchNasaImages(
  query: string,
  options: RequestOptions = {},
): Promise<NasaResponse<NasaImageItem[]>> {
  const normalizedQuery = query.trim()
  if (!normalizedQuery) return { data: [], source: 'network' }

  const cacheScope = `library:${normalizedQuery.toLowerCase()}`
  if (options.forceRefresh) clearCachedCollection(cacheScope)

  const cachedImages = getCachedCollection<NasaImageItem>(cacheScope)
  if (cachedImages) return { data: cachedImages, source: 'cache' }

  const pendingRequest = pendingLibraryRequests.get(cacheScope)
  if (pendingRequest && !options.forceRefresh) return pendingRequest

  const request = (async (): Promise<NasaResponse<NasaImageItem[]>> => {
    try {
      const { data } = await imageLibraryClient.get<RawNasaSearchResponse>('/search', {
        params: { q: normalizedQuery, media_type: 'image' },
      })

      const images = data.collection.items
        .map(toNasaImageItem)
        .filter((item): item is NasaImageItem => item !== null)

      if (images.length === 0) return { data: mockNasaItems, source: 'fallback' }

      cacheCollection(cacheScope, 'library', images)
      return { data: images, source: 'network' }
    } catch (error: unknown) {
      reportFallback('NASA image search', error)
      return { data: mockNasaItems, source: 'fallback' }
    }
  })()

  pendingLibraryRequests.set(cacheScope, request)
  try {
    return await request
  } finally {
    if (pendingLibraryRequests.get(cacheScope) === request) {
      pendingLibraryRequests.delete(cacheScope)
    }
  }
}

/** Retrieve one library image so a shared or refreshed detail URL remains useful. */
export async function fetchNasaImageById(id: string): Promise<NasaImageItem | null> {
  const cacheScope = `library-item:${id}`
  const cachedImages = getCachedCollection<NasaImageItem>(cacheScope)
  if (cachedImages?.[0]) return cachedImages[0]

  const pendingRequest = pendingItemRequests.get(cacheScope)
  if (pendingRequest) return pendingRequest

  const request = (async (): Promise<NasaImageItem | null> => {
    try {
      const { data } = await imageLibraryClient.get<RawNasaSearchResponse>('/search', {
        params: { nasa_id: id, media_type: 'image' },
      })
      const image = data.collection.items
        .map(toNasaImageItem)
        .find((item): item is NasaImageItem => item !== null && item.id === id)

      if (!image) return null

      cacheCollection(cacheScope, 'library', [image])
      return image
    } catch (error: unknown) {
      reportFallback(`NASA image ${id}`, error)
      return null
    }
  })()

  pendingItemRequests.set(cacheScope, request)
  try {
    return await request
  } finally {
    if (pendingItemRequests.get(cacheScope) === request) {
      pendingItemRequests.delete(cacheScope)
    }
  }
}

/** Fetch the latest rover images and return normalized application models. */
export async function fetchLatestRoverPhotos(
  rover: RoverName = 'curiosity',
  options: RequestOptions = {},
): Promise<NasaResponse<MarsRoverPhoto[]>> {
  const cacheScope = `rover:${rover}`
  if (options.forceRefresh) clearCachedCollection(cacheScope)

  const cachedPhotos = getCachedCollection<MarsRoverPhoto>(cacheScope)
  if (cachedPhotos) return { data: cachedPhotos, source: 'cache' }

  const pendingRequest = pendingRoverRequests.get(cacheScope)
  if (pendingRequest && !options.forceRefresh) return pendingRequest

  const request = (async (): Promise<NasaResponse<MarsRoverPhoto[]>> => {
    try {
      const { data } = await marsClient.get<RawMarsResponse>(
        `/rovers/${rover}/latest_photos`,
        { params: { api_key: import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY' } },
      )

      const photos = data.latest_photos.map(toMarsRoverPhoto)
      if (photos.length === 0) {
        return { data: roverFallback(rover), source: 'fallback' }
      }

      cacheCollection(cacheScope, 'rover', photos)
      return { data: photos, source: 'network' }
    } catch (error: unknown) {
      reportFallback(`Mars rover photos for ${rover}`, error)
      return { data: roverFallback(rover), source: 'fallback' }
    }
  })()

  pendingRoverRequests.set(cacheScope, request)
  try {
    return await request
  } finally {
    if (pendingRoverRequests.get(cacheScope) === request) {
      pendingRoverRequests.delete(cacheScope)
    }
  }
}

function roverFallback(rover: RoverName): MarsRoverPhoto[] {
  const matchingPhotos = mockRoverPhotos.filter(
    (photo) => photo.roverName.toLowerCase() === rover,
  )
  return matchingPhotos.length > 0 ? matchingPhotos : mockRoverPhotos
}
