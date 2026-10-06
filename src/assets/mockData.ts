import type { MarsRoverPhoto, NasaImageItem } from '../types/nasa'
import marsSurfaceFallback from './mars-surface-fallback.png'

export const mockNasaItems: NasaImageItem[] = [
  {
    id: 'PIA12348',
    title: 'The Pillars of Creation',
    description: 'Towering columns of gas and dust in the Eagle Nebula, seen by NASA space telescopes.',
    dateCreated: '2015-01-05T00:00:00Z',
    center: 'STScI',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA12348/PIA12348~medium.jpg',
    keywords: ['Hubble', 'nebula', 'stars'],
    source: 'library',
  },
  {
    id: 'PIA19324',
    title: 'Blue Marble',
    description: 'Earth photographed as a bright blue world suspended in the darkness of space.',
    dateCreated: '2015-02-11T00:00:00Z',
    center: 'JPL',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA19324/PIA19324~medium.jpg',
    keywords: ['Earth', 'planet', 'space'],
    source: 'library',
  },
  {
    id: 'GSFC_20171208_Archive_e001861',
    title: 'Hubble Sees a Cosmic Caterpillar',
    description: 'A light-year-long knot of gas and dust is being sculpted by radiation from nearby stars.',
    dateCreated: '2013-08-29T00:00:00Z',
    center: 'GSFC',
    imageUrl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001861/GSFC_20171208_Archive_e001861~medium.jpg',
    keywords: ['Hubble', 'Carina', 'star formation'],
    source: 'library',
  },
]

export const mockRoverPhotos: MarsRoverPhoto[] = [
  {
    id: '102693',
    roverName: 'Curiosity',
    cameraName: 'FHAZ',
    cameraFullName: 'Front Hazard Avoidance Camera',
    earthDate: '2015-05-30',
    imageUrl: 'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/fcam/FLB_486265257EDR_F0481570FHAZ00323M_.JPG',
    source: 'rover',
  },
  {
    id: '102694',
    roverName: 'Curiosity',
    cameraName: 'RHAZ',
    cameraFullName: 'Rear Hazard Avoidance Camera',
    earthDate: '2015-05-30',
    imageUrl: 'https://mars.nasa.gov/msl-raw-images/proj/msl/redops/ods/surface/sol/01000/opgs/edr/rcam/RLB_486265291EDR_F0481570RHAZ00323M_.JPG',
    source: 'rover',
  },
  {
    id: '110703',
    roverName: 'Perseverance',
    cameraName: 'NAVCAM_LEFT',
    cameraFullName: 'Navigation Camera - Left',
    earthDate: '2021-02-24',
    imageUrl: 'https://mars.nasa.gov/mars2020-raw-images/pub/ods/surface/sol/00003/ids/edr/browse/ncam/NLE_0003_0667215828_358ECM_N0010052AUT_04096_00_2I3J01_1200.jpg',
    source: 'rover',
  },
  {
    id: '210704',
    roverName: 'Opportunity',
    cameraName: 'NAVCAM',
    cameraFullName: 'Navigation Camera',
    earthDate: '2018-06-10',
    imageUrl: marsSurfaceFallback,
    source: 'rover',
  },
  {
    id: '210705',
    roverName: 'Spirit',
    cameraName: 'NAVCAM',
    cameraFullName: 'Navigation Camera',
    earthDate: '2010-03-21',
    imageUrl: marsSurfaceFallback,
    source: 'rover',
  },
]
