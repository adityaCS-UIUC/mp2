import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import cosmicFallbackImage from '../assets/cosmic-hero.png'
import marsFallbackImage from '../assets/mars-surface-fallback.png'
import { mockNasaItems, mockRoverPhotos } from '../assets/mockData'
import { findCachedDetail } from '../services/cache'
import { fetchNasaImageById } from '../services/nasaApi'
import type { MarsRoverPhoto, NasaImageItem } from '../types/nasa'
import type { DetailState } from '../types/navigation'
import styles from './DetailView.module.css'

interface ResolvedDetail {
  state: DetailState
  usedFallback: boolean
}

function isDetailState(value: unknown): value is DetailState {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Partial<DetailState>
  return (candidate.kind === 'library' || candidate.kind === 'rover') &&
    Array.isArray(candidate.items) &&
    candidate.items.length > 0 &&
    typeof candidate.index === 'number'
}

function findItemIndex(state: DetailState, id: string): number {
  return state.kind === 'library'
    ? state.items.findIndex((item) => item.id === id)
    : state.items.findIndex((item) => item.id === id)
}

function highResolutionImage(imageUrl: string, isLibraryImage: boolean): string {
  return isLibraryImage
    ? imageUrl.replace(/~(thumb|small|medium|large)(?=\.)/, '~orig')
    : imageUrl
}

function formatDate(date: string): string {
  if (!date) return 'Not recorded'

  const parsedDate = new Date(date.includes('T') ? date : `${date}T00:00:00`)
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
}

function formatStatus(status?: string): string | undefined {
  if (!status) return undefined
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')
}

function fallbackDetail(id: string): ResolvedDetail | null {
  const libraryIndex = mockNasaItems.findIndex((item) => item.id === id)
  if (libraryIndex >= 0) {
    return {
      state: { kind: 'library', items: mockNasaItems, index: libraryIndex },
      usedFallback: true,
    }
  }

  const roverIndex = mockRoverPhotos.findIndex((item) => item.id === id)
  if (roverIndex >= 0) {
    return {
      state: { kind: 'rover', items: mockRoverPhotos, index: roverIndex },
      usedFallback: true,
    }
  }

  return null
}

function resolveAvailableDetail(value: unknown, id: string): ResolvedDetail | null {
  if (isDetailState(value)) {
    const matchingIndex = findItemIndex(value, id)
    if (matchingIndex >= 0) {
      return {
        state: { ...value, index: matchingIndex } as DetailState,
        usedFallback: false,
      }
    }
  }

  const cachedState = findCachedDetail(id)
  if (cachedState) return { state: cachedState, usedFallback: false }

  return fallbackDetail(id)
}

