import * as L from 'leaflet'
import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import type { MapMarker, RoutePath } from '../../types/domain'

type OperationsMapProps = {
  markers?: MapMarker[]
  routes?: RoutePath[]
  ariaLabel: string
}

const mapCenter: L.LatLngExpression = [14.9722, -89.5306]

export function OperationsMap({ markers = [], routes = [], ariaLabel }: OperationsMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!mapElementRef.current) {
      return
    }

    const map = L.map(mapElementRef.current, {
      center: mapCenter,
      zoom: 14,
      scrollWheelZoom: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map)

    const routeLayers = routes.map((route) =>
      L.polyline(route.points, {
        color: route.color,
        weight: 5,
        opacity: 0.78,
      }).addTo(map).bindPopup(route.name),
    )

    const markerLayers = markers.map((marker) =>
      L.marker(marker.position).addTo(map).bindPopup(`${marker.label} - ${marker.status}`),
    )

    const layers = [...routeLayers, ...markerLayers]

    if (layers.length > 0) {
      const bounds = L.featureGroup(layers).getBounds()
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 })
    }

    return () => {
      map.remove()
    }
  }, [markers, routes])

  return <div className="operations-map" ref={mapElementRef} aria-label={ariaLabel} />
}
