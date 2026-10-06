import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import fallbackImage from '../assets/mars-surface-fallback.png'
import { fetchLatestRoverPhotos } from '../services/nasaApi'
import type { MarsRoverPhoto, RoverName } from '../types/nasa'
import type { DetailState } from '../types/navigation'
import styles from './GalleryView.module.css'

interface FilterOption<T extends string> {
  label: string
  value: T
}

type CameraFilter = 'all' | 'NAVCAM' | 'MAST' | 'FHAZ' | 'RHAZ' | 'CHEMCAM'

const roverOptions: FilterOption<RoverName>[] = [
  { label: 'Curiosity', value: 'curiosity' },
  { label: 'Perseverance', value: 'perseverance' },
  { label: 'Opportunity', value: 'opportunity' },
  { label: 'Spirit', value: 'spirit' },
]

const cameraOptions: FilterOption<CameraFilter>[] = [
  { label: 'All cameras', value: 'all' },
  { label: 'Navigation Camera', value: 'NAVCAM' },
  { label: 'Mast Camera', value: 'MAST' },
  { label: 'Front Hazard Camera', value: 'FHAZ' },
  { label: 'Rear Hazard Camera', value: 'RHAZ' },
  { label: 'Chemistry Camera', value: 'CHEMCAM' },
]

function matchesCamera(photo: MarsRoverPhoto, camera: CameraFilter): boolean {
  if (camera === 'all') return true

  const cameraName = photo.cameraName.toUpperCase()
  return cameraName === camera || cameraName.startsWith(`${camera}_`)
}

