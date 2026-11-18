import { Link } from "react-router"
import Icon from "./Icon"

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-art"><Icon name="box" size={38} /><span>404</span></div>
      <span className="eyebrow">NOTHING TO SEE HERE</span>
      <h1>This page wandered off.</h1>
      <p>The address may be outdated, or you might not have access to this page.</p>
      <Link to="/" className="button button-primary"><Icon name="arrow-left" size={16} /> Back to overview</Link>
    </div>
  )
}
