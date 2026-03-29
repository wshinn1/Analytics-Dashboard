'use client'

import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import { useState, useCallback } from 'react'
import type { MapRef } from 'react-map-gl/mapbox'
import { Card, Title } from '@tremor/react'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapLocation {
  lat: number
  lng: number
  city: string
  country: string
  views: number
}

interface VisitorMapProps {
  locations: MapLocation[]
  isLoading?: boolean
}

interface PopupInfo {
  location: MapLocation
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export function VisitorMap({ locations, isLoading }: VisitorMapProps) {
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null)

  const onMapLoad = useCallback((e: { target: MapRef }) => {
    const map = e.target
    // Paint all water layers blue
    const waterLayers = ['water', 'water-shadow', 'waterway', 'waterway-label']
    waterLayers.forEach((id) => {
      if (map.getLayer(id)) {
        const type = map.getLayer(id)?.type
        if (type === 'fill') map.setPaintProperty(id, 'fill-color', '#a8d5f5')
        if (type === 'line') map.setPaintProperty(id, 'line-color', '#60a5fa')
      }
    })
  }, [])

  const maxViews = Math.max(...locations.map((l) => l.views), 1)

  const getMarkerSize = (views: number) => {
    const ratio = views / maxViews
    return Math.max(8, Math.min(28, 8 + ratio * 20))
  }

  const getMarkerOpacity = (views: number) => {
    const ratio = views / maxViews
    return Math.max(0.5, ratio)
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <Title>Visitor Map</Title>
        <div className="mt-4 flex h-96 items-center justify-center rounded-lg bg-muted/30">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </Card>
    )
  }

  if (!MAPBOX_TOKEN) {
    return (
      <Card className="p-6">
        <Title>Visitor Map</Title>
        <div className="mt-4 flex h-96 items-center justify-center rounded-lg bg-muted/30">
          <span className="text-muted-foreground">NEXT_PUBLIC_MAPBOX_TOKEN not configured</span>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <Title>Visitor Map</Title>
      <div className="mt-4 overflow-hidden rounded-lg" style={{ height: '400px' }}>
        <Map
          initialViewState={{ longitude: 0, latitude: 20, zoom: 1.2 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="mapbox://styles/mapbox/light-v11"
          mapboxAccessToken={MAPBOX_TOKEN}
          onLoad={onMapLoad}
        >
          <NavigationControl position="top-right" />

          {locations.map((location, i) => {
            const size = getMarkerSize(location.views)
            const opacity = getMarkerOpacity(location.views)
            return (
              <Marker
                key={i}
                longitude={location.lng}
                latitude={location.lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()
                  setPopupInfo({ location })
                }}
              >
                <div
                  style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    backgroundColor: '#6366f1',
                    opacity: Math.max(0.7, opacity),
                    border: '2px solid #fff',
                    cursor: 'pointer',
                    boxShadow: '0 0 0 2px rgba(99,102,241,0.4), 0 2px 6px rgba(0,0,0,0.3)',
                  }}
                />
              </Marker>
            )
          })}

          {popupInfo && (
            <Popup
              longitude={popupInfo.location.lng}
              latitude={popupInfo.location.lat}
              anchor="bottom"
              onClose={() => setPopupInfo(null)}
              closeOnClick={false}
            >
              <div className="p-1 text-sm">
                <div className="font-semibold">{popupInfo.location.city}</div>
                <div className="text-muted-foreground">{popupInfo.location.country}</div>
                <div className="mt-1 font-medium text-indigo-600">
                  {popupInfo.location.views.toLocaleString()} views
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>
    </Card>
  )
}
