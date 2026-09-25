import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '../ui/controls'
import { buttonClass } from '../ui/classes'

export function NotFound({ title = 'Lost in the fog', body = 'Nothing lives at this address.' }: { title?: string; body?: string }) {
  return (
    <div className="page" style={{ paddingTop: 80 }}>
      <EmptyState icon={<Compass />} title={title} body={body}>
        <Link to="/" className={buttonClass('primary')}>
          Back to your worlds
        </Link>
      </EmptyState>
    </div>
  )
}
