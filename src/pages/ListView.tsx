import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImage from '../assets/cosmic-hero.png'
import { searchNasaImages } from '../services/nasaApi'
import type {
  NasaImageItem,
  SortOrder,
  SortProperty,
} from '../types/nasa'
import type { DetailState } from '../types/navigation'
import styles from './ListView.module.css'

const DEFAULT_QUERY = 'nebula'

export default function ListView() {
  const [items, setItems] = useState<NasaImageItem[]>([])
  const [filterText, setFilterText] = useState('')
  const [sortProperty, setSortProperty] = useState<SortProperty>('title')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [usingFallback, setUsingFallback] = useState(false)

  const loadImages = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await searchNasaImages(DEFAULT_QUERY, { forceRefresh })
      setItems(result.data)
      setUsingFallback(result.source === 'fallback')
    } catch {
      setErrorMessage('Space media could not be loaded. Please try again later.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadImages()
  }, [loadImages])

  const visibleItems = useMemo(() => {
    const normalizedFilter = filterText.trim().toLowerCase()

    return items
      .filter((item) => {
        if (!normalizedFilter) return true

        return item.title.toLowerCase().includes(normalizedFilter) ||
          item.description.toLowerCase().includes(normalizedFilter)
      })
      .sort((firstItem, secondItem) => {
        const comparison = sortProperty === 'title'
          ? firstItem.title.localeCompare(secondItem.title)
          : new Date(firstItem.dateCreated).getTime() -
            new Date(secondItem.dateCreated).getTime()

        return sortOrder === 'asc' ? comparison : -comparison
      })
  }, [filterText, items, sortOrder, sortProperty])

  function toggleSortOrder() {
    setSortOrder((currentOrder) => currentOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <main className={styles.main}>
      <header className={styles.hero}>
        <img className={styles.heroImage} src={heroImage} alt="" />
        <div className={styles.heroOverlay} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>NASA IMAGE &amp; VIDEO LIBRARY</p>
          <h1>Search the universe.</h1>
          <p className={styles.heroDescription}>
            Journey through real NASA imagery, from distant nebulae and newborn
            stars to the landscapes of Mars.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryAction} href="#library-results">
              Explore the archive <span aria-hidden="true">↓</span>
            </a>
            <Link className={styles.secondaryAction} to="/gallery">
              Visit Mars gallery <span aria-hidden="true">→</span>
            </Link>
          </div>
          <dl className={styles.heroStats}>
            <div><dt>Collection</dt><dd>NASA imagery</dd></div>
            <div><dt>Focus</dt><dd>Deep space</dd></div>
            <div><dt>Experience</dt><dd>Interactive</dd></div>
          </dl>
        </div>
      </header>

      <section className={styles.controls} aria-label="Search and sorting controls">
        <label className={styles.searchLabel} htmlFor="library-filter">
          <span>Search this collection</span>
          <input
            id="library-filter"
            type="search"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder="Filter by title or description"
          />
        </label>

        <label className={styles.sortLabel} htmlFor="sort-property">
          <span>Sort by</span>
          <select
            id="sort-property"
            value={sortProperty}
            onChange={(event) => setSortProperty(event.target.value as SortProperty)}
          >
            <option value="title">Title</option>
            <option value="date">Date Created</option>
          </select>
        </label>

        <button
          className={styles.orderButton}
          type="button"
          onClick={toggleSortOrder}
          aria-label={`Change to ${sortOrder === 'asc' ? 'descending' : 'ascending'} order`}
        >
          <span aria-hidden="true">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        </button>
      </section>

      <div className={styles.resultsHeader} id="library-results" aria-live="polite">
        <h2>Library results</h2>
        <span>
          {isLoading ? 'Loading…' : `${visibleItems.length} ${visibleItems.length === 1 ? 'item' : 'items'}`}
        </span>
      </div>

      {usingFallback && !isLoading && (
        <div className={styles.dataNotice} role="status">
          <span>NASA is currently unavailable. Sample archive records are being shown.</span>
          <button type="button" onClick={() => void loadImages(true)}>
            Retry live data
          </button>
        </div>
      )}

      {errorMessage && <p className={styles.message}>{errorMessage}</p>}

      {!isLoading && !errorMessage && visibleItems.length === 0 && (
        <p className={styles.message}>
          No images match “{filterText}”. Try a broader search.
        </p>
      )}

      {isLoading ? (
        <div className={styles.loadingGrid} aria-label="Loading NASA images">
          {[0, 1, 2].map((placeholder) => (
            <div className={styles.loadingCard} key={placeholder} />
          ))}
        </div>
      ) : (
        <section className={styles.list} aria-label="NASA image search results">
          {visibleItems.map((item, index) => {
            const detailState: DetailState = {
              kind: 'library',
              items: visibleItems,
              index,
            }

            return (
              <Link
                className={styles.card}
                to={`/details/${item.id}`}
                state={detailState}
                key={item.id}
              >
                <img
                  className={styles.thumbnail}
                  src={item.imageUrl}
                  alt={`NASA archive view: ${item.title}`}
                  onError={(event) => {
                    event.currentTarget.onerror = null
                    event.currentTarget.src = heroImage
                  }}
                />
                <div className={styles.cardContent}>
                  <div className={styles.metadata}>
                    <span>{item.center}</span>
                    <time dateTime={item.dateCreated}>
                      {new Date(item.dateCreated).toLocaleDateString()}
                    </time>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <span className={styles.detailsLink}>
                    View Details <span aria-hidden="true">→</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </section>
      )}
    </main>
  )
}