export default function GalleryView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [photos, setPhotos] = useState<MarsRoverPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)
  const requestId = useRef(0)

  const roverParameter = searchParams.get('rover')
  const cameraParameter = searchParams.get('camera')
  const selectedRover: RoverName = roverOptions.some(
    (option) => option.value === roverParameter,
  ) ? roverParameter as RoverName : 'curiosity'
  const selectedCamera: CameraFilter = cameraOptions.some(
    (option) => option.value === cameraParameter,
  ) ? cameraParameter as CameraFilter : 'all'

  const updateFilter = useCallback((key: 'rover' | 'camera', value: string) => {
    const nextParameters = new URLSearchParams(searchParams)
    nextParameters.set(key, value)
    setSearchParams(nextParameters, { replace: true })
  }, [searchParams, setSearchParams])

  const updateRover = useCallback((value: string) => {
    const nextParameters = new URLSearchParams(searchParams)
    nextParameters.set('rover', value)
    nextParameters.delete('camera')
    setSearchParams(nextParameters, { replace: true })
  }, [searchParams, setSearchParams])

  const loadPhotos = useCallback(async (forceRefresh = false) => {
    const currentRequest = requestId.current + 1
    requestId.current = currentRequest
    setIsLoading(true)
    setErrorMessage('')
    setPhotos([])
    setUsingFallback(false)

    try {
      const result = await fetchLatestRoverPhotos(selectedRover, { forceRefresh })
      if (requestId.current !== currentRequest) return

      setPhotos(result.data)
      setUsingFallback(result.source === 'fallback')
    } catch {
      if (requestId.current !== currentRequest) return

      setPhotos([])
      setErrorMessage('Mars photos could not be loaded. Please try again later.')
    } finally {
      if (requestId.current === currentRequest) setIsLoading(false)
    }
  }, [selectedRover])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  const roverPhotos = useMemo(() => {
    return photos.filter(
      (photo) => photo.roverName.toLowerCase() === selectedRover,
    )
  }, [photos, selectedRover])

  const visiblePhotos = useMemo(() => {
    return roverPhotos.filter((photo) => matchesCamera(photo, selectedCamera))
  }, [roverPhotos, selectedCamera])

  const availableCameraOptions = useMemo(() => {
    return cameraOptions.filter((option) => {
      return option.value === 'all' || photos.some(
        (photo) => matchesCamera(photo, option.value),
      )
    })
  }, [photos])

  useEffect(() => {
    if (isLoading || selectedCamera === 'all') return

    const cameraIsAvailable = availableCameraOptions.some(
      (option) => option.value === selectedCamera,
    )
    if (!cameraIsAvailable) updateFilter('camera', 'all')
  }, [availableCameraOptions, isLoading, selectedCamera, updateFilter])

  const activeRoverLabel = roverOptions.find(
    (option) => option.value === selectedRover,
  )?.label

  const activeCameraLabel = cameraOptions.find(
    (option) => option.value === selectedCamera,
  )?.label

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>LIVE FROM THE RED PLANET</p>
          <h1>Mars Gallery</h1>
          <p>
            Explore rover-camera views from NASA missions on the Martian surface.
          </p>
        </div>

        <div className={styles.filters} aria-label="Mars photo filters">
          <label htmlFor="rover-filter">
            <span>Rover</span>
            <select
              id="rover-filter"
              value={selectedRover}
              onChange={(event) => updateRover(event.target.value)}
            >
              {roverOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label htmlFor="camera-filter">
            <span>Camera type</span>
            <select
              id="camera-filter"
              value={selectedCamera}
              onChange={(event) => updateFilter('camera', event.target.value)}
            >
              {availableCameraOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className={styles.resultsHeader} aria-live="polite">
        <div>
          <h2>{activeRoverLabel} photographs</h2>
          <p>{activeCameraLabel}</p>
        </div>
        {!isLoading && (
          <div className={styles.resultsSummary}>
            {usingFallback && <span className={styles.archiveBadge}>Curated archive</span>}
            <span>{visiblePhotos.length} {visiblePhotos.length === 1 ? 'photo' : 'photos'}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          <p>Receiving images from Mars…</p>
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className={styles.emptyState} role="alert">
          <h2>Connection interrupted</h2>
          <p>{errorMessage}</p>
          <button type="button" onClick={() => void loadPhotos(true)}>
            Try again
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && visiblePhotos.length === 0 && (
        <div className={styles.emptyState}>
          <h2>No matching photographs</h2>
          <p>
            {selectedCamera === 'all'
              ? `No recent photos are available for ${activeRoverLabel}. Try another rover.`
              : `No ${activeCameraLabel?.toLowerCase()} photos are available for ${activeRoverLabel}. Try another camera or rover.`}
          </p>
          {selectedCamera !== 'all' && (
            <button type="button" onClick={() => updateFilter('camera', 'all')}>
              Show all cameras
            </button>
          )}
        </div>
      )}

      {!isLoading && !errorMessage && visiblePhotos.length > 0 && (
        <section className={styles.grid} aria-label={`${activeRoverLabel} rover photos`}>
          {visiblePhotos.map((photo) => {
            const detailState: DetailState = {
              kind: 'rover',
              items: roverPhotos,
              index: roverPhotos.findIndex((candidate) => candidate.id === photo.id),
            }

            return (
              <Link
                className={styles.card}
                to={`/details/${photo.id}`}
                state={detailState}
                key={photo.id}
              >
                <img
                  src={photo.imageUrl}
                  alt={`Mars photographed by ${photo.cameraFullName}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = fallbackImage
                  }}
                />
                <div className={styles.gradient} aria-hidden="true" />
                <div className={styles.badges}>
                  <span className={styles.roverBadge}>{photo.roverName}</span>
                  <span className={styles.cameraBadge}>{photo.cameraName}</span>
                </div>
                <div className={styles.cardContent}>
                  <h3>{photo.cameraFullName}</h3>
                  <time dateTime={photo.earthDate}>
                    Captured {new Date(`${photo.earthDate}T00:00:00`).toLocaleDateString()}
                  </time>
                  <span className={styles.viewPrompt}>View details →</span>
                </div>
              </Link>
            )
          })}
        </section>
      )}
    </main>
  )
}
