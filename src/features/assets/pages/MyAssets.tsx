import { useCallback, useEffect, useState } from "react"
import { Link } from "react-router"
import PageHeader from "../../../components/ui/PageHeader"
import Icon from "../../../components/ui/Icon"
import { EmptyState, ErrorState, LoadingState, StatusPill } from "../../../components/ui/WorkspaceUI"
import { useWorkspace } from "../../../hooks/useWorkspace"
import { apiRequest } from "../../../plugins/axios"
import { errorMessage, formatDate, type ApiRecord } from "../../../utils/ui"

interface MyAsset extends ApiRecord {
  asset_tag: string
  name: string
  status: string
  model?: string
  serial_no?: string
  category?: { name: string }
  warranty?: { end_date: string }
}

export default function MyAssets() {
  const { token } = useWorkspace()
  const [assets, setAssets] = useState<MyAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadAssets = useCallback(async () => {
    try {
      setAssets(await apiRequest<MyAsset[]>("/me/assets", { token }))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    let active = true
    apiRequest<MyAsset[]>("/me/assets", { token })
      .then((result) => { if (active) setAssets(result) })
      .catch((requestError: unknown) => { if (active) setError(errorMessage(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [token])

  return (
    <>
      <PageHeader eyebrow="YOUR EQUIPMENT" title="My assigned assets" description="Your work equipment, all in one easy-to-find place." />
      <div className="personal-banner"><span className="personal-banner-icon"><Icon name="shield" size={20} /></span><div><strong>Take care of your equipment</strong><p>If something needs attention, reach out to your IT support team.</p></div><span className="personal-banner-sparkle"><Icon name="sparkles" size={24} /></span></div>
      {error && <ErrorState message={error} onRetry={() => void loadAssets()} />}
      {loading ? <LoadingState label="Finding your assigned equipment..." /> : assets.length ? (
        <div className="my-asset-grid">
          {assets.map((asset) => (
            <article className="my-asset-card" key={asset.id}>
              <div className="my-asset-art"><span className="my-asset-symbol"><Icon name="laptop" size={30} /></span><span className="my-asset-tag">{asset.asset_tag}</span></div>
              <div className="my-asset-content">
                <div className="my-asset-status"><StatusPill value={asset.status} /><span>{asset.category?.name ?? "Company equipment"}</span></div>
                <h2>{asset.name}</h2><p>{asset.model ?? "Model not specified"}</p>
                <div className="my-asset-details"><div><small>SERIAL NUMBER</small><strong>{asset.serial_no || "Not recorded"}</strong></div><div><small>WARRANTY ENDS</small><strong>{asset.warranty?.end_date ? formatDate(asset.warranty.end_date) : "Not listed"}</strong></div></div>
              </div>
            </article>
          ))}
        </div>
      ) : <div className="surface-card"><EmptyState icon="package" title="No assets are assigned to you" description="When your team assigns equipment to your account, it will appear here." /></div>}
      <div className="my-assets-help"><span className="help-shield"><Icon name="shield" size={18} /></span><div><strong>Questions about your equipment?</strong><p>Your IT team can help with repairs, replacements, or returning an item.</p></div><Link to="/notifications">View notifications <Icon name="arrow-right" size={15} /></Link></div>
    </>
  )
}
