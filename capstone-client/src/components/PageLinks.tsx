import { Link } from 'react-router-dom'

interface PageLinkItem {
  to: string
  label: string
}

interface PageLinksProps {
  links: PageLinkItem[]
  className?: string
}

const PageLinks = ({ links, className = 'claims-back-link' }: PageLinksProps) => {
  return (
    <p className={className}>
      {links.map((link, index) => (
        <span key={link.to}>
          {index > 0 ? ' · ' : ''}
          <Link to={link.to}>{link.label}</Link>
        </span>
      ))}
    </p>
  )
}

export default PageLinks