export default function DetailView() {
  const { id = '' } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [retryKey, setRetryKey] = useState(0)
  const [detailError, setDetailError] = useState('')
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [resolvedDetail, setResolvedDetail] = useState<ResolvedDetail | null>(
    () => resolveAvailableDetail(location.state, id),
  )

  useEffect(() => {
    let isCurrentRequest = true
    const availableDetail = resolveAvailableDetail(location.state, id)

    if (availableDetail) {
      setResolvedDetail(availableDetail)
      setDetailError('')
      setIsLoadingDetail(false)
      return () => {
        isCurrentRequest = false
      }
    }

    setResolvedDetail(null)
    setDetailError('')

    if (/^\d+$/.test(id)) {
      setDetailError('This rover photograph is not available in the current session.')
      setIsLoadingDetail(false)
      return () => {
        isCurrentRequest = false
      }
    }

    setIsLoadingDetail(true)
    void fetchNasaImageById(id).then((item) => {
      if (!isCurrentRequest) return

      if (item) {
        setResolvedDetail({
          state: { kind: 'library', items: [item], index: 0 },
          usedFallback: false,
        })
      } else {
        setDetailError('This NASA archive item could not be retrieved.')
      }
      setIsLoadingDetail(false)
    })

    return () => {
      isCurrentRequest = false
    }
  }, [id, location.state, retryKey])

  if (!resolvedDetail || findItemIndex(resolvedDetail.state, id) < 0) {
    return (
      <main className={styles.main}>
        <div className={styles.topBar}>
          <Link className={styles.backButton} to="/">← Back to Explorer</Link>
        </div>
        <section className={styles.detailStatus} role="status">
          <p className={styles.sectionLabel}>NASA archive</p>
          <h1>{isLoadingDetail ? 'Retrieving this observation' : 'Observation unavailable'}</h1>
          <p>
            {isLoadingDetail
              ? 'The requested record is being recovered from NASA.'
              : detailError || 'The requested record could not be found.'}
          </p>
          {!isLoadingDetail && !/^\d+$/.test(id) && (
            <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
              Try again
            </button>
          )}
        </section>
      </main>
    )
  }

  const { state, usedFallback } = resolvedDetail
  const itemCount = state.items.length
  const currentIndex = state.index
  const previousIndex = (currentIndex - 1 + itemCount) % itemCount
  const nextIndex = (currentIndex + 1) % itemCount

  function navigateToItem(index: number) {
    const targetId = state.items[index].id
    const nextState = { ...state, index } as DetailState
    setResolvedDetail({ state: nextState, usedFallback: false })
    navigate(`/details/${targetId}`, {
      state: nextState,
    })
  }

  const libraryItem = state.kind === 'library'
    ? state.items[currentIndex] as NasaImageItem
    : undefined
  const roverPhoto = state.kind === 'rover'
    ? state.items[currentIndex] as MarsRoverPhoto
    : undefined

  const title = libraryItem?.title ?? `${roverPhoto?.roverName} Rover`
  const imageUrl = highResolutionImage(
    libraryItem?.imageUrl ?? roverPhoto?.imageUrl ?? '',
    Boolean(libraryItem),
  )
  const captureDate = libraryItem?.dateCreated ?? roverPhoto?.earthDate ?? ''
  const detailLabel = libraryItem?.center ?? roverPhoto?.cameraFullName ?? 'NASA'
  const description = libraryItem?.description ??
    `A view of the Martian surface captured by the ${roverPhoto?.cameraFullName} aboard NASA’s ${roverPhoto?.roverName} rover.`
  const keywords = libraryItem?.keywords ?? [
    'Mars',
    roverPhoto?.roverName ?? 'NASA rover',
    roverPhoto?.cameraName ?? 'rover camera',
  ]
  const backPath = state.kind === 'library' ? '/' : '/gallery'
  const collectionName = libraryItem
    ? 'NASA Image and Video Library'
    : 'NASA Mars Rover Photos'
  const mediaType = libraryItem ? 'Astronomical image' : 'Mars surface photograph'
  const context = libraryItem
    ? `This observation is preserved by ${libraryItem.center || 'NASA'} in NASA’s public image archive, where mission teams share the science and stories behind space exploration.`
    : `This image was recorded on Mars by the ${roverPhoto?.cameraFullName} mounted on NASA’s ${roverPhoto?.roverName} rover.`
  const previousItem = state.items[previousIndex]
  const nextItem = state.items[nextIndex]
  const itemTitle = (item: NasaImageItem | MarsRoverPhoto) =>
    item.source === 'library' ? item.title : `${item.roverName} · ${item.cameraName}`

  return (
    <main className={styles.main}>
      <div className={styles.topBar}>
        <Link className={styles.backButton} to={backPath}>
          ← Back to Explorer
        </Link>
        <span className={styles.counter}>
          {currentIndex + 1} of {itemCount}
        </span>
      </div>

      {usedFallback && (
        <p className={styles.fallbackNotice} role="status">
          This item was opened from the included sample archive.
        </p>
      )}

      <article className={styles.detailCard}>
        <div className={styles.imagePanel}>
          <img
            src={imageUrl}
            alt={title}
            onError={(event) => {
              event.currentTarget.onerror = null
              event.currentTarget.src = libraryItem
                ? cosmicFallbackImage
                : marsFallbackImage
            }}
          />

          <div className={styles.imageCaption}>
            <span>{detailLabel}</span>
            <span>{formatDate(captureDate)}</span>
          </div>

          {itemCount > 1 && (
            <>
              <button
                className={`${styles.cycleButton} ${styles.previousButton}`}
                type="button"
                onClick={() => navigateToItem(previousIndex)}
                aria-label="View previous item"
              >
                <span aria-hidden="true">←</span>
                <span>Previous</span>
              </button>

              <button
                className={`${styles.cycleButton} ${styles.nextButton}`}
                type="button"
                onClick={() => navigateToItem(nextIndex)}
                aria-label="View next item"
              >
                <span>Next</span>
                <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </div>

        <div className={styles.contentPanel}>
          <p className={styles.eyebrow}>
            {state.kind === 'library' ? 'NASA IMAGE LIBRARY' : 'MARS ROVER PHOTO'}
          </p>
          <h1>{title}</h1>
          <p className={styles.kicker}>{mediaType}</p>
          <p className={styles.description}>{context}</p>

          <dl className={styles.metadata}>
            <div>
              <dt>Capture date</dt>
              <dd>
                <time dateTime={captureDate}>
                  {formatDate(captureDate)}
                </time>
              </dd>
            </div>
            <div>
              <dt>{state.kind === 'library' ? 'NASA center' : 'Camera'}</dt>
              <dd>{detailLabel}</dd>
            </div>
            <div>
              <dt>Item ID</dt>
              <dd>{libraryItem?.id ?? roverPhoto?.id}</dd>
            </div>
            {roverPhoto && (
              <div>
                <dt>Camera code</dt>
                <dd>{roverPhoto.cameraName}</dd>
              </div>
            )}
          </dl>

        </div>
      </article>

      <section className={styles.detailSections} aria-label="Item information">
        <div className={styles.storyPanel}>
          <p className={styles.sectionLabel}>About this observation</p>
          <h2>The story behind the image</h2>
          <p>{description}</p>

          <section className={styles.keywords} aria-labelledby="keywords-title">
            <h3 id="keywords-title">Topics in this image</h3>
            <ul>
              {keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside className={styles.factsPanel} aria-labelledby="facts-title">
          <p className={styles.sectionLabel}>Archive record</p>
          <h2 id="facts-title">At a glance</h2>
          <dl className={styles.factsList}>
            <div><dt>Collection</dt><dd>{collectionName}</dd></div>
            <div><dt>Media type</dt><dd>{mediaType}</dd></div>
            <div><dt>Captured</dt><dd>{formatDate(captureDate)}</dd></div>
            <div><dt>Catalog ID</dt><dd>{libraryItem?.id ?? roverPhoto?.id}</dd></div>
            {libraryItem?.location && <div><dt>Location</dt><dd>{libraryItem.location}</dd></div>}
            {libraryItem?.photographer && <div><dt>Photographer</dt><dd>{libraryItem.photographer}</dd></div>}
            {libraryItem?.secondaryCreator && <div><dt>Credit</dt><dd>{libraryItem.secondaryCreator}</dd></div>}
            {roverPhoto?.sol !== undefined && <div><dt>Mission sol</dt><dd>{roverPhoto.sol}</dd></div>}
            {roverPhoto?.landingDate && <div><dt>Landing date</dt><dd>{formatDate(roverPhoto.landingDate)}</dd></div>}
            {roverPhoto?.launchDate && <div><dt>Launch date</dt><dd>{formatDate(roverPhoto.launchDate)}</dd></div>}
            {roverPhoto?.roverStatus && <div><dt>Mission status</dt><dd>{formatStatus(roverPhoto.roverStatus)}</dd></div>}
          </dl>
        </aside>
      </section>

      {itemCount > 1 && (
        <nav className={styles.bottomCycler} aria-label="Browse nearby items">
          <button type="button" onClick={() => navigateToItem(previousIndex)}>
            <span aria-hidden="true">←</span>
            <span><small>Previous</small>{itemTitle(previousItem)}</span>
          </button>
          <button type="button" onClick={() => navigateToItem(nextIndex)}>
            <span><small>Next</small>{itemTitle(nextItem)}</span>
            <span aria-hidden="true">→</span>
          </button>
        </nav>
      )}
    </main>
  )
}
