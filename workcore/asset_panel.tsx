import React, { useEffect, useState } from "react"

interface AssetOverviewPanelProps {
  assetId: string
}

interface AssetOverview {
  name: string
  priceUsd: number
  supply: number
  holders: number
  volume24hUsd?: number
  marketCapUsd?: number
}

export const AssetOverviewPanel: React.FC<AssetOverviewPanelProps> = ({ assetId }) => {
  const [info, setInfo] = useState<AssetOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInfo() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/assets/${assetId}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch asset: ${res.status}`)
        }
        const json = (await res.json()) as AssetOverview
        setInfo(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [assetId])

  if (loading) return <div className="p-4">Loading asset overview...</div>
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>
  if (!info) return <div className="p-4">No data available</div>

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-semibold mb-2">Asset Overview</h2>
      <dl className="space-y-1">
        <div>
          <dt className="font-medium">ID:</dt>
          <dd className="ml-2 text-gray-700">{assetId}</dd>
        </div>
        <div>
          <dt className="font-medium">Name:</dt>
          <dd className="ml-2 text-gray-700">{info.name}</dd>
        </div>
        <div>
          <dt className="font-medium">Price (USD):</dt>
          <dd className="ml-2 text-gray-700">${info.priceUsd.toFixed(2)}</dd>
        </div>
        <div>
          <dt className="font-medium">Circulating Supply:</dt>
          <dd className="ml-2 text-gray-700">{info.supply.toLocaleString()}</dd>
        </div>
        <div>
          <dt className="font-medium">Holders:</dt>
          <dd className="ml-2 text-gray-700">{info.holders.toLocaleString()}</dd>
        </div>
        {info.volume24hUsd !== undefined && (
          <div>
            <dt className="font-medium">24h Volume (USD):</dt>
            <dd className="ml-2 text-gray-700">${info.volume24hUsd.toLocaleString()}</dd>
          </div>
        )}
        {info.marketCapUsd !== undefined && (
          <div>
            <dt className="font-medium">Market Cap (USD):</dt>
            <dd className="ml-2 text-gray-700">${info.marketCapUsd.toLocaleString()}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}

export default AssetOverviewPanel
