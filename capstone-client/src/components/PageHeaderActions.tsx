import type { PropsWithChildren } from 'react'

interface PageHeaderActionsProps extends PropsWithChildren {
  className?: string
}

const PageHeaderActions = ({ children, className }: PageHeaderActionsProps) => {
  const mergedClassName = className ? `page-header-actions ${className}` : 'page-header-actions'

  return <div className={mergedClassName}>{children}</div>
}

export default PageHeaderActions
